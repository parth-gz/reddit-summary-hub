import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, MessageSquare, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Post {
  id: string;
  title: string;
  summary: string;
  score: number;
  comments: number;
  url: string;
  author: string;
  subreddit: string;
}

interface SubredditData {
  subreddit: string;
  posts: Post[];
}

const Dashboard = () => {
  const [summaryData, setSummaryData] = useState<SubredditData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchSummaries();
  }, []);

  const fetchSummaries = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/summaries/`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSummaryData(data);
      } else {
        throw new Error("Failed to fetch summaries");
      }
    } catch (error) {
      toast({
        title: "Error loading summaries",
        description: "Unable to load your summaries. Please try again.",
        variant: "destructive",
      });
      setSummaryData([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <Card className="p-8">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Loading your summaries...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Reddit Summaries</h1>
            <p className="text-muted-foreground">
              AI-powered summaries of your selected subreddits
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/select")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Selection
          </Button>
        </div>

        {summaryData.length === 0 ? (
          <Card className="text-center p-8">
            <CardContent>
              <p className="text-muted-foreground mb-4">No summaries available</p>
              <Button onClick={() => navigate("/select")}>Select Subreddits</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {summaryData.map((subredditData) => (
              <div key={subredditData.subreddit}>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-primary" />
                  r/{subredditData.subreddit}
                </h2>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {subredditData.posts.map((post) => (
                    <Card
                      key={post.id}
                      className="shadow-card hover:shadow-card-hover transition-all duration-300 group"
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                          {post.title}
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {post.score.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {post.comments.toLocaleString()}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {post.summary}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-xs text-muted-foreground">
                            by u/{post.author}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(post.url, "_blank")}
                            className="text-primary hover:text-primary/80"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View Post
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
