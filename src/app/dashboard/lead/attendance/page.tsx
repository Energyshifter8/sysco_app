"use client";

import { AttendanceWorkspace } from "@/components/attendance-workspace";
import { PageContainer, PageHeader } from "@/components/page-container";
import { PageSpinner } from "@/components/page-spinner";
import { useAuth } from "@/context/AuthContext";
import { Suspense } from "react";

function LeadAttendanceContent() {
  const { userData, loading } = useAuth();

  if (loading) return <PageSpinner />;

  // A lead with no team has nobody to mark; the rules would reject every write.
  if (!userData?.team) {
    return (
      <PageContainer>
        <PageHeader title="БАГИЙН ИРЦ" description="БАГ ОНООГДООГҮЙ" />
        <p style={{ fontFamily: "var(--font-montserrat)", fontSize: "0.9rem", color: "#9CA3AF" }}>
          Танд баг оноогдоогүй тул ирц бүртгэх боломжгүй. Админтай холбогдоно уу.
        </p>
      </PageContainer>
    );
  }

  return <AttendanceWorkspace scope={{ team: userData.team }} />;
}

export default function LeadAttendancePage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <LeadAttendanceContent />
    </Suspense>
  );
}
