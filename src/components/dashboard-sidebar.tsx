"use client";

import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/lib/constants";
import { auth } from "@/lib/firebase";
import { isAdmin, isLead } from "@/lib/permissions";
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
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";

type NavSection = "main" | "team" | "admin";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  section: NavSection;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Хяналт", icon: LayoutDashboard, section: "main" },
  { href: "/dashboard/tasks", label: "Task", icon: ClipboardList, section: "main" },
  { href: "/dashboard/leaderboard", label: "Эрэмбэ", icon: Trophy, section: "main" },
  { href: "/dashboard/profile", label: "Профайл", icon: User, section: "main" },
  { href: "/dashboard/lead/tasks", label: "Багийн таск", icon: UsersRound, section: "team" },
  { href: "/dashboard/lead/attendance", label: "Багийн ирц", icon: CalendarCheck, section: "team" },
  { href: "/dashboard/lead/members", label: "Багийн гишүүд", icon: Users, section: "team" },
  { href: "/dashboard/admin/tasks", label: "Task үүсгэх", icon: PlusSquare, section: "admin" },
  { href: "/dashboard/admin/attendance", label: "Ирц", icon: CalendarCheck, section: "admin" },
  { href: "/dashboard/admin/members", label: "Гишүүд", icon: Users, section: "admin" },
];

const sectionHeadingStyle: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains)",
  fontSize: "0.55rem",
  color: "#374151",
  letterSpacing: "0.12em",
  padding: "16px 10px 4px",
};

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
      className={`sidebar-nav-link flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-sm transition-all duration-200 ${active ? "is-active" : ""}`}
      style={{
        fontFamily: "var(--font-barlow)",
        fontWeight: active ? 700 : 500,
        background: active
          ? "linear-gradient(90deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.055))"
          : "transparent",
        color: active ? "#C4B5FD" : "#6B7280",
      }}
    >
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-md transition-colors"
        style={{ background: active ? "rgba(139, 92, 246, 0.17)" : "rgba(255,255,255,0.025)" }}
      >
        <Icon size={18} />
      </span>
      <span>{label}</span>
      {active && <ChevronRight size={13} className="ml-auto opacity-80" />}
    </Link>
  );
}

export function DashboardSidebar({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const { userData, loading } = useAuth();
  const router = useRouter();

  const memberItems = NAV_ITEMS.filter((n) => n.section === "main");
  const teamItems = NAV_ITEMS.filter((n) => n.section === "team");
  const adminItems = NAV_ITEMS.filter((n) => n.section === "admin");

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
          <div className="flex items-center justify-center rounded-xl border border-[#8B5CF6]/25 bg-[#8B5CF6]/10 p-1.5 shadow-[0_0_22px_rgba(139,92,246,0.12)]">
            <Image
              src="/sysco-logo.png"
              alt="Sysco Logo"
              width={32}
              height={32}
              quality={100}
              preload
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
          className="sidebar-user"
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

        {!loading && isLead(userData) && (
          <>
            <div style={sectionHeadingStyle}>БАГ</div>
            {teamItems.map(({ href, label, icon }) => (
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

        {!loading && isAdmin(userData) && (
          <>
            <div style={sectionHeadingStyle}>ADMIN</div>
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
                background:
                  "linear-gradient(135deg, rgba(139, 92, 246, 0.32), rgba(139, 92, 246, 0.1))",
                border: "1px solid rgba(167, 139, 250, 0.32)",
                borderRadius: "8px",
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
                {ROLE_LABELS[userData?.role ?? "member"]}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex size-7 items-center justify-center rounded-md border border-transparent text-[#4B5563] transition-all hover:border-white/10 hover:bg-white/7 hover:text-[#FCA5A5]"
              title="Гарах"
              aria-label="Системээс гарах"
            >
              <LogOut size={14} />
            </button>
          </>
        )}
      </div>
    </>
  );
}
