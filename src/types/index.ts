export type Team = "dev" | "ops" | "design" | "social";

export const TEAM_LABELS: Record<Team, string> = {
  dev: "Хөгжүүлэлтийн баг",
  ops: "Дотоод үйл ажиллагааны баг",
  design: "Дизайн баг",
  social: "Сошиал баг",
};

export interface User {
  uid: string;
  name: string;
  email: string;
  role: "admin" | "member";
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
  status: string;
  createdBy: string;
  createdAt: Date;
  dueDate: Date;
}

export interface AttendanceRecord {
  id: string;
  uid: string;
  date: Date;
  status: string;
  markedBy: string;
  note: string;
}
