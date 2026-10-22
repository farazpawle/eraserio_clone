"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const { error } = await createClient().auth.signOut();
  if (error) console.error("[auth] sign-out failed:", error.message);
  redirect("/login");
}
