"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, LayoutDashboard, CheckSquare, User, Trophy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { userData, loading } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-64 flex-col border-r bg-muted/40">
        <div className="flex items-center gap-2 border-b px-6 py-4">
          <Trophy className="size-5 text-primary" />
          <span className="text-lg font-semibold">Sysco</span>
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
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
