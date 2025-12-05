import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  // =====================================================
  // 🔐 AUTH HANDLER
  // =====================================================
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ------------------------------------------
      // SIGN UP
      // ------------------------------------------
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${import.meta.env.VITE_SITE_URL}/`,
          },
        });

        if (error) throw error;

        toast({
          title: "Account Created",
          description: "Please check your inbox to confirm your email.",
        });
        return;
      }

      // ------------------------------------------
      // SIGN IN
      // ------------------------------------------
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Save session to localStorage for Index.tsx
     localStorage.setItem("prime_user", JSON.stringify(data.user));
localStorage.setItem("username", data.user.user_metadata?.full_name || data.user.email.split("@")[0]);


      toast({
        title: "Success",
        description: "Logged in successfully!",
      });

      navigate("/rooms");
    } catch (error: any) {
      toast({
        title: "Authentication Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================
  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-primary">
        <CardHeader className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-primary flex items-center justify-center">
            <Globe className="w-10 h-10 text-primary-foreground" />
          </div>

          <CardTitle className="text-3xl font-bold">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </CardTitle>

          <CardDescription>
            {isSignUp
              ? "Start breaking language barriers today"
              : "Sign in to continue to your meetings"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full shadow-primary"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : isSignUp
                ? "Sign Up"
                : "Sign In"}
            </Button>
          </form>

          {/* Switch Auth Mode */}
          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-muted-foreground hover:text-foreground"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
