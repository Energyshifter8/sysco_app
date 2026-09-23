"use client";

import { MembersWorkspace } from "@/components/members-workspace";
import { PageContainer, PageHeader } from "@/components/page-container";
import { PageSpinner } from "@/components/page-spinner";
import { useAuth } from "@/context/AuthContext";
import { Suspense } from "react";

function LeadMembersContent() {
  const { userData, loading } = useAuth();

  if (loading) return <PageSpinner />;

  if (!userData?.team) {
    return (
      <PageContainer>
        <PageHeader title="БАГИЙН ГИШҮҮД" description="БАГ ОНООГДООГҮЙ" />
        <p style={{ fontFamily: "var(--font-barlow)", fontSize: "0.9rem", color: "#9CA3AF" }}>
          Танд баг оноогдоогүй тул багийн гишүүд харагдахгүй байна. Админтай холбогдоно уу.
        </p>
      </PageContainer>
    );
  }

  return <MembersWorkspace scope={{ team: userData.team }} />;
}

export default function LeadMembersPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <LeadMembersContent />
    </Suspense>
  );
}
