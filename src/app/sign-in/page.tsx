"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccessibility } from "@/context/AccessibilityContext";
import { useToast } from "@/context/ToastContext";
import { useSupabaseAuth } from "@/lib/hooks/useSupabaseAuth";

export default function SignInPage() {
  const router = useRouter();
  const { speak, userProfile, setUserProfile } = useAccessibility();
  const { addToast } = useToast();
  const { signInWithEmail, signInWithGoogle, continueAsGuest, resetPassword } = useSupabaseAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const handleContinueAsGuest = () => {
    continueAsGuest();
    setUserProfile({ ...userProfile, name: "Guest User" });
    speak("Continuing in guest mode. All accessibility tools are unlocked.", true);
    addToast("Welcome, Guest! All tools unlocked.", "success");
    router.push("/home");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      speak("Please fill in both email and password fields.", true);
      addToast("Please fill in both fields.", "warning");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await signInWithEmail(email, password);
      if (error) {
        speak("Sign in failed. " + error.message, true);
        addToast(error.message, "error");
        return;
      }
      setUserProfile({ ...userProfile, name: email.split('@')[0] });
      speak("Sign in successful. Welcome back.", true);
      addToast("Welcome back!", "success");
      router.push("/home");
    } catch (e: any) {
      speak("Sign in failed. Please try again.", true);
      addToast("Sign in failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    speak("Redirecting to Google Sign-In.", true);
    addToast("Connecting to Google Auth...", "info");
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        addToast(error.message, "error");
      } else {
        // If not redirected (guest mode), push manually
        router.push("/home");
      }
    } catch (e: any) {
      addToast("Google sign-in failed", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      addToast("Please enter your email", "warning");
      return;
    }
    try {
      const { error } = await resetPassword(forgotEmail);
      if (error) {
        addToast(error.message, "error");
        return;
      }
      setForgotSent(true);
      speak("Password reset email sent. Check your inbox.", true);
      addToast("Reset email sent!", "success");
    } catch (e: any) {
      addToast("Failed to send reset email", "error");
    }
  };

  const forgotInputRef = React.useRef<HTMLInputElement>(null);
  const forgotCloseBtnRef = React.useRef<HTMLButtonElement>(null);
  const modalContainerRef = React.useRef<HTMLDivElement>(null);

  // Escape key and initial focus handling for forgot password modal
  React.useEffect(() => {
    if (!showForgotModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowForgotModal(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Initial focus on email input when modal opens
    const timer = setTimeout(() => {
      if (forgotInputRef.current) {
        forgotInputRef.current.focus();
      } else if (forgotCloseBtnRef.current) {
        forgotCloseBtnRef.current.focus();
      }
    }, 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [showForgotModal]);

  // Focus trap for modal dialog
  const handleModalKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !modalContainerRef.current) return;
    const focusables = modalContainerRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;
    const firstElement = focusables[0];
    const lastElement = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  };

  return (
    <div className="flex-grow flex flex-col justify-center px-margin-edge py-stack-lg w-full text-on-surface gap-6">
      {/* Wordmark and Tagline */}
      <div className="text-center flex flex-col gap-1.5 mb-2">
        <h1 className="text-4xl font-extrabold tracking-tight font-display-ocr text-primary">
          Companio
        </h1>
          <p className="text-base font-bold text-on-surface-variant leading-relaxed">
            Your Universal Accessibility Companion
          </p>
        </div>

        {/* Continue as Guest Button (Instant No-Login Access) */}
        <button
          onClick={handleContinueAsGuest}
          type="button"
          className="w-full h-[56px] rounded-xl flex items-center justify-center gap-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-500/40 font-bold text-base cursor-pointer active:scale-[0.98] transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-2xl">person_play</span>
          Continue as Guest (No Login Required)
        </button>

        {/* Google OAuth Access Button */}
        <button
          onClick={handleGoogleSignIn}
          type="button"
          className="w-full h-[56px] border-2 border-outline rounded-xl flex items-center justify-center gap-3 bg-surface font-bold text-base hover:bg-surface-container-low cursor-pointer active:scale-[0.98] transition-all"
        >
          {/* Inline G logo SVG */}
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-1 w-full">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-outline-variant"></div>
          </div>
          <span className="relative px-3 bg-surface text-sm font-semibold uppercase text-on-surface-variant">
            or
          </span>
        </div>

        {/* Email Password fields Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
          {/* Email Input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="font-semibold text-base text-on-surface">
              Email address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-[60px] px-4 rounded-xl bg-surface-container border-2 border-outline focus:border-primary focus:outline-none text-lg text-on-surface"
              placeholder="name@example.com"
              required
              aria-required="true"
            />
          </div>

          {/* Password Input */}
          <div className="flex flex-col gap-2 relative">
            <div className="flex justify-between items-center">
              <label htmlFor="password" className="font-semibold text-base text-on-surface">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(true);
                  setForgotEmail(email);
                  setForgotSent(false);
                  speak("Forgot password dialog opened. Enter your email to receive a reset link.", true);
                }}
                className="text-sm font-bold text-primary hover:underline focus-visible:outline-none"
              >
                Forgot Password?
              </button>
            </div>
            
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[60px] pl-4 pr-12 rounded-xl bg-surface-container border-2 border-outline focus:border-primary focus:outline-none text-lg text-on-surface"
                placeholder="Enter password"
                required
                aria-required="true"
              />
              <button
                type="button"
                onClick={() => {
                  const state = !showPassword;
                  setShowPassword(state);
                  speak(state ? "Showing password text" : "Hiding password text", true);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface flex items-center justify-center p-2 rounded-full cursor-pointer focus-visible:outline-none"
                aria-label={showPassword ? "Hide password text" : "Show password text"}
              >
                <span className="material-symbols-outlined text-2xl">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {/* Sign in Trigger Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-[56px] mt-2 rounded-xl bg-primary text-white font-bold text-lg hover:bg-primary-container active:scale-[0.98] transition-all flex items-center justify-center shadow-md cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
            ) : "Sign In"}
          </button>
        </form>

        {/* Separator / Redirect */}
        <div className="flex items-center justify-center gap-2 mt-2 text-base">
          <span className="text-on-surface-variant font-medium">New to Companio?</span>
          <Link href="/create-account" className="font-bold text-primary underline hover:text-primary-container">
            Create Account
          </Link>
        </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowForgotModal(false)}>
          <div
            ref={modalContainerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-password-title"
            onKeyDown={handleModalKeyDown}
            className="w-full max-w-md bg-surface border-2 border-outline-variant rounded-3xl p-8 shadow-2xl flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 id="forgot-password-title" className="text-2xl font-extrabold text-on-surface">Reset Password</h2>
              <button
                ref={forgotCloseBtnRef}
                onClick={() => setShowForgotModal(false)}
                className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-container-high cursor-pointer"
                aria-label="Close reset dialog"
              >
                <span className="material-symbols-outlined text-on-surface">close</span>
              </button>
            </div>

            {forgotSent ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <span className="material-symbols-outlined text-5xl text-emerald-500" style={{ fontVariationSettings: "'FILL' 1" }}>mark_email_read</span>
                <p className="text-lg font-bold text-on-surface">Check your inbox</p>
                <p className="text-base text-on-surface-variant">A password reset link has been sent to <strong>{forgotEmail}</strong>.</p>
                <button
                  onClick={() => setShowForgotModal(false)}
                  className="mt-2 h-12 px-8 bg-primary text-white font-bold rounded-xl cursor-pointer hover:bg-primary-container"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <>
                <p className="text-base text-on-surface-variant">
                  Enter the email associated with your account and we&apos;ll send a password reset link.
                </p>
                <div className="flex flex-col gap-2">
                  <label htmlFor="forgot-email" className="font-semibold text-base text-on-surface">Email address</label>
                  <input
                    ref={forgotInputRef}
                    type="email"
                    id="forgot-email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full h-[60px] px-4 rounded-xl bg-surface-container border-2 border-outline focus:border-primary focus:outline-none text-lg text-on-surface"
                    placeholder="name@example.com"
                    required
                  />
                </div>
                <button
                  onClick={handleForgotPassword}
                  className="w-full h-[56px] bg-primary text-white font-bold text-lg rounded-xl hover:bg-primary-container cursor-pointer active:scale-[0.98] transition-all"
                >
                  Send Reset Link
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
