"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import GoogleButton from "../_components/GoogleButton";

const MIN_PASSWORD = 8;

export default function SignupForm({ next }: { next: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() || undefined },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Same message whether or not the address already has an account (no account probing).
    setSentTo(email.trim());
  };

  if (sentTo) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Check your email</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          We sent a confirmation link to <span className="font-medium text-gray-900 dark:text-gray-100">{sentTo}</span>.
          Open it to finish signing up.
        </p>
        <Link href="/login" className="inline-block text-sm text-teal-600 dark:text-teal-400 hover:underline">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create your account</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Start drawing with your team.</p>
      </div>

      <GoogleButton next={next} />

      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" /> or <span className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">At least {MIN_PASSWORD} characters.</p>
        </div>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
          {busy ? "Creating account…" : "Sign up"}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Already have an account?{" "}
        <Link href="/login" className="text-teal-600 dark:text-teal-400 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
