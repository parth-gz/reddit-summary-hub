# app.py (fixed)
import os
import json
import secrets
from typing import List, Dict, Any
from collections import defaultdict

import requests
import praw
from dotenv import load_dotenv
from flask import Flask, redirect, request, session, jsonify
from flask_cors import CORS

load_dotenv()

# Configurable frontend url (where we send users after OAuth)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:8080").rstrip("/")

app = Flask(__name__)
# Allow only the frontend origin for API calls (keeps cookies working)
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": FRONTEND_URL}})

app.secret_key = os.getenv("FLASK_SECRET", secrets.token_urlsafe(32))

# Reddit / Gemini env
CLIENT_ID = os.getenv("REDDIT_CLIENT_ID")
CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET")
REDIRECT_URI = os.getenv("REDDIT_REDIRECT_URI", "http://localhost:5000/api/callback/")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# Use a stable model id (adjust if you prefer another)
GEMINI_URL = os.getenv(
    "GEMINI_URL",
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent",
)

# Warn if important env missing
missing = [k for k, v in {
    "REDDIT_CLIENT_ID": CLIENT_ID,
    "REDDIT_CLIENT_SECRET": CLIENT_SECRET,
    "GEMINI_API_KEY": GEMINI_API_KEY,
}.items() if not v]
if missing:
    app.logger.warning(f"Missing env vars: {', '.join(missing)}")


def get_reddit(refresh_token: str | None = None) -> praw.Reddit:
    kwargs = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "redirect_uri": REDIRECT_URI,
        "user_agent": "reddit_summarize_hub",
    }
    if refresh_token:
        kwargs["refresh_token"] = refresh_token
    return praw.Reddit(**kwargs)


@app.route("/api/login/")
def login():
    reddit = get_reddit()
    state = secrets.token_urlsafe(16)
    session["oauth_state"] = state
    scopes = ["identity", "read"]
    # use keyword args to avoid PRAW deprecation warning
    auth_url = reddit.auth.url(scopes=scopes, state=state, duration="permanent")
    return redirect(auth_url)


@app.route("/api/callback/")
def callback():
    """
    Reddit sends the user here after consent. We exchange code -> refresh_token,
    store it in server-side session and redirect user to the frontend selection page.
    """
    reddit = get_reddit()
    error = request.args.get("error")
    if error:
        return jsonify({"error": error}), 400

    state = request.args.get("state")
    if not state or state != session.get("oauth_state"):
        return jsonify({"error": "invalid_state"}), 400

    code = request.args.get("code")
    if not code:
        return jsonify({"error": "missing_code"}), 400

    try:
        # returns refresh token when duration="permanent"
        refresh_token = reddit.auth.authorize(code)
        session["refresh_token"] = refresh_token
        session.pop("oauth_state", None)
        # send user to frontend subreddit selection (configurable via FRONTEND_URL)
        return redirect(f"{FRONTEND_URL}/select")
    except Exception as e:
        app.logger.exception("Failed to authorize reddit code")
        return jsonify({"error": "authorization_failed", "detail": str(e)}), 500


@app.route("/api/me/")
def me():
    rt = session.get("refresh_token")
    if not rt:
        return jsonify({"authenticated": False}), 200
    try:
        reddit = get_reddit(rt)
        me = reddit.user.me()
        return jsonify({"authenticated": True, "name": getattr(me, "name", None)}), 200
    except Exception as e:
        app.logger.exception("Error fetching reddit me")
        return jsonify({"authenticated": False, "error": str(e)}), 500


@app.route("/api/logout/", methods=["POST"])
def logout():
    session.pop("refresh_token", None)
    session.pop("last_subs", None)
    session.pop("summaries", None)
    return jsonify({"ok": True}), 200


