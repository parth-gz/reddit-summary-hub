import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const SubredditSelection = () => {
  const [subreddits, setSubreddits] = useState<string[]>(['']);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const addSubredditInput = () => {
    setSubreddits([...subreddits, '']);
  };

  const removeSubredditInput = (index: number) => {
    if (subreddits.length > 1) {
      setSubreddits(subreddits.filter((_, i) => i !== index));
    }
  };

  const updateSubreddit = (index: number, value: string) => {
    const updated = [...subreddits];
    updated[index] = value.replace(/^r\//, ''); // Remove r/ prefix if user adds it
    setSubreddits(updated);
  };

  const handleFetchSummaries = async () => {
    const validSubreddits = subreddits.filter(sub => sub.trim() !== '');
    
    if (validSubreddits.length === 0) {
      toast({
        title: "No subreddits selected",
        description: "Please enter at least one subreddit name.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/summaries/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ subreddits: validSubreddits })
      });

      if (response.ok) {
        toast({
          title: "Summaries fetched!",
          description: "Redirecting to dashboard..."
        });
        navigate('/dashboard');
      } else {
        throw new Error('Failed to fetch summaries');
      }
    } catch (error) {
      toast({
        title: "Error fetching summaries",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Select Subreddits</h1>
          <p className="text-muted-foreground">Choose which subreddits you'd like to summarize</p>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Subreddit Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subreddits.map((subreddit, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label htmlFor={`subreddit-${index}`}>
                    Subreddit {index + 1}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                      r/
                    </span>
                    <Input
                      id={`subreddit-${index}`}
                      value={subreddit}
                      onChange={(e) => updateSubreddit(index, e.target.value)}
                      placeholder="AskReddit"
                      className="pl-8"
                    />
                  </div>
                </div>
                {subreddits.length > 1 && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeSubredditInput(index)}
                    className="mb-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={addSubredditInput}
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Subreddit
              </Button>
            </div>

            <Button
              onClick={handleFetchSummaries}
              disabled={isLoading}
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
              size="lg"
            >
              {isLoading ? (
                "Fetching Summaries..."
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  Fetch Summaries
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubredditSelection;