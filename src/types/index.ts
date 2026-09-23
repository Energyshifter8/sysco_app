import type { AssigneeStatus, Role, TaskActivityType, Team } from "@/lib/constants";

// Re-exported so existing `@/types` imports keep working; `@/lib/constants` is
// the single source for these values.
export { ASSIGNEE_STATUS_LABELS, ROLE_LABELS, TEAM_LABELS } from "@/lib/constants";
export type { AssigneeStatus, Role, TaskActivityType, Team } from "@/lib/constants";

export interface User {
  uid: string;
  name: string;
  email: string;
  role: Role;
  course: string;
  major: string;
  team?: Team;
  totalPoints: number;
  createdAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  points: number;
  assignedTo: string[];
  createdBy: string;
  createdAt: Date;
  dueDate?: Date;
  /** The team a lead created this task for; unset for admin-created tasks. */
  team?: Team;
  /** Role of the creator at creation time. Optional — legacy tasks predate it. */
  createdByRole?: Role;
  /** Per-assignee status the member sets themselves. Missing key means "pending". */
  assigneeStatus?: Record<string, AssigneeStatus>;
  /** Per-assignee review written by a lead or admin. Presence locks the status. */
  assigneeReview?: Record<string, TaskReview>;
  /**
   * The uid the most recent review write targets. Security rules cannot read a
   * key out of a map diff, so the writer declares it and the rules verify it
   * matches the actual diff.
   */
  lastReviewedUid?: string;

  /* ─ Legacy fields, written by the pre-review flow. Read only by the
     migration script; the app no longer writes or reads them. ─ */
  status?: string;
  assigneeProgress?: Record<string, number>;
  assigneeCompleted?: Record<string, boolean>;
}

/**
 * One entry in `tasks/{taskId}/activity` — an append-only log of who moved what,
 * and when. Review comments deliberately stay out of it: activity is readable by
 * every signed-in user, while a comment is only for the assignee and reviewers.
 */
export interface TaskActivity {
  id: string;
  /** Whose progress this entry is about. */
  uid: string;
  /** Who performed the change — the member themselves, or a lead/admin. */
  actorUid: string;
  type: TaskActivityType;
  from?: AssigneeStatus;
  to?: AssigneeStatus;
  score?: number;
  at: Date;
}

export interface TaskReview {
  score: number;
  reviewedBy: string;
  reviewedAt: Date;
  comment?: string;
}

export interface AttendanceRecord {
  id: string;
  uid: string;
  /** Stored as a `YYYY-MM-DD` day key, not a timestamp. */
  date: string;
  status: string;
  markedBy: string;
  note: string;
}
