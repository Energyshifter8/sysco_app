"use client";

import { PageSpinner } from "@/components/page-spinner";
import { TaskWorkspace } from "@/components/task-workspace";
import { Suspense } from "react";

export default function LeadTasksPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <TaskWorkspace scope="lead" />
    </Suspense>
  );
}
