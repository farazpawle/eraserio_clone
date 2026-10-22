import { safeNextPath } from "@/lib/auth/routes";
import LoginForm from "./LoginForm";

export const metadata = { title: "Log in" };

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  return <LoginForm next={safeNextPath(searchParams.next)} callbackError={searchParams.error} />;
}
