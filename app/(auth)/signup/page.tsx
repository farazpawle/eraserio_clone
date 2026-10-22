import { safeNextPath } from "@/lib/auth/routes";
import SignupForm from "./SignupForm";

export const metadata = { title: "Sign up" };

export default function SignupPage({ searchParams }: { searchParams: { next?: string } }) {
  return <SignupForm next={safeNextPath(searchParams.next)} />;
}
