"use client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

// ponytail: name/avatar come from the sign-up metadata (same source the profiles trigger copies);
// read public.profiles here once users can edit their profile.
function toAppUser(user: User): AppUser {
  const meta = user.user_metadata ?? {};
  const email = user.email ?? "";
  return {
    id: user.id,
    email,
    name: meta.full_name || meta.name || email.split("@")[0],
    avatarUrl: meta.avatar_url || meta.picture || null,
  };
}

// Current signed-in user for Client Components. Display only — access control is RLS's job.
export function useUser() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data } = createClient().auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? toAppUser(session.user) : null);
      setIsLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return { user, isLoading };
}
