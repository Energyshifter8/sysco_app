"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { useAuthActions } from "@/hooks/useAuthActions";

export default function LoginPage() {
  const router = useRouter();
  const { login, loading } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success("Амжилттай нэвтрэгдлээ");
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      toast.error(message);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0A0A0A" }}
    >
      <div className="w-full max-w-sm px-4">
        {/* Logo */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded mb-4"
            style={{ background: "rgba(139, 92, 246, 0.125)", border: "1px solid rgba(139, 92, 246, 0.25)" }}
          >
            <Zap size={28} style={{ color: "#8B5CF6" }} />
          </div>
          <h1
            style={{
              fontFamily: "var(--font-jetbrains)",
              fontSize: "1.6rem",
              fontWeight: 800,
              color: "#E8E8E8",
              letterSpacing: "-0.02em",
            }}
          >
            SYSCO APP
          </h1>
          <p
            style={{
              color: "#6B7280",
              fontSize: "0.8rem",
              marginTop: "4px",
              letterSpacing: "0.08em",
            }}
          >
            CLUB MANAGEMENT SYSTEM
          </p>
        </div>

        {/* Card */}
        <div
          className="p-8"
          style={{
            background: "#141414",
            border: "1px solid rgba(255, 255, 255, 0.07)",
            borderRadius: "4px",
          }}
        >
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label
                style={{
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.7rem",
                  color: "#6B7280",
                  letterSpacing: "0.1em",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                ИМЭЙЛ
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: "100%",
                  background: "#1A1A1A",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "3px",
                  padding: "10px 12px",
                  color: "#E8E8E8",
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.9rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div className="mb-8">
              <label
                style={{
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.7rem",
                  color: "#6B7280",
                  letterSpacing: "0.1em",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                НУУЦ ҮГ
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: "100%",
                  background: "#1A1A1A",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "3px",
                  padding: "10px 12px",
                  color: "#E8E8E8",
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.9rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: "#8B5CF6",
                color: "#fff",
                fontFamily: "var(--font-jetbrains)",
                fontWeight: 700,
                fontSize: "0.85rem",
                letterSpacing: "0.08em",
                padding: "12px",
                border: "none",
                borderRadius: "3px",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                transition: "background 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : null}
              {loading ? "НЭВТРЭЖ БАЙНА..." : "НЭВТРЭХ →"}
            </button>
            <p
              style={{
                textAlign: "center",
                color: "#6B7280",
                fontSize: "0.8rem",
                marginTop: "16px",
                fontFamily: "var(--font-barlow)",
              }}
            >
              Бүртгэл байхгүй юу?{" "}
              <Link
                href="/signup"
                style={{
                  color: "#8B5CF6",
                  textDecoration: "none",
                }}
              >
                Бүртгүүлэх
              </Link>
            </p>
          </form>
        </div>

        <p
          style={{
            textAlign: "center",
            color: "#374151",
            fontSize: "0.75rem",
            marginTop: "24px",
            fontFamily: "var(--font-jetbrains)",
          }}
        >
          SYSCO © 2025 — ALL RIGHTS RESERVED
        </p>
      </div>
    </div>
  );
}
