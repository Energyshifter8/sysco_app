"use client";

import { useEffect, useState } from "react";
import { Loader2, Eye } from "lucide-react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User, Task, AttendanceRecord } from "@/types";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MembersPage() {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [memberTasks, setMemberTasks] = useState<Task[]>([]);
  const [memberAttendance, setMemberAttendance] = useState<AttendanceRecord[]>(
    []
  );
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    async function fetchMembers() {
      setLoading(true);
      const snap = await getDocs(
        query(collection(db, "users"), where("role", "!=", "admin"))
      );
      setMembers(snap.docs.map((d) => d.data() as User));
      setLoading(false);
    }
    fetchMembers();
  }, []);

  async function handleViewMember(member: User) {
    setSelectedMember(member);
    setDetailLoading(true);

    const [tasksSnap, attSnap] = await Promise.all([
      getDocs(
        query(
          collection(db, "tasks"),
          where("assignedTo", "array-contains", member.uid)
        )
      ),
      getDocs(
        query(
          collection(db, "attendance"),
          where("uid", "==", member.uid),
          orderBy("date", "desc")
        )
      ),
    ]);

    setMemberTasks(tasksSnap.docs.map((d) => d.data() as Task));
    setMemberAttendance(attSnap.docs.map((d) => d.data() as AttendanceRecord));
    setDetailLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <h1 className="text-xl font-bold sm:text-2xl">Members</h1>

      <Card>
        <CardContent className="p-0">
          {/* Mobile card view */}
          <div className="space-y-2 p-3 sm:hidden">
            {members.map((member) => (
              <div
                key={member.uid}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <p className="font-medium text-sm">{member.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{member.course || "-"}</span>
                    <span>-</span>
                    <span>{member.major || "-"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {member.totalPoints} pts
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewMember(member)}
                >
                  <Eye className="mr-1 size-3" />
                  View
                </Button>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Major</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.uid}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.course || "-"}</TableCell>
                    <TableCell>{member.major || "-"}</TableCell>
                    <TableCell className="text-right">
                      {member.totalPoints}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewMember(member)}
                      >
                        <Eye className="mr-1 size-3" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {members.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              No members found
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedMember}
        onOpenChange={(open) => {
          if (!open) setSelectedMember(null);
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">{selectedMember?.name}</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
          <div className="space-y-5 sm:space-y-6">
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 sm:gap-4">
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{selectedMember?.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Course</p>
                <p className="font-medium">
                  {selectedMember?.course || "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Major</p>
                <p className="font-medium">
                  {selectedMember?.major || "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Points</p>
                <p className="font-medium">
                  {selectedMember?.totalPoints}
                </p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 font-medium">Task History</h3>
              {memberTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks</p>
              ) : (
                <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                  <Table className="min-w-[300px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {memberTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>{task.title}</TableCell>
                          <TableCell>{task.points}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                task.status === "completed"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {task.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-2 font-medium">Attendance History</h3>
              {memberAttendance.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No attendance records
                </p>
              ) : (
                <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                  <Table className="min-w-[350px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {memberAttendance.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {typeof record.date === "string"
                              ? record.date
                              : record.date instanceof Date
                                ? record.date.toLocaleDateString()
                                : String(record.date)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                record.status === "present"
                                  ? "default"
                                  : record.status === "late"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{record.note || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
