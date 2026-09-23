import {
  ASSIGN_ALL,
  type AssigneeStatus,
  DEFAULT_ASSIGNEE_STATUS,
  isAssigneeStatus,
  parseTeamToken,
} from "@/lib/constants";
import { asDate } from "@/lib/utils";
import { Task, TaskReview, User } from "@/types";
import { isPast } from "date-fns";

export function isTaskOverdue(task: Pick<Task, "dueDate">): boolean {
  const deadline = asDate(task.dueDate);
  return deadline ? isPast(deadline) : false;
}

export function getAssigneeStatus(task: Task, uid: string): AssigneeStatus {
  const value = task.assigneeStatus?.[uid];
  return isAssigneeStatus(value) ? value : DEFAULT_ASSIGNEE_STATUS;
}

export function getAssigneeReview(task: Task, uid: string): TaskReview | undefined {
  return task.assigneeReview?.[uid];
}

/** A member's status is frozen once a lead or admin has scored their work. */
export function isStatusLocked(task: Task, uid: string): boolean {
  return getAssigneeReview(task, uid) !== undefined;
}

/**
 * Turns `assignedTo` into the actual people it targets. An entry is a uid, the
 * literal "all", or "team:<team>"; a member reachable through more than one
 * entry is only listed once, in directory order.
 */
export function resolveAssignees(task: Pick<Task, "assignedTo">, members: User[]): User[] {
  const entries = task.assignedTo ?? [];
  if (entries.includes(ASSIGN_ALL)) {
    return members.filter((m) => m.role !== "admin");
  }

  const uids = new Set(entries);
  const teams = new Set(entries.map(parseTeamToken).filter((t) => t !== null));

  return members.filter((m) => uids.has(m.uid) || (m.team !== undefined && teams.has(m.team)));
}

export interface TaskSummary {
  total: number;
  done: number;
  reviewed: number;
  label: string;
  color: string;
}

/** The task-level headline, derived from where its assignees have got to. */
export function deriveTaskSummary(task: Task, assignees: User[]): TaskSummary {
  const total = assignees.length;
  const done = assignees.filter((a) => getAssigneeStatus(task, a.uid) === "done").length;
  const reviewed = assignees.filter((a) => getAssigneeReview(task, a.uid) !== undefined).length;

  if (total > 0 && reviewed === total) {
    return { total, done, reviewed, label: "Баталгаажсан", color: "#22C55E" };
  }
  if (reviewed > 0) {
    return { total, done, reviewed, label: "Хэсэгчлэн баталгаажсан", color: "#A78BFA" };
  }
  if (isTaskOverdue(task)) {
    return { total, done, reviewed, label: "Хоцорсон", color: "#EF4444" };
  }
  if (total > 0 && done === total) {
    return { total, done, reviewed, label: "Үнэлгээ хүлээж буй", color: "#3B82F6" };
  }
  return { total, done, reviewed, label: "Хүлээгдэж буй", color: "#FBBF24" };
}

/** Total points a member has been awarded on a task (0 until reviewed). */
export function awardedPoints(task: Task, uid: string): number {
  return getAssigneeReview(task, uid)?.score ?? 0;
}

export interface DeadlineLabel {
  /** "2 өдөр 3 цаг үлдсэн" / "Хоцорсон" / "Хугацаагүй" */
  text: string;
  color: string;
  overdue: boolean;
}

/**
 * How much time is left on a task, as one short phrase.
 *
 * Shared by the cards and the detail dialog so a member reads the same words
 * wherever the task appears, instead of an absolute timestamp in one place and
 * a countdown in the other.
 */
export function deadlineLabel(task: Pick<Task, "dueDate">): DeadlineLabel {
  const due = asDate(task.dueDate);
  if (!due) return { text: "Хугацаагүй", color: "#4B5563", overdue: false };

  const ms = due.getTime() - Date.now();
  if (ms <= 0) return { text: "Хоцорсон", color: "#EF4444", overdue: true };

  const minutes = Math.floor(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);

  if (days > 0)
    return { text: `${days} өдөр ${hours} цаг үлдсэн`, color: "#3B82F6", overdue: false };
  if (hours > 0) {
    // Under a day left is the point at which this stops being routine.
    return { text: `${hours} цаг ${minutes % 60} минут үлдсэн`, color: "#FBBF24", overdue: false };
  }
  return { text: `${minutes} минут үлдсэн`, color: "#FBBF24", overdue: false };
}
