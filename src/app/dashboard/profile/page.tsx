"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COURSE_OPTIONS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "5th Year",
  "Graduate",
];

const MAJOR_OPTIONS = [
  "Software Engineering",
  "Data Science",
  "Cybersecurity",
  "AI & Machine Learning",
  "Cloud Computing",
  "Networking",
  "Other",
];

export default function ProfilePage() {
  const { user, userData, loading } = useAuth();
  const [course, setCourse] = useState(userData?.course ?? "");
  const [major, setMajor] = useState(userData?.major ?? "");
  const [saving, setSaving] = useState(false);

  if (loading || !user || !userData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, { course, major });
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 sm:space-y-6">
      <h1 className="text-xl font-bold sm:text-2xl">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={userData.name} disabled />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input value={user.email ?? ""} disabled />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Role</Label>
              <Input value={userData.role} disabled className="capitalize" />
            </div>
            <div className="grid gap-2">
              <Label>Total Points</Label>
              <Input value={userData.totalPoints} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>Customize your academic details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>Course / Level</Label>
            <Select value={course} onValueChange={setCourse}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select your course" />
              </SelectTrigger>
              <SelectContent>
                {COURSE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Major / Track</Label>
            <Select value={major} onValueChange={setMajor}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select your major" />
              </SelectTrigger>
              <SelectContent>
                {MAJOR_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
