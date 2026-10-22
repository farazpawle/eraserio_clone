"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Check your email</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          If an account exists for that address, a link to set a new password is on its way.
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
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Forgot your password?</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">We&apos;ll email you a link to set a new one.</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
          {busy ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="text-center text-sm">
        <Link href="/login" className="text-teal-600 dark:text-teal-400 hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
