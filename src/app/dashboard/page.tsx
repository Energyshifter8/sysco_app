"use client";

import { Loader2, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAuthActions } from "@/hooks/useAuthActions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { user, userData, loading } = useAuth();
  const { logout } = useAuthActions();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Sysco Dashboard</CardTitle>
          <CardDescription>You are signed in</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1">
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-medium">{userData?.name ?? user.email}</p>
          </div>
          <div className="grid gap-1">
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div className="grid gap-1">
            <p className="text-sm text-muted-foreground">Role</p>
            <p className="font-medium capitalize">{userData?.role ?? "member"}</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="mt-2">
            <LogOut className="mr-2 size-4" />
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
