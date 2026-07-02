"use client";

import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { getInitials } from "@/lib/utils";
import { signOut } from "firebase/auth";
import {
  CalendarCheck,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  Loader2,
  LogOut,
  PlusSquare,
  Trophy,
  User,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  admin?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Хяналт", icon: LayoutDashboard },
  { href: "/dashboard/tasks", label: "Даалгавар", icon: ClipboardList },
  { href: "/dashboard/leaderboard", label: "Эрэмбэ", icon: Trophy },
  { href: "/dashboard/profile", label: "Профайл", icon: User },
  { href: "/dashboard/admin/tasks", label: "Даалгавар үүсгэх", icon: PlusSquare, admin: true },
  { href: "/dashboard/admin/attendance", label: "Ирц", icon: CalendarCheck, admin: true },
  { href: "/dashboard/admin/members", label: "Гишүүд", icon: Users, admin: true },
];

function NavItemButton({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded transition-all duration-150 text-sm"
      style={{
        fontFamily: "var(--font-barlow)",
        fontWeight: active ? 700 : 500,
        background: active ? "rgba(139, 92, 246, 0.125)" : "transparent",
        color: active ? "#8B5CF6" : "#6B7280",
        borderLeft: `2px solid ${active ? "#8B5CF6" : "transparent"}`,
      }}
    >
      <span className="shrink-0">
        <Icon size={18} />
      </span>
      <span>{label}</span>
      {active && <ChevronRight size={12} className="ml-auto" />}
    </Link>
  );
}

export function DashboardSidebar({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const { userData, loading } = useAuth();
  const router = useRouter();

  const memberItems = NAV_ITEMS.filter((n) => !n.admin);
  const adminItems = NAV_ITEMS.filter((n) => n.admin);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  async function handleLogout() {
    await signOut(auth);
    router.push("/login");
  }

  const initials = getInitials(userData?.name);

  return (
    <>
      {/* Logo */}
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-xl bg-[#111111] border border-white/10 p-1.5">
            <Image
              src="/sysco-logo.png"
              alt="Sysco Logo"
              width={32}
              height={32}
              quality={100}
              priority
              className="rounded-lg"
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontWeight: 800,
                fontSize: "0.85rem",
                color: "#E8E8E8",
                letterSpacing: "-0.01em",
              }}
            >
              SYSCO&TECH
            </span>
            <span
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.55rem",
                color: "#6B7280",
                letterSpacing: "0.1em",
              }}
            >
              APP v1.0
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
        <div
          style={{
            fontFamily: "var(--font-jetbrains)",
            fontSize: "0.55rem",
            color: "#374151",
            letterSpacing: "0.12em",
            padding: "8px 10px 4px",
          }}
        >
          ҮНДСЭН
        </div>
        {memberItems.map(({ href, label, icon }) => (
          <NavItemButton
            key={href}
            href={href}
            label={label}
            icon={icon}
            active={isActive(href)}
            onClick={onLinkClick}
          />
        ))}

        {!loading && userData?.role === "admin" && (
          <>
            <div
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.55rem",
                color: "#374151",
                letterSpacing: "0.12em",
                padding: "16px 10px 4px",
              }}
            >
              ADMIN
            </div>
            {adminItems.map(({ href, label, icon }) => (
              <NavItemButton
                key={href}
                href={href}
                label={label}
                icon={icon}
                active={isActive(href)}
                onClick={onLinkClick}
              />
            ))}
          </>
        )}
      </nav>

      {/* User at bottom */}
      <div
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        {loading ? (
          <div style={{ flex: 1, textAlign: "center", padding: "4px 0" }}>
            <Loader2 size={14} className="animate-spin" style={{ color: "#6B7280" }} />
          </div>
        ) : (
          <>
            <div
              style={{
                width: "30px",
                height: "30px",
                background: "rgba(139, 92, 246, 0.125)",
                border: "1px solid rgba(139, 92, 246, 0.25)",
                borderRadius: "3px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.55rem",
                color: "#8B5CF6",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  color: "#E8E8E8",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  fontFamily: "var(--font-barlow)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {userData?.name ?? "Хэрэглэгч"}
              </p>
              <p
                style={{
                  color: "#6B7280",
                  fontSize: "0.6rem",
                  fontFamily: "var(--font-jetbrains)",
                }}
              >
                {userData?.role ?? "member"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: "none",
                border: "none",
                color: "#4B5563",
                cursor: "pointer",
                padding: "4px",
              }}
              title="Гарах"
            >
              <LogOut size={14} />
            </button>
          </>
        )}
      </div>
    </>
  );
}
