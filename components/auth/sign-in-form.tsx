"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/client";
import { useMounted } from "@/lib/use-mounted";

type Mode = "sign-in" | "sign-up" | "recovery";

export function SignInForm() {
  const router = useRouter();
  const mounted = useMounted();
  const deactivated =
    mounted && new URLSearchParams(window.location.search).get("deactivated") === "1";
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("recovery");
        setError(null);
        setNotice(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignIn(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function handleSignUp(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    setNotice("Account created. Check your email to confirm, then sign in.");
    setMode("sign-in");
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Enter your email above first");
      return;
    }
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/sign-in` }
    );
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setNotice("Password reset email sent — check your inbox.");
  }

  async function handleSetNewPassword(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative flex min-h-screen items-center justify-center px-4 py-16"
    >
      <div className="absolute right-5 top-5 sm:right-8 sm:top-8">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-glass ring-1 ring-glass-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" className="size-6" />
          </div>
          <h1 className="mt-4 text-[26px] font-semibold tracking-tight text-foreground">
            {mode === "sign-up"
              ? "Create your account"
              : mode === "recovery"
                ? "Set a new password"
                : "Welcome back"}
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            {mode === "sign-up"
              ? "Join your team's Sales Dashboard"
              : mode === "recovery"
                ? "Choose a new password for your account"
                : "Sign in to your Sales Dashboard account"}
          </p>
        </div>

        {mode === "recovery" ? (
          <form
            onSubmit={handleSetNewPassword}
            className="glass-panel rounded-2xl p-8 shadow-lg sm:p-9"
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11"
                />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" className="h-12 w-full" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                Set new password
              </Button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={mode === "sign-up" ? handleSignUp : handleSignIn}
            className="glass-panel rounded-2xl p-8 shadow-lg sm:p-9"
          >
            <div className="space-y-6">
              {deactivated && mode === "sign-in" && (
                <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                  This account has been deactivated. Contact your
                  administrator.
                </p>
              )}

              {mode === "sign-up" && (
                <div className="space-y-2">
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input
                    id="full-name"
                    autoComplete="name"
                    placeholder="Anna Svensson"
                    required
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="h-11"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "sign-in" && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs font-medium text-primary hover:text-primary-hover"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete={
                    mode === "sign-in" ? "current-password" : "new-password"
                  }
                  placeholder="••••••••"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11"
                />
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}
              {notice && <p className="text-sm text-success">{notice}</p>}

              <Button type="submit" className="h-12 w-full" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                {mode === "sign-up" ? "Create account" : "Sign in"}
              </Button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-text-tertiary">
          {mode === "recovery" ? (
            "You'll be signed in once your password is updated."
          ) : mode === "sign-up" ? (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("sign-in");
                  setError(null);
                  setNotice(null);
                }}
                className="font-medium text-primary hover:text-primary-hover"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              Access is managed by your administrator, or{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("sign-up");
                  setError(null);
                  setNotice(null);
                }}
                className="font-medium text-primary hover:text-primary-hover"
              >
                create an account
              </button>
              .
            </>
          )}
        </p>
      </div>
    </motion.div>
  );
}
