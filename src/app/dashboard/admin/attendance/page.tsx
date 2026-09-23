"use client";

import { AttendanceWorkspace } from "@/components/attendance-workspace";
import { PageSpinner } from "@/components/page-spinner";
import { Suspense } from "react";

export default function AttendancePage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <AttendanceWorkspace scope="all" />
    </Suspense>
  );
}
