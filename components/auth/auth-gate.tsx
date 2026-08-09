"use client";

import { useState } from "react";
import { AmbientBackground } from "@/components/dashboard/ambient-background";
import { SplashVideo } from "@/components/auth/splash-video";
import { SignInForm } from "@/components/auth/sign-in-form";

export function AuthGate() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      <AmbientBackground />
      <SignInForm />
      {showSplash && <SplashVideo onDone={() => setShowSplash(false)} />}
    </>
  );
}
