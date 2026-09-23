"use client";

import { PasswordInput } from "@/components/ui/password-input";
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
    <div className="auth-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="flex items-center justify-center rounded-2xl border border-[#8B5CF6]/25 bg-[#8B5CF6]/10 p-3 shadow-[0_0_32px_rgba(139,92,246,0.16)]">
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
          <span
            className="inline-flex rounded-full border border-white/8 bg-white/4 px-3 py-1 text-[#9CA3AF]"
            style={{
              fontFamily: "var(--font-jetbrains)",
              fontSize: "0.6rem",
              letterSpacing: "0.1em",
            }}
          >
            MEMBER PORTAL
          </span>
        </div>

        {/* Card */}
        <div className="auth-card rounded-2xl p-6 sm:p-8">
          <div className="mb-7">
            <h1
              style={{
                color: "#F3F4F6",
                fontFamily: "var(--font-barlow)",
                fontSize: "1.35rem",
                fontWeight: 800,
              }}
            >
              Шинэ клубийн өрөөндөө тавтай морил
            </h1>
            <p
              style={{
                color: "#6B7280",
                fontFamily: "var(--font-barlow)",
                fontSize: "0.85rem",
                marginTop: "4px",
              }}
            />
          </div>
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
                className="auth-input"
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
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="auth-submit"
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
                transition: "background 0.2s, transform 0.2s, box-shadow 0.2s",
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
            marginTop: "20px",
            fontFamily: "var(--font-jetbrains)",
          }}
        >
          SYSCO&TECH © 2025 — ALL RIGHTS RESERVED
        </p>
      </div>
    </div>
  );
}
