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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Members</h1>

      <Card>
        <CardContent className="p-0">
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedMember?.name}</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
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
                <Table>
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
              )}
            </div>

            <div>
              <h3 className="mb-2 font-medium">Attendance History</h3>
              {memberAttendance.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No attendance records
                </p>
              ) : (
                <Table>
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
              )}
            </div>
          </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
