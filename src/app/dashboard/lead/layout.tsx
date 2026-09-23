"use client";

import { useAuth } from "@/context/AuthContext";
import { canManageTeamTasks } from "@/lib/permissions";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LeadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userData, loading } = useAuth();
  const router = useRouter();
  const allowed = canManageTeamTasks(userData);

  useEffect(() => {
    if (!loading && !allowed) {
      router.push("/dashboard");
    }
  }, [allowed, loading, router]);

  if (loading || !userData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
