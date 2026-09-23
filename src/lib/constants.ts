export const MAJORS = [
  { value: "computer_science", label: "Компьютерын ухаан" },
  { value: "software_engineering", label: "Програм хангамж" },
  { value: "artificial_intelligence", label: "Хиймэл оюун ухаан" },
  { value: "data_science", label: "Өгөгдлийн ухаан" },
  { value: "cyber_security", label: "Кибер аюулгүй байдал" },
  { value: "network_engineering", label: "Мэдээлэл, холбоо сүлжээний инженерчлэл" },
  { value: "iot_technology", label: "IoT технологи" },
  { value: "information_technology", label: "Мэдээллийн технологи" },
  { value: "information_systems", label: "Мэдээллийн систем" },
  { value: "multimedia", label: "Мультимедиа" },
] as const;

export type MajorValue = (typeof MAJORS)[number]["value"];

export function getMajorLabel(value?: string | null): string {
  if (!value) return "";
  const match = MAJORS.find((m) => m.value === value);
  return match ? match.label : value;
}

/* ─── Teams ─── */

export const TEAMS = [
  { value: "dev", label: "Хөгжүүлэлтийн баг", short: "Хөгжүүлэлт" },
  { value: "ops", label: "Дотоод үйл ажиллагааны баг", short: "Дотоод үйл ажиллагаа" },
  { value: "design", label: "Дизайн баг", short: "Дизайн" },
  { value: "social", label: "Сошиал баг", short: "Сошиал" },
] as const;

export type Team = (typeof TEAMS)[number]["value"];

export const TEAM_LABELS = Object.fromEntries(TEAMS.map((t) => [t.value, t.label])) as Record<
  Team,
  string
>;

export const TEAM_SHORT_LABELS = Object.fromEntries(TEAMS.map((t) => [t.value, t.short])) as Record<
  Team,
  string
>;

export function isTeam(value: unknown): value is Team {
  return TEAMS.some((t) => t.value === value);
}

/* ─── Roles ─── */

export const ROLES = [
  { value: "admin", label: "Админ" },
  { value: "lead", label: "Ахлагч" },
  { value: "member", label: "Гишүүн" },
] as const;

export type Role = (typeof ROLES)[number]["value"];

export const ROLE_LABELS = Object.fromEntries(ROLES.map((r) => [r.value, r.label])) as Record<
  Role,
  string
>;

/**
 * Ceiling on a task's point value.
 *
 * The review dialog draws one segment per possible score, so an unbounded field
 * let a mistyped number turn into a million-element render.
 */
export const MAX_TASK_POINTS = 1000;

/* ─── Per-assignee task status ─── */

export const ASSIGNEE_STATUSES = [
  { value: "pending", label: "Хүлээгдэж буй", color: "#FBBF24" },
  { value: "in_progress", label: "Хийж байгаа", color: "#3B82F6" },
  { value: "done", label: "Дууссан", color: "#22C55E" },
] as const;

export type AssigneeStatus = (typeof ASSIGNEE_STATUSES)[number]["value"];

export const DEFAULT_ASSIGNEE_STATUS: AssigneeStatus = "pending";

export const ASSIGNEE_STATUS_LABELS = Object.fromEntries(
  ASSIGNEE_STATUSES.map((s) => [s.value, s.label]),
) as Record<AssigneeStatus, string>;

export const ASSIGNEE_STATUS_COLORS = Object.fromEntries(
  ASSIGNEE_STATUSES.map((s) => [s.value, s.color]),
) as Record<AssigneeStatus, string>;

export function isAssigneeStatus(value: unknown): value is AssigneeStatus {
  return ASSIGNEE_STATUSES.some((s) => s.value === value);
}

/* ─── Task activity ─── */

export const ACTIVITY_TYPES = ["status", "review"] as const;

export type TaskActivityType = (typeof ACTIVITY_TYPES)[number];

/* ─── Assignment tokens ─── */

/** `assignedTo` entry that targets every member. */
export const ASSIGN_ALL = "all";

/** `assignedTo` entry that targets one whole team. */
export function teamToken(team: Team): string {
  return `team:${team}`;
}

/** Reads a `team:<team>` entry back, or null when the entry is not a team token. */
export function parseTeamToken(entry: string): Team | null {
  if (!entry.startsWith("team:")) return null;
  const value = entry.slice(5);
  return isTeam(value) ? value : null;
}

/* ─── Attendance ─── */

/**
 * The four states a day can be marked with, and the points each is worth.
 *
 * Only "present" earns anything; "excused" is a sanctioned absence, so it is
 * neither rewarded nor counted against the member.
 */
export const ATTENDANCE_STATUSES = [
  { value: "present", label: "Ирсэн", short: "ИРСЭН", color: "#22C55E" },
  { value: "late", label: "Хоцорсон", short: "ХОЦОРСОН", color: "#FBBF24" },
  { value: "absent", label: "Ирээгүй", short: "ИРЭЭГҮЙ", color: "#EF4444" },
  { value: "excused", label: "Чөлөөтэй", short: "ЧӨЛӨӨТЭЙ", color: "#60A5FA" },
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]["value"];

/** "Not marked yet" — the state a member is in before anyone files the day. */
export type AttendanceMark = AttendanceStatus | "";

export const ATTENDANCE_LABELS = Object.fromEntries(
  ATTENDANCE_STATUSES.map((s) => [s.value, s.label]),
) as Record<AttendanceStatus, string>;

export const ATTENDANCE_SHORT_LABELS = Object.fromEntries(
  ATTENDANCE_STATUSES.map((s) => [s.value, s.short]),
) as Record<AttendanceStatus, string>;

export const ATTENDANCE_COLORS = Object.fromEntries(
  ATTENDANCE_STATUSES.map((s) => [s.value, s.color]),
) as Record<AttendanceStatus, string>;

export function isAttendanceStatus(value: unknown): value is AttendanceStatus {
  return ATTENDANCE_STATUSES.some((s) => s.value === value);
}

/** Points credited for one day. Turning up is the only thing that scores. */
export const ATTENDANCE_POINTS = 5;

export function attendancePoints(status: AttendanceMark): number {
  return status === "present" ? ATTENDANCE_POINTS : 0;
}
