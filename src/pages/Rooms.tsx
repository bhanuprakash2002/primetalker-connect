import { useState } from "react";
import { Button } from "@/components/ui/button";




import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Globe, Video, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { createRoom, joinRoom } from "@/lib/utils";



const Rooms = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [roomId, setRoomId] = useState("");
  const [language, setLanguage] = useState("en");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // ==========================================================
  // CREATE ROOM (BACKEND)
  // ==========================================================
  const handleCreateRoom = async () => {
    if (!language) {
      toast({
        title: "Language Required",
        description: "Please select your language before creating a room.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const result = await createRoom(language);

      const newRoomId = result.roomId;
      if (!newRoomId) throw new Error("Invalid response from server.");

      // Save meeting info locally
      localStorage.setItem("myLanguage", language);
      localStorage.setItem("role", "caller");

      toast({
        title: "Room Created!",
        description: `Room ID: ${newRoomId}`,
      });

      navigate(`/meeting/${newRoomId}`);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // ==========================================================
  // JOIN ROOM (BACKEND)
  // ==========================================================
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roomId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid room ID",
        variant: "destructive",
      });
      return;
    }

    if (!language) {
      toast({
        title: "Language Required",
        description: "Please select your language before joining.",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);

    try {
      const result = await joinRoom(roomId.trim(), language);

      if (!result.success) {
        throw new Error(result.message || "Failed to join room");
      }

      localStorage.setItem("myLanguage", language);
      localStorage.setItem("role", "receiver");

      toast({
        title: "Joined Room!",
        description: `Connected to room ${roomId}`,
      });

      navigate(`/meeting/${roomId.trim()}`);
    } catch (err: any) {
      toast({
        title: "Error Joining Room",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("prime_user");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      {/* Header */}
     <header className="border-b border-border bg-background/80 backdrop-blur-sm">
  <div className="container mx-auto px-4 py-4 flex items-center justify-between">

    {/* LEFT SIDE — ONLY LOGO */}
 <div className="flex items-center gap-3 cursor-pointer"
     onClick={() => navigate("/landing")}
>
  <img src="/logo.png" className="w-40 h-auto" />
</div>






    {/* RIGHT SIDE — SIGN OUT */}
    <Button variant="ghost" onClick={handleSignOut}>
      <LogOut className="w-4 h-4 mr-2" />
      Sign Out
    </Button>

  </div>
</header>



      {/* Main */}
      <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
        <div className="max-w-4xl w-full grid md:grid-cols-2 gap-6">

          {/* Create Room */}
          <Card className="shadow-primary border-2 hover:border-primary/50 transition-all">
            <CardHeader className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-primary flex items-center justify-center">
                <Video className="w-10 h-10 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Create Room</CardTitle>
              <CardDescription>
                Start a new meeting room that supports real-time translation
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Your Language</Label>
                <select
                  className="w-full bg-background border p-2 rounded-md"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="te">Telugu</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="ja">Japanese</option>
                  <option value="zh">Chinese</option>
                </select>
              </div>

              <Button
                className="w-full shadow-primary"
                size="lg"
                onClick={handleCreateRoom}
                disabled={isCreating}
              >
                {isCreating ? "Creating..." : "Create New Room"}
              </Button>
            </CardContent>
          </Card>

          {/* Join Room */}
          <Card className="shadow-primary border-2 hover:border-primary/50 transition-all">
            <CardHeader className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-primary flex items-center justify-center">
                <Globe className="w-10 h-10 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Join Room</CardTitle>
              <CardDescription>
                Enter a room ID & your language to join an existing meeting
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roomId">Room ID</Label>
                  <Input
                    id="roomId"
                    type="text"
                    placeholder="ROOM1234"
                    value={roomId}
                    onChange={(e) =>
                      setRoomId(e.target.value)
                    }
                    className="text-center text-lg font-mono"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Your Language</Label>
                  <select
                    className="w-full bg-background border p-2 rounded-md"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="te">Telugu</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="ja">Japanese</option>
                    <option value="zh">Chinese</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  variant="secondary"
                  className="w-full"
                  size="lg"
                  disabled={isJoining}
                >
                  {isJoining ? "Joining..." : "Join Room"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Rooms;
