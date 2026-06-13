"use client"; // global-error.tsx MUST be a Client Component

import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

// Catches errors in the root layout itself (rare — e.g. layout.tsx crashes)
// Must include its own <html> and <body> since the root layout is broken
export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[AquaFlow Global Error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0f172a" }}>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
        }}>
          <div style={{ maxWidth: "400px" }}>
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>💧</div>
            <h1 style={{ color: "#f8fafc", fontSize: "28px", fontWeight: 700, margin: "0 0 12px" }}>
              AquaFlow — Critical Error
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "15px", lineHeight: 1.6, margin: "0 0 24px" }}>
              A critical error occurred and the application could not load.
            </p>
            {process.env.NODE_ENV === "development" && (
              <pre style={{
                background: "rgba(0,0,0,0.4)",
                color: "#fca5a5",
                padding: "12px 16px",
                borderRadius: "10px",
                fontSize: "12px",
                textAlign: "left",
                overflowX: "auto",
                marginBottom: "24px",
              }}>
                {error?.message}
              </pre>
            )}
            <button
              onClick={reset}
              style={{
                background: "#0f4c81",
                color: "#fff",
                border: "none",
                padding: "12px 28px",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🔄 Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
