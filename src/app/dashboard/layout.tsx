"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Loader2,
  LayoutDashboard,
  CheckSquare,
  User,
  Trophy,
  ClipboardCheck,
  ListTodo,
  Users,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

const adminLinks = [
  { href: "/dashboard/admin/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/dashboard/admin/tasks", label: "Manage Tasks", icon: ListTodo },
  { href: "/dashboard/admin/members", label: "Members", icon: Users },
];

function SidebarContent({
  pathname,
  userData,
  loading,
  onLinkClick,
}: {
  pathname: string;
  userData: { name?: string; totalPoints?: number; role?: string } | null;
  loading: boolean;
  onLinkClick?: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <Trophy className="size-5 text-primary" />
          <span className="text-lg font-semibold">Sysco</span>
        </div>
        {onLinkClick && (
          <button
            onClick={onLinkClick}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground md:hidden"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navLinks.map((link) => {
          const isActive =
            link.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <link.icon className="size-4" />
              {link.label}
            </Link>
          );
        })}

        {!loading && userData?.role === "admin" && (
          <>
            <div className="my-2 border-t" />
            <p className="px-3 py-1 text-xs font-medium text-muted-foreground">
              Admin
            </p>
            {adminLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onLinkClick}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <link.icon className="size-4" />
                  {link.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="border-t px-6 py-4">
        {loading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <div className="space-y-1">
            <p className="text-sm font-medium truncate">
              {userData?.name ?? "User"}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Trophy className="size-3" />
              <span>{userData?.totalPoints ?? 0} pts</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { userData, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r bg-muted/40 md:flex">
        <SidebarContent
          pathname={pathname}
          userData={userData}
          loading={loading}
        />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-muted/40 transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent
          pathname={pathname}
          userData={userData}
          loading={loading}
          onLinkClick={() => setMobileOpen(false)}
        />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-primary" />
            <span className="font-semibold">Sysco</span>
          </div>
          {!loading && (
            <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <Trophy className="size-3" />
              <span>{userData?.totalPoints ?? 0} pts</span>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
