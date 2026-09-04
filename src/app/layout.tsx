import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { ToastProvider } from "@/context/ToastContext";
import { ActivityProvider } from "@/context/ActivityContext";
import { OfflineProvider } from "@/context/OfflineContext";
import { ToastContainer } from "@/components/Toast";
import { AppLayoutShell } from "@/components/AppLayoutShell";
import { OfflineBanner } from "@/components/OfflineBanner";
import { InstallPwaPrompt } from "@/components/InstallPwaPrompt";

export const viewport: Viewport = {
  themeColor: "#1e1b4b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Companio Accessibility Suite",
  description: "Advanced assistant for visual, hearing, cognitive, and motor accessibility with full offline support.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Companio",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Load Inter font and Material Symbols Outlined & Material Icons */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&family=Material+Icons&display=block"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Companio" />
      </head>
      <body className="antialiased">
        <AccessibilityProvider>
          <ActivityProvider>
            <ToastProvider>
              <OfflineProvider>
                <OfflineBanner />
                <AppLayoutShell>{children}</AppLayoutShell>
                <InstallPwaPrompt />
                <ToastContainer />
              </OfflineProvider>
            </ToastProvider>
          </ActivityProvider>
        </AccessibilityProvider>
      </body>
    </html>
  );
}
