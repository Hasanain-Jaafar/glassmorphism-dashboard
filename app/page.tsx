import { redirect } from "next/navigation";

export default function RootPage() {
  // Middleware redirects unauthenticated visitors to /sign-in; if we get
  // here, we're already signed in.
  redirect("/dashboard");
}
