"use client";

import { useEffect, useState } from "react";
import { Loader2, CalendarClock, Trophy, AlertTriangle } from "lucide-react";
import { isPast } from "date-fns";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Task } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function isOverdue(dueDate: Date): boolean {
  return isPast(dueDate);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case "completed":
      return "default" as const;
    case "in_progress":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "assigned":
      return "New";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    default:
      return status;
  }
}

export default function MemberTasksPage() {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "tasks"),
      where("assignedTo", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map((doc) => doc.data() as Task);
      setTasks(fetched);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeTasks = tasks.filter(
    (t) => t.status === "assigned" || t.status === "in_progress"
  );
  const completedTasks = tasks.filter((t) => t.status === "completed");

  return (
    <div className="space-y-5 sm:space-y-6">
      <h1 className="text-xl font-bold sm:text-2xl">My Tasks</h1>

      <Tabs defaultValue="active">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="active" className="flex-1 sm:flex-none">
            Active ({activeTasks.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 sm:flex-none">
            History ({completedTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {activeTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CalendarClock className="mb-3 size-10 opacity-40" />
                <p className="text-center">No active tasks assigned to you.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              {activeTasks.map((task) => {
                const dueDate = task.dueDate
                  ? new Date(task.dueDate)
                  : null;
                const overdue = dueDate ? isOverdue(dueDate) : false;

                return (
                  <Card key={task.id} className="relative overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm sm:text-base">
                          {task.title}
                        </CardTitle>
                        <Badge variant={statusBadgeVariant(task.status)} className="shrink-0">
                          {statusLabel(task.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Trophy className="size-3.5" />
                          <span className="font-medium text-foreground">
                            {task.points}
                          </span>{" "}
                          pts
                        </div>
                        {dueDate && (
                          <div
                            className={`flex items-center gap-1.5 ${
                              overdue
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }`}
                          >
                            {overdue && (
                              <AlertTriangle className="size-3.5" />
                            )}
                            <span
                              className={`text-xs ${overdue ? "font-medium" : ""}`}
                            >
                              Due {formatDate(dueDate)}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {completedTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CalendarClock className="mb-3 size-10 opacity-40" />
                <p className="text-center">No completed tasks yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              {completedTasks.map((task) => (
                <Card key={task.id} className="opacity-80">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm sm:text-base">
                        {task.title}
                      </CardTitle>
                      <Badge variant={statusBadgeVariant(task.status)} className="shrink-0">
                        {statusLabel(task.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {task.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Trophy className="size-3.5" />
                      <span className="font-medium text-foreground">
                        {task.points}
                      </span>{" "}
                      pts earned
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
