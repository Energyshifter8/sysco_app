"use client";

import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { PageContainer } from "@/components/page-container";
import { useAuth } from "@/context/AuthContext";
import { AlertTriangle, Menu, Sparkles, Zap } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userData, loading, error, profileIncomplete } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const nudgedRef = useRef(false);

  // Members whose profile was back-filled (or who skipped it at sign-up) land
  // here with no team or major. Point them at the profile page once per visit,
  // and never while they are already on it.
  useEffect(() => {
    if (loading || !profileIncomplete || nudgedRef.current) return;
    if (pathname === "/dashboard/profile") return;

    nudgedRef.current = true;
    toast.info("Профайлаа бөглөнө үү — баг болон чиглэлээ сонгоно уу");
    router.push("/dashboard/profile");
  }, [loading, profileIncomplete, pathname, router]);

  return (
    <div
      className="app-shell flex h-screen overflow-hidden"
      style={{ fontFamily: "var(--font-barlow)" }}
    >
      {/* Desktop sidebar */}
      <aside
        style={{
          width: "220px",
          flexShrink: 0,
          background: "#111111",
          borderRight: "1px solid rgba(255, 255, 255, 0.07)",
        }}
        className="dashboard-sidebar-surface hidden shrink-0 flex-col md:flex"
      >
        <DashboardSidebar />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 40,
          }}
          onClick={() => setMobileOpen(false)}
          className="md:hidden"
        />
      )}

      {/* Mobile sidebar */}
      <aside
        style={{
          position: "fixed",
          inset: 0,
          width: "220px",
          background: "#111111",
          borderRight: "1px solid rgba(255, 255, 255, 0.07)",
          zIndex: 50,
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.2s ease",
        }}
        className="dashboard-sidebar-surface flex flex-col md:hidden"
      >
        <DashboardSidebar onLinkClick={() => setMobileOpen(false)} />
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Mobile top bar */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
            background: "rgba(10, 10, 10, 0.82)",
            backdropFilter: "blur(16px)",
          }}
          className="flex items-center gap-4 px-4 py-3 md:hidden"
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="flex size-9 items-center justify-center rounded-lg border border-white/8 bg-white/4 text-[#9CA3AF] transition-colors hover:border-white/12 hover:bg-white/8 hover:text-white"
            aria-label="Цэс нээх"
          >
            <Menu size={20} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="flex size-7 items-center justify-center rounded-md bg-[#8B5CF6]/15 text-[#A78BFA]">
              <Zap size={15} />
            </span>
            <span
              style={{ fontWeight: 800, fontFamily: "var(--font-jetbrains)", fontSize: "0.8rem" }}
            >
              SYSCO&TECH
            </span>
          </div>
          {!loading && (
            <div className="ml-auto flex items-center gap-1.5 rounded-full border border-[#8B5CF6]/20 bg-[#8B5CF6]/10 px-2.5 py-1 text-[#C4B5FD]">
              <Sparkles size={12} />
              <span
                style={{
                  fontSize: "0.65rem",
                  fontFamily: "var(--font-jetbrains)",
                  fontWeight: 700,
                }}
              >
                {userData?.totalPoints ?? 0} оноо
              </span>
            </div>
          )}
        </header>

        <main className="w-full">
          {error && (
            <PageContainer className="pb-0">
              <div
                className="flex items-center gap-2.5 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-3.5 py-3"
                role="alert"
              >
                <AlertTriangle size={16} className="shrink-0 text-[#EF4444]" />
                <span
                  style={{
                    fontFamily: "var(--font-barlow)",
                    fontSize: "0.85rem",
                    color: "#FCA5A5",
                  }}
                >
                  {error}
                </span>
              </div>
            </PageContainer>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
