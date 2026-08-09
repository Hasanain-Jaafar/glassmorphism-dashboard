import type { Metadata } from "next";
import { AuthGate } from "@/components/auth/auth-gate";

export const metadata: Metadata = {
  title: "Sign in — Sales Dashboard",
};

export default function SignInPage() {
  return <AuthGate />;
}
