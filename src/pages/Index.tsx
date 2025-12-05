import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const user = localStorage.getItem("prime_user");

    // 👉 If already on /landing -> DO NOTHING
    if (location.pathname === "/landing") return;

    // 👉 If logged in and on /, go to rooms
    if (user && location.pathname === "/") {
      navigate("/rooms");
      return;
    }

    // 👉 If not logged in and on /, go to landing
    if (!user && location.pathname === "/") {
      navigate("/landing");
      return;
    }
  }, [navigate, location]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-lg">Loading...</p>
      </div>
    </div>
  );
};

export default Index;
