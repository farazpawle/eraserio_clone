"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { acceptInvitation } from "@/lib/data/invitations";
import { useUser } from "@/hooks/useUser";

// Middleware sends signed-out visitors to /login and back here afterwards.
// Joining is a button, not automatic, so link previews can't accept for you.
const InvitePage = ({ params }: { params: { token: string } }) => {
  const router = useRouter();
  const db = useMemo(() => createClient(), []);
  const { user } = useUser();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    setIsJoining(true);
    setError(null);
    try {
      await acceptInvitation(db, params.token);
      toast.success("You joined the team");
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept the invitation");
      setIsJoining(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">You&apos;ve been invited to a team</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          The invitation must match the email you are signed in with{user ? ` (${user.email})` : ""}.
        </p>
        {error && (
          <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20 text-left">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
          </Alert>
        )}
        <div className="flex gap-2 justify-center">
          <Button onClick={join} disabled={isJoining}>
            {isJoining ? "Joining..." : "Join team"}
          </Button>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Go to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InvitePage;
