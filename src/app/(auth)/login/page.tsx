"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type AuthActionState } from "@/lib/actions/auth";
import { DotGridBackground } from "@/components/dot-grid-background";

const initialState: AuthActionState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  const input: React.CSSProperties = {
    width: "100%",
    padding: "0.65rem 0.85rem",
    borderRadius: 6,
    border: "1px solid #333",
    background: "#000",
    color: "#fff",
    fontSize: "0.875rem",
    outline: "none",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "#000",
        color: "#fff",
        fontFamily: "'Inter',-apple-system,sans-serif",
      }}
    >
      <DotGridBackground />
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background:
            "radial-gradient(circle at center,rgba(0,0,0,0.75) 0%,rgba(0,0,0,0) 100%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          background: "#121212",
          borderRadius: 12,
          padding: "2rem",
          width: "100%",
          maxWidth: 400,
          margin: "1rem",
          boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          border: "1px solid #222",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 360,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              background: "#111",
              width: 44,
              height: 44,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "1.15rem",
              marginBottom: "0.75rem",
              border: "1px solid #333",
            }}
          >
            GI
          </div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 600, marginBottom: "0.25rem", letterSpacing: "-0.025em" }}>
            Sign in
          </h1>
          <p style={{ fontSize: "0.85rem", color: "#888", marginBottom: "0.85rem", lineHeight: 1.5 }}>
            Access the GLW India ops dashboard
          </p>

          <form action={formAction} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            <input
              style={input}
              type="email"
              name="email"
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
            <input
              style={input}
              type="password"
              name="password"
              placeholder="Password"
              required
              autoComplete="current-password"
            />
            {state?.error && (
              <p style={{ fontSize: "0.8rem", color: "#f87171", textAlign: "left" }}>{state.error}</p>
            )}
            <button
              type="submit"
              disabled={pending}
              style={{
                width: "100%",
                padding: "0.65rem",
                borderRadius: 6,
                border: "none",
                background: pending ? "#a3a3a3" : "#ededed",
                color: "#000",
                fontWeight: 500,
                fontSize: "0.875rem",
                cursor: pending ? "default" : "pointer",
              }}
            >
              {pending ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div
            style={{
              marginTop: "1.25rem",
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              fontSize: "0.875rem",
              color: "#888",
            }}
          >
            <Link href="/register" style={{ color: "#fff", fontWeight: 500 }}>
              Create account
            </Link>
            <Link href="/forgot-password" style={{ color: "#888" }}>
              Forgot password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
