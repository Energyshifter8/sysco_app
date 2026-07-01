"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, CheckCircle2, CalendarIcon } from "lucide-react";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  doc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { User, Task } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export default function AdminTasksPage() {
  const { userData, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState(0);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [assignAll, setAssignAll] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [membersSnap, tasksSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), where("role", "!=", "admin"))),
        getDocs(collection(db, "tasks")),
      ]);
      setMembers(
        membersSnap.docs.map((d) => d.data() as User)
      );
      setTasks(tasksSnap.docs.map((d) => d.data() as Task));
      setLoading(false);
    }
    fetchData();
  }, []);

  function toggleMember(uid: string) {
    setSelectedMembers((prev) =>
      prev.includes(uid)
        ? prev.filter((id) => id !== uid)
        : [...prev, uid]
    );
  }

  function toggleAssignAll() {
    setAssignAll((prev) => {
      if (!prev) {
        setSelectedMembers(members.map((m) => m.uid));
      } else {
        setSelectedMembers([]);
      }
      return !prev;
    });
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!userData || !title || !dueDate) return;
    setSaving(true);
    try {
      const assignedTo = assignAll
        ? members.map((m) => m.uid)
        : selectedMembers;
      const taskData: Task = {
        id: "",
        title,
        description,
        points,
        assignedTo,
        status: "assigned",
        createdBy: userData.uid,
        createdAt: new Date(),
        dueDate,
      };
      const docRef = await addDoc(collection(db, "tasks"), taskData);
      await updateDoc(docRef, { id: docRef.id });
      setTasks((prev) => [...prev, { ...taskData, id: docRef.id }]);
      setTitle("");
      setDescription("");
      setPoints(0);
      setDueDate(undefined);
      setSelectedMembers([]);
      setAssignAll(false);
      toast.success("Task created successfully");
    } catch {
      toast.error("Failed to create task");
    } finally {
      setSaving(false);
    }
  }

  async function handleApproveTask(task: Task, memberUid: string) {
    try {
      const taskRef = doc(db, "tasks", task.id);
      const newAssignedTo = task.assignedTo.filter((id) => id !== memberUid);
      await updateDoc(taskRef, {
        assignedTo: newAssignedTo,
        status: newAssignedTo.length === 0 ? "completed" : task.status,
      });
      const userRef = doc(db, "users", memberUid);
      await updateDoc(userRef, { totalPoints: increment(task.points) });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                assignedTo: newAssignedTo,
                status: newAssignedTo.length === 0 ? "completed" : t.status,
              }
            : t
        )
      );
      toast.success("Task approved, points awarded");
    } catch {
      toast.error("Failed to approve task");
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Manage Tasks</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-4" />
            Create Task
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateTask} className="grid gap-4">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Task description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Points</Label>
                <Input
                  type="number"
                  min={0}
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Due Date</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" type="button">
                      <CalendarIcon className="mr-2 size-4" />
                      {dueDate
                        ? dueDate.toLocaleDateString()
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={(d) => {
                        setDueDate(d);
                        setCalendarOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Assign To</Label>
              <div className="flex items-center gap-2 border-b pb-2">
                <Checkbox
                  id="assign-all"
                  checked={assignAll}
                  onCheckedChange={toggleAssignAll}
                />
                <label htmlFor="assign-all" className="text-sm font-medium">
                  All Members
                </label>
              </div>
              {!assignAll && (
                <div className="flex flex-wrap gap-3 pt-1">
                  {members.map((member) => (
                    <div
                      key={member.uid}
                      className="flex items-center gap-2"
                    >
                      <Checkbox
                        id={member.uid}
                        checked={selectedMembers.includes(member.uid)}
                        onCheckedChange={() => toggleMember(member.uid)}
                      />
                      <label
                        htmlFor={member.uid}
                        className="text-sm"
                      >
                        {member.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" disabled={saving} className="w-fit">
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Create Task
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">
                    {task.title}
                  </TableCell>
                  <TableCell>
                    {task.assignedTo.length === 0 ? (
                      <Badge variant="secondary">None</Badge>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {task.assignedTo.map((uid) => {
                          const member = members.find(
                            (m) => m.uid === uid
                          );
                          return (
                            <Badge key={uid} variant="outline">
                              {member?.name ?? uid}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </TableCell>
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
                  <TableCell className="text-right">
                    {task.assignedTo.length > 0 && (
                      <div className="flex flex-wrap justify-end gap-1">
                        {task.assignedTo.map((uid) => {
                          const member = members.find(
                            (m) => m.uid === uid
                          );
                          return (
                            <Button
                              key={uid}
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleApproveTask(task, uid)
                              }
                            >
                              <CheckCircle2 className="mr-1 size-3" />
                              {member?.name ?? uid}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {tasks.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              No tasks yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
