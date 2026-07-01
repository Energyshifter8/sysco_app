"use client";

import { Loader2, Trophy, Medal, CheckSquare } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLeaderboard } from "@/hooks/useLeaderboard";
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

export default function DashboardPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const { entries, loading: leaderboardLoading } = useLeaderboard();

  if (authLoading || !user || !userData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const userRank = entries.find((e) => e.uid === user.uid)?.rank ?? "-";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Your Points
            </CardTitle>
            <Trophy className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{userData.totalPoints}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rank
            </CardTitle>
            <Medal className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {leaderboardLoading ? (
                <Loader2 className="size-6 animate-spin" />
              ) : (
                `#${userRank}`
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed Tasks
            </CardTitle>
            <CheckSquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboardLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No users found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow
                    key={entry.uid}
                    className={
                      entry.uid === user.uid ? "bg-accent font-medium" : ""
                    }
                  >
                    <TableCell>#{entry.rank}</TableCell>
                    <TableCell>
                      {entry.name}
                      {entry.uid === user.uid && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (You)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{entry.course || "-"}</TableCell>
                    <TableCell className="text-right">
                      {entry.totalPoints}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
