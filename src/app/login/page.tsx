"use client";

import { useAuthActions } from "@/hooks/useAuthActions";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

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
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center justify-center rounded-xl bg-[#111111] border border-white/10 p-3">
              <Image
                src="/sysco-logo.png"
                alt="Sysco Logo"
                width={56}
                height={56}
                quality={100}
                priority
                className="rounded-lg"
              />
            </div>
            <div className="flex flex-col text-left leading-tight">
              <span
                style={{
                  fontFamily: "var(--font-jetbrains)",
                  fontWeight: 800,
                  fontSize: "1.6rem",
                  color: "#E8E8E8",
                  letterSpacing: "-0.02em",
                }}
              >
                SYSCO&TECH
              </span>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.7rem",
                  color: "#6B7280",
                  letterSpacing: "0.12em",
                }}
              >
                APP v1.0
              </span>
            </div>
          </div>
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
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
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
          SYSCO&TECH © 2025 — ALL RIGHTS RESERVED
        </p>
      </div>
    </div>
  );
}
