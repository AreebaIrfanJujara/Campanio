"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccessibility } from "@/context/AccessibilityContext";
import { useToast } from "@/context/ToastContext";
import { useSupabaseAuth } from "@/lib/hooks/useSupabaseAuth";

export default function CreateAccountPage() {
  const router = useRouter();
  const { speak, setUserProfile } = useAccessibility();
  const { addToast } = useToast();
  const { signUpWithEmail } = useSupabaseAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      speak("Please fill in all input fields.", true);
      addToast("Please fill in all fields.", "warning");
      return;
    }
    if (password.length < 6) {
      speak("Password must be at least 6 characters.", true);
      addToast("Password too short (min 6 characters).", "warning");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await signUpWithEmail(email, password, name);
      if (error) {
        speak("Account creation failed. " + error.message, true);
        addToast(error.message, "error");
        return;
      }
      setUserProfile({ name, preset: "standard" });
      speak(`Welcome, ${name}! Your account has been created. Let's customize your accessibility profile now.`, true);
      addToast("Account created!", "success");
      router.push("/profile-setup");
    } catch (_err: unknown) {
      speak("Account creation failed.", true);
      addToast("Failed to create account", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col justify-center max-w-md mx-auto w-full px-margin-edge py-stack-lg gap-8">
      {/* Title block */}
      <div className="text-center md:text-left flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-on-surface">Create Account</h1>
        <p className="text-lg text-on-surface-variant">Sign up to get personalized accessibility features.</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
        {/* Name Field */}
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="font-semibold text-lg text-on-surface">
            What is your name?
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-[60px] px-4 rounded-xl bg-surface-container border-2 border-outline focus:border-primary focus:outline-none text-lg text-on-surface"
            placeholder="e.g. Alex"
            required
            aria-required="true"
          />
        </div>

        {/* Email Field */}
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="font-semibold text-lg text-on-surface">
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

        {/* Password Field */}
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="font-semibold text-lg text-on-surface">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-[60px] px-4 rounded-xl bg-surface-container border-2 border-outline focus:border-primary focus:outline-none text-lg text-on-surface"
            placeholder="Create password"
            required
            aria-required="true"
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-[56px] rounded-xl bg-primary text-white font-bold text-lg hover:bg-primary-container active:scale-[0.98] transition-all flex items-center justify-center shadow-md cursor-pointer mt-2 disabled:opacity-60"
        >
          {isLoading ? (
            <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
          ) : "Create Account"}
        </button>
      </form>

      {/* Redirect */}
      <div className="flex items-center justify-center gap-2 mt-2 text-lg">
        <span className="text-on-surface-variant">Already have an account?</span>
        <Link href="/sign-in" className="font-bold text-primary underline hover:text-primary-container">
          Sign In
        </Link>
      </div>
    </div>
  );
}