def call_gemini(prompt: str) -> str:
    headers = {"Content-Type": "application/json"}
    params = {}

    if GEMINI_API_KEY and GEMINI_API_KEY.strip().lower().startswith("bearer "):
        headers["Authorization"] = GEMINI_API_KEY.strip()
    elif GEMINI_API_KEY:
        params["key"] = GEMINI_API_KEY

    body = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}]
            }
        ]
    }

    try:
        resp = requests.post(GEMINI_URL, headers=headers, params=params, json=body, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        # defensive extraction
        candidates = data.get("candidates") or data.get("output") or []
        if candidates and isinstance(candidates, list):
            # try multiple shapes
            first = candidates[0]
            content = first.get("content") if isinstance(first, dict) else None
            if content and isinstance(content, dict):
                parts = content.get("parts", [])
                if parts:
                    return parts[0].get("text", "").strip()
            # some responses embed text differently
            if "text" in first:
                return first["text"].strip()
        return json.dumps(data)[:1000]
    except Exception as e:
        app.logger.exception("Gemini call failed")
        return f"[error summarizing: {str(e)}]"


@app.route("/api/summaries/", methods=["POST", "GET"])
def summaries():
    """
    POST: Accepts JSON { subreddits: [...], limit: N } -> fetch & summarize -> stores summaries in session
    GET: Returns stored summaries if available (so Dashboard can do a GET on load)
    """
    if "refresh_token" not in session:
        return jsonify({"error": "Not authenticated"}), 401

    reddit = get_reddit(session.get("refresh_token"))

    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        subs = payload.get("subreddits", [])
        if isinstance(subs, str):
            subs = [subs]
        subs = [s.strip() for s in subs if s and s.strip()]
        session["last_subs"] = subs
        limit = int(payload.get("limit", 5))
    else:  # GET
        subs = session.get("last_subs", []) or []
        # allow override via query param ?limit=5
        try:
            limit = int(request.args.get("limit", 5))
        except Exception:
            limit = 5

    if not subs:
        return jsonify({"error": "No subreddits provided"}), 400

    if limit <= 0 or limit > 25:
        limit = 5

    grouped = []
    for sub in subs:
        try:
            subreddit = reddit.subreddit(sub)
            posts_iter = subreddit.top(time_filter="day", limit=limit)
        except Exception as e:
            grouped.append({"subreddit": sub, "posts": [], "error": str(e)})
            continue

        posts_list = []
        for post in posts_iter:
            title = getattr(post, "title", "") or ""
            selftext = getattr(post, "selftext", "") or ""
            url = getattr(post, "url", "") or (f"https://reddit.com{getattr(post, 'permalink','')}" )
            author = getattr(post, "author", "")
            score = getattr(post, "score", 0)
            comments = getattr(post, "num_comments", 0)

            # --- NEW: collect body or fallback to top comments ---
            content = ""
            if selftext.strip():
                content = (selftext[:3000] + "...") if len(selftext) > 3000 else selftext
            else:
                # load top comments if no body
                try:
                    post.comments.replace_more(limit=0)
                    top_comments = [c.body for c in post.comments[:3] if hasattr(c, "body")]
                    if top_comments:
                        content = "Top comments:\n" + "\n\n".join(top_comments)
                except Exception as e:
                    app.logger.warning(f"Could not fetch comments for post {post.id}: {e}")
                    content = ""  # fallback

            # --- build prompt with whatever context is available ---
            prompt = f"Summarize this Reddit post in 2-4 concise sentences.\nTitle: {title}\n\nBody/Comments: {content}"

            summary = call_gemini(prompt)

            posts_list.append({
                "id": getattr(post, "id", ""),
                "title": title,
                "summary": summary,
                "score": score,
                "comments": comments,
                "url": url,
                "author": str(author) if author else "unknown",
                "subreddit": sub,
            })


        grouped.append({"subreddit": sub, "posts": posts_list})

    # cache results in session so Dashboard GET can return them
    session["summaries"] = grouped
    return jsonify(grouped), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=os.getenv("FLASK_DEBUG", "true").lower() == "true")
