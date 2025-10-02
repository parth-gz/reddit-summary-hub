# Reddit Summary Hub

## Project info

This is a reddit digest where you can select subreddits and summarize top 5 posts on the sub. The top posts are fetched using PRAW and summary is generated using google gemini.

### if you are a developer looking to run this code locally:

Follow these steps to set up the project locally:

1. create a ```.env``` file in the /backend folder.
2. visit reddit's developer portal and create a new project to get your own client ID and secret key.
3. visit google's AI studio (https://aistudio.google.com) and create your API key.
4. set environment variables in the .env file you just created as follows:

```sh
REDDIT_CLIENT_ID = your_client_id
REDDIT_CLIENT_SECRET = your_client_secret
REDDIT_REDIRECT_URI = http://localhost:5000/api/callback
GEMINI_API_KEY = your_gemini_api_key
FLASK_SECRET = redditsummaryhubsecret
```

5. clone the repo using:
```sh 
git clone https://www.github.com/parth-gz/reddit-summary-hub
```
6. Run frontend and backend servers. you need to have npm, Python and Flask installed on your computer. Run these commands on terminals:
```sh
#Terminal 1
cd reddit-summary-hub

npm i 

npm run dev

#Terminal 2
python backend/app.py
```


