"use client";

import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { useAuth } from "@/context/AuthContext";
import { Menu, Zap } from "lucide-react";
import { useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userData, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#0A0A0A",
        fontFamily: "var(--font-barlow)",
        overflow: "hidden",
      }}
    >
      {/* Desktop sidebar */}
      <aside
        style={{
          width: "220px",
          flexShrink: 0,
          background: "#111111",
          borderRight: "1px solid rgba(255, 255, 255, 0.07)",
          display: "flex",
          flexDirection: "column",
        }}
        className="hidden md:flex"
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
          display: "flex",
          flexDirection: "column",
          zIndex: 50,
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.2s ease",
        }}
        className="md:hidden"
      >
        <DashboardSidebar onLinkClick={() => setMobileOpen(false)} />
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
        {/* Mobile top bar */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            gap: "16px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
            background: "rgba(10, 10, 10, 0.95)",
            backdropFilter: "blur(8px)",
            padding: "12px 16px",
          }}
          className="md:hidden"
        >
          <button
            onClick={() => setMobileOpen(true)}
            style={{
              background: "none",
              border: "none",
              color: "#6B7280",
              cursor: "pointer",
              padding: "4px",
            }}
            aria-label="Цэс нээх"
          >
            <Menu size={20} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Zap size={16} style={{ color: "#8B5CF6" }} />
            <span
              style={{ fontWeight: 700, fontFamily: "var(--font-jetbrains)", fontSize: "0.85rem" }}
            >
              SYSCO&TECH
            </span>
          </div>
          {!loading && (
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.75rem",
                color: "#6B7280",
                fontFamily: "var(--font-jetbrains)",
              }}
            >
              {userData?.totalPoints ?? 0} оноо
            </div>
          )}
        </header>

        <main style={{ flex: 1, overflow: "auto", padding: "28px 32px", maxWidth: "1100px" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
