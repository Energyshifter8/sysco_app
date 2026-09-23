"use client";

import { PasswordInput } from "@/components/ui/password-input";
import { useAuthActions } from "@/hooks/useAuthActions";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function SignupPage() {
  const router = useRouter();
  const { signup, loading } = useAuthActions();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await signup(email, password, name);
      toast.success("Бүртгэл амжилттай үүсгэгдлээ");
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Signup failed";
      toast.error(message);
    }
  }

  return (
    <div className="auth-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="flex items-center justify-center rounded-2xl border border-[#8B5CF6]/25 bg-[#8B5CF6]/10 p-3 shadow-[0_0_32px_rgba(139,92,246,0.16)]">
              <Image
                src="/sysco-logo.png"
                alt="Sysco Logo"
                width={48}
                height={48}
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
                  fontSize: "1.45rem",
                  color: "#E8E8E8",
                  letterSpacing: "-0.02em",
                }}
              >
                SYSCO&TECH
              </span>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.65rem",
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
            CREATE YOUR ACCOUNT
          </span>
        </div>

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
              Бүртгэл үүсгэх
            </h1>
            <p
              style={{
                color: "#6B7280",
                fontFamily: "var(--font-barlow)",
                fontSize: "0.85rem",
                marginTop: "4px",
              }}
            >
              Эхлэхийн тулд мэдээллээ оруулна уу.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label
                htmlFor="name"
                style={{
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.7rem",
                  color: "#6B7280",
                  letterSpacing: "0.1em",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                БҮТЭН НЭР
              </label>
              <input
                id="name"
                type="text"
                className="auth-input"
                placeholder="Таны нэр"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: "100%",
                  background: "#1A1A1A",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  color: "#E8E8E8",
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.85rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div className="mb-5">
              <label
                htmlFor="email"
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
                id="email"
                type="email"
                className="auth-input"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  background: "#1A1A1A",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  color: "#E8E8E8",
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.85rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div className="mb-7">
              <label
                htmlFor="password"
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
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Хамгийн багадаа 6 тэмдэгт"
                required
                minLength={6}
                radius="6px"
                fontSize="0.85rem"
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
                fontSize: "0.8rem",
                letterSpacing: "0.08em",
                padding: "12px",
                border: "none",
                borderRadius: "6px",
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
              {loading ? "БҮРТГЭЖ БАЙНА..." : "БҮРТГҮҮЛЭХ →"}
            </button>
            <p
              style={{
                textAlign: "center",
                color: "#6B7280",
                fontSize: "0.8rem",
                marginTop: "18px",
                fontFamily: "var(--font-barlow)",
              }}
            >
              Бүртгэл байна уу?{" "}
              <Link href="/login" className="text-[#A78BFA] transition-colors hover:text-[#C4B5FD]">
                Нэвтрэх
              </Link>
            </p>
          </form>
        </div>
        <p
          style={{
            textAlign: "center",
            color: "#374151",
            fontSize: "0.7rem",
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
