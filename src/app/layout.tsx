import type { Metadata } from "next";
import "./globals.css";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { ToastProvider } from "@/context/ToastContext";
import { ActivityProvider } from "@/context/ActivityContext";
import { ToastContainer } from "@/components/Toast";
import { AppLayoutShell } from "@/components/AppLayoutShell";

export const metadata: Metadata = {
  title: "Companio Accessibility Suite",
  description: "Advanced assistant for visual, hearing, cognitive, and motor accessibility.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Load Inter Font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Load Material Symbols Outlined for accessibility icons */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <AccessibilityProvider>
          <ActivityProvider>
            <ToastProvider>
              <AppLayoutShell>{children}</AppLayoutShell>
              <ToastContainer />
            </ToastProvider>
          </ActivityProvider>
        </AccessibilityProvider>
      </body>
    </html>
  );
}
