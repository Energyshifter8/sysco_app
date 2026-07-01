export interface User {
  uid: string;
  name: string;
  email: string;
  role: "admin" | "member";
  course: string;
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
