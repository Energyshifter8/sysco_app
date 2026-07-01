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
import { User, Task, Team, TEAM_LABELS } from "@/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [assignmentTarget, setAssignmentTarget] = useState<"all" | "team" | "member">("all");
  const [selectedTeam, setSelectedTeam] = useState<Team>("dev");

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

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!userData || !title || !dueDate) return;
    if (assignmentTarget === "member" && selectedMembers.length === 0) {
      toast.error("Нэг эсвэл түбээс олон гишүүн сонгоно уу");
      return;
    }
    setSaving(true);
    try {
      let assignedTo: string[];
      switch (assignmentTarget) {
        case "all":
          assignedTo = ["all"];
          break;
        case "team":
          assignedTo = [`team:${selectedTeam}`];
          break;
        case "member":
          assignedTo = [...selectedMembers];
          break;
        default:
          assignedTo = ["all"];
      }
      if (!Array.isArray(assignedTo) || assignedTo.length === 0) {
        toast.error("Даалгавар хүлээн авагч сонгоно уу");
        return;
      }
      console.log("Creating task with assignedTo:", assignedTo);
      const taskData = {
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
      setTasks((prev) => [...prev, { ...taskData, id: docRef.id } as Task]);
      setTitle("");
      setDescription("");
      setPoints(0);
      setDueDate(undefined);
      setSelectedMembers([]);
      setAssignmentTarget("all");
      setSelectedTeam("dev");
      toast.success("Даалгавар амжилттай үүсгэгдлээ");
    } catch {
      toast.error("Даалгавар үүсгэхэд алдаа гарлаа");
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
      toast.success("Даалгавар баталгаажуулагдлаа, оноо нэмэгдлээ");
    } catch {
      toast.error("Даалгавар баталгаажуулахад алдаа гарлаа");
    }
  }

  function resolveAssignedLabel(entry: string): string {
    if (entry === "all") return "Бүх гишүүд";
    if (entry.startsWith("team:")) {
      const key = entry.slice(5) as Team;
      return TEAM_LABELS[key] ?? entry;
    }
    const member = members.find((m) => m.uid === entry);
    return member?.name ?? entry;
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <h1 className="text-xl font-bold sm:text-2xl">Даалгавар удирдах</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Plus className="size-4" />
            Даалгавар үүсгэх
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateTask} className="grid gap-4">
            <div className="grid gap-2">
              <Label>Гарчиг</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Даалгаврын гарчиг"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Тайлбар</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Даалгаврын тайлбар"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Оноо</Label>
                <Input
                  type="number"
                  min={0}
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Дуусах хугацаа</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" type="button" className="w-full justify-start">
                      <CalendarIcon className="mr-2 size-4" />
                      {dueDate
                        ? dueDate.toLocaleDateString()
                        : "Огноо сонгох"}
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
              <Label>Хэнд хамааруулах</Label>
              <Select
                value={assignmentTarget}
                onValueChange={(v) => setAssignmentTarget(v as "all" | "team" | "member")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Зорилтот бүлэг сонгох" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Бүх гишүүд</SelectItem>
                  <SelectItem value="team">Тодорхой баг</SelectItem>
                  <SelectItem value="member">Тодорхой гишүүн</SelectItem>
                </SelectContent>
              </Select>

              {assignmentTarget === "team" && (
                <Select
                  value={selectedTeam}
                  onValueChange={(v) => setSelectedTeam(v as Team)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Баг сонгох" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TEAM_LABELS) as Team[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {TEAM_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {assignmentTarget === "member" && (
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
            <Button type="submit" disabled={saving} className="w-full sm:w-fit">
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Үүсгэх
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Байгаа даалгаврууд</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile card view */}
          <div className="space-y-3 sm:hidden">
            {tasks.map((task) => (
              <div key={task.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm">{task.title}</p>
                  <Badge variant={task.status === "completed" ? "default" : "secondary"}>
                    {task.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {task.assignedTo.length === 0 ? (
                    <Badge variant="secondary">None</Badge>
                  ) : (
                    task.assignedTo.map((entry) => (
                      <Badge key={entry} variant="outline">
                        {resolveAssignedLabel(entry)}
                      </Badge>
                    ))
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {task.points} pts
                  </span>
                  {task.assignedTo.some((id) => id !== "all" && !id.startsWith("team:")) && (
                    <div className="flex flex-wrap gap-1">
                      {task.assignedTo
                        .filter((id) => id !== "all" && !id.startsWith("team:"))
                        .map((uid) => (
                          <Button
                            key={uid}
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveTask(task, uid)}
                          >
                            <CheckCircle2 className="mr-1 size-3" />
                            {resolveAssignedLabel(uid)}
                          </Button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Даалгавар</TableHead>
                  <TableHead>Хэнд</TableHead>
                  <TableHead>Оноо</TableHead>
                  <TableHead>Төлөв</TableHead>
                  <TableHead className="text-right">Үйлдэл</TableHead>
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
                    <Badge variant="secondary">Хоосон</Badge>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {task.assignedTo.map((entry) => (
                            <Badge key={entry} variant="outline">
                              {resolveAssignedLabel(entry)}
                            </Badge>
                          ))}
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
                      {task.assignedTo.some((id) => id !== "all" && !id.startsWith("team:")) && (
                        <div className="flex flex-wrap justify-end gap-1">
                          {task.assignedTo
                            .filter((id) => id !== "all" && !id.startsWith("team:"))
                            .map((uid) => (
                              <Button
                                key={uid}
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleApproveTask(task, uid)
                                }
                              >
                                <CheckCircle2 className="mr-1 size-3" />
                                {resolveAssignedLabel(uid)}
                              </Button>
                            ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {tasks.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              Одоогоор даалгавар байхгүй байна
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
