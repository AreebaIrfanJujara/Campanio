"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccessibility } from "@/context/AccessibilityContext";

export default function PermissionMicPage() {
  const router = useRouter();
  const { speak, userProfile } = useAccessibility();

  const [status, setStatus] = useState<
    "checking" | "idle" | "requesting" | "granted" | "denied"
  >("checking");

  /*
   * Check whether microphone and camera permissions
   * have already been granted.
   */
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        // Check microphone permission
        const microphonePermission =
          await navigator.permissions.query({
            name: "microphone" as PermissionName,
          });

        // Check camera permission
        const cameraPermission =
          await navigator.permissions.query({
            name: "camera" as PermissionName,
          });

        const microphoneGranted =
          microphonePermission.state === "granted";

        const cameraGranted =
          cameraPermission.state === "granted";

        /*
         * If both permissions are already granted,
         * there is no reason to show this page.
         */
        if (microphoneGranted && cameraGranted) {
          router.replace("/profile-setup");
          return;
        }

        // At least one permission is still needed.
        setStatus("idle");

        const timer = setTimeout(() => {
          speak(
            "Enable Voice and Vision. Tap anywhere on the page to allow microphone and camera access. To skip for now, press the bottom of the page.",
            true
          );
        }, 500);

        return () => clearTimeout(timer);
      } catch (error) {
        /*
         * Some browsers may not support querying
         * microphone/camera permissions.
         *
         * In that case, show the permission page normally.
         */
        console.warn(
          "Unable to check existing media permissions:",
          error
        );

        setStatus("idle");

        const timer = setTimeout(() => {
          speak(
            "Enable Voice and Vision. Tap anywhere on the page to allow microphone and camera access. To skip for now, press the bottom of the page.",
            true
          );
        }, 500);

        return () => clearTimeout(timer);
      }
    };

    checkPermissions();
  }, [router, speak]);

  const requestMicrophoneAndCamera = async () => {
    if (
      status === "checking" ||
      status === "requesting" ||
      status === "granted"
    ) {
      return;
    }

    setStatus("requesting");

    speak(
      "Requesting microphone and camera permissions. Please allow access on your browser prompt.",
      true
    );

    try {
      // Request both microphone and camera
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      stream.getTracks().forEach((track) => track.stop());

      setStatus("granted");

      speak(
        "Permissions granted successfully. Proceeding to choose your accessibility profile.",
        true
      );

      setTimeout(() => {
        router.push("/profile-setup");
      }, 1200);
    } catch {
      /*
       * If requesting both fails, try microphone only.
       * This allows the user to continue even if camera
       * permission was denied.
       */
      try {
        const audioStream =
          await navigator.mediaDevices.getUserMedia({
            audio: true,
          });

        audioStream
          .getTracks()
          .forEach((track) => track.stop());

        setStatus("granted");

        speak(
          "Microphone permission granted. Proceeding to profile setup.",
          true
        );

        setTimeout(() => {
          router.push("/profile-setup");
        }, 1200);
      } catch {
        setStatus("denied");

        speak(
          "Permission was denied. You can still use text and manual features. Proceeding to profile setup.",
          true
        );

        setTimeout(() => {
          router.push("/profile-setup");
        }, 1500);
      }
    }
  };

  const handleSkip = () => {
    if (
      status === "checking" ||
      status === "requesting" ||
      status === "granted"
    ) {
      return;
    }

    speak(
      "Skipping permissions for now. Opening accessibility profile setup.",
      true
    );

    router.push("/profile-setup");
  };

  /*
   * Don't render the permission UI while checking.
   * If permissions are already granted, this page
   * redirects immediately.
   */
  if (status === "checking") {
    return (
      <div
        className="flex-grow flex items-center justify-center w-full"
        aria-label="Checking microphone and camera permissions"
      >
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="relative flex-grow w-full min-h-[calc(100vh-4rem)]">
      {/* Main permission area */}
      <button
        type="button"
        onClick={requestMicrophoneAndCamera}
        disabled={
          status === "requesting" ||
          status === "granted"
        }
        aria-label="Allow microphone and camera access. Tap anywhere in this area to continue."
        className="w-full min-h-[calc(100vh-8rem)] flex flex-col justify-center items-center px-margin-edge py-stack-lg gap-8 text-center cursor-pointer disabled:cursor-default focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
      >
        {/* Visual illustration */}
        <div className="w-32 h-32 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center relative shadow-lg pointer-events-none">
          <span
            className="material-symbols-outlined text-6xl text-primary"
            style={{
              fontVariationSettings: "'FILL' 1",
            }}
          >
            perm_camera_mic
          </span>

          {status === "requesting" && (
            <div className="absolute inset-0 rounded-full border-4 border-primary animate-ping opacity-60" />
          )}
        </div>

        {/* Info Block */}
        <div className="flex flex-col gap-3 pointer-events-none">
          <h1 className="text-3xl font-bold text-on-surface">
            Enable Voice & Vision
          </h1>

          <p className="text-lg text-on-surface-variant leading-relaxed">
            Companio uses your microphone and camera to read
            physical text, narrate obstacles, and transcribe
            speech in real time.
          </p>

          <p className="text-base font-bold text-primary mt-2">
            Tap anywhere here to allow access.
          </p>
        </div>

        {/* Permission Feedback */}
        {status === "granted" && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 bg-green-500/10 text-green-700 dark:text-green-400 font-bold py-2 px-4 rounded-full border border-green-500/30 animate-slide-up pointer-events-none"
          >
            <span className="material-symbols-outlined">
              check_circle
            </span>
            Access Granted
          </div>
        )}

        {status === "denied" && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 bg-red-500/10 text-red-700 dark:text-red-400 font-bold py-2 px-4 rounded-full border border-red-500/30 animate-slide-up pointer-events-none"
          >
            <span className="material-symbols-outlined">
              cancel
            </span>
            Access Denied (Manual Mode Active)
          </div>
        )}
      </button>

      {/* Entire bottom region = Skip */}
      <button
        type="button"
        onClick={handleSkip}
        disabled={
          status === "requesting" ||
          status === "granted"
        }
        aria-label="Skip microphone and camera permissions for now"
        className="absolute bottom-0 left-0 w-full h-24 sm:h-28 bg-surface-container border-t-2 border-outline hover:bg-surface-container-high active:bg-surface-container-highest disabled:opacity-60 text-on-surface-variant font-bold text-lg transition-all flex flex-col items-center justify-center gap-1 cursor-pointer disabled:cursor-default focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
        style={{
          minHeight:
            userProfile.preset === "motor"
              ? "96px"
              : "88px",
        }}
      >
        <span className="material-symbols-outlined text-2xl">
          keyboard_arrow_down
        </span>

        <span>Skip for now</span>

        <span className="text-sm font-normal opacity-75">
          Press the bottom of the page to continue
        </span>
      </button>
    </div>
  );
}

