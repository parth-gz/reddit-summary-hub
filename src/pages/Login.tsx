import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";
import myImage from '../images/reddit-logo.jpg';

const Login = () => {
  const handleRedditLogin = () => {
    // Redirect to backend OAuth endpoint
    window.location.href = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/login/`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-card hover:shadow-card-hover transition-all duration-300">
        <CardHeader className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
            <img 
              src={myImage} 
              alt="reddit logo"  
            />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Reddit Summarize Hub</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Get AI-powered summaries of your favorite subreddits
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button 
            onClick={handleRedditLogin}
            className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
            size="lg"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Login with Reddit
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            We'll redirect you to Reddit for secure authentication
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;