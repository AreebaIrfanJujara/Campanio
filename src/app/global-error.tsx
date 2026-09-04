"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global root layout error caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: "2rem",
          backgroundColor: "#131318",
          color: "#e4e2e6",
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "480px", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 180, 171, 0.15)",
              color: "#ffb4ab",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
            }}
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: "1.75rem", margin: 0, fontWeight: 800 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "1.1rem", margin: 0, opacity: 0.8, lineHeight: 1.5 }}>
            A critical error occurred. Please try reloading the application.
          </p>
          <button
            onClick={() => reset()}
            style={{
              height: "56px",
              padding: "0 2rem",
              backgroundColor: "#3b5edb",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              fontWeight: 700,
              fontSize: "1.1rem",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
