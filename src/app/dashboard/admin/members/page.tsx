"use client";

import { MembersWorkspace } from "@/components/members-workspace";
import { PageSpinner } from "@/components/page-spinner";
import { Suspense } from "react";

export default function MembersPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <MembersWorkspace scope="all" />
    </Suspense>
  );
}
