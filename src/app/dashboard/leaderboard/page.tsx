"use client";

import { useLeaderboard } from "@/hooks/useLeaderboard";
import { getInitials } from "@/lib/utils";
import { Loader2 } from "lucide-react";

function rankMedal(i: number) {
  if (i === 0) return { color: "#FBBF24", label: "#1" };
  if (i === 1) return { color: "#9CA3AF", label: "#2" };
  if (i === 2) return { color: "#CD7F32", label: "#3" };
  return { color: "#4B5563", label: `#${i + 1}` };
}

function getMajorLabel(major?: string | null): string {
  if (!major) return "";
  const map: Record<string, string> = {
    computer_science: "Компьютерын ухаан",
    software_engineering: "Програм хангамж",
    artificial_intelligence: "Хиймэл оюун ухаан",
    data_science: "Өгөгдлийн ухаан",
    cyber_security: "Кибер аюулгүй байдал",
    network_engineering: "Мэдээлэл, холбоо сүлжээний инженерчлэл",
    iot_technology: "IoT технологи",
    information_technology: "Мэдээллийн технологи",
    information_systems: "Мэдээллийн систем",
    multimedia: "Мультимедиа",
  };
  return map[major] || major;
}

export default function LeaderboardPage() {
  const { entries, loading } = useLeaderboard();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const topThree = entries.slice(0, 3);
  const podiumOrders = [1, 0, 2];
  const podiumHeights = ["120px", "96px", "84px"];

  return (
    <div style={{ maxWidth: "800px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontFamily: "var(--font-jetbrains)",
            fontSize: "1.3rem",
            fontWeight: 800,
            color: "#E8E8E8",
            letterSpacing: "-0.02em",
          }}
        >
          ЭРЭМБЭЛЭЛТ
        </h1>
        <p
          style={{
            color: "#6B7280",
            fontSize: "0.75rem",
            fontFamily: "var(--font-jetbrains)",
            marginTop: "4px",
          }}
        >
          {entries.length} ГИШҮҮН
        </p>
      </div>

      {/* Top 3 podium */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "32px" }}>
        {topThree.map((m, i) => {
          const medal = rankMedal(i);
          return (
            <div
              key={m.uid}
              style={{
                flex: 1,
                border: `1px solid ${medal.color}40`,
                borderRadius: "4px",
                background: `${medal.color}10`,
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                minHeight: podiumHeights[i],
                order: podiumOrders[i],
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "8px",
                  background: `${medal.color}25`,
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.65rem",
                  color: medal.color,
                  fontWeight: 800,
                }}
              >
                {getInitials(m.name)}
              </div>
              <p
                style={{
                  color: "#E8E8E8",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  fontFamily: "var(--font-barlow)",
                  textAlign: "center",
                }}
              >
                {m.name}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-barlow-condensed)",
                  fontWeight: 800,
                  fontSize: "1.5rem",
                  color: medal.color,
                  lineHeight: 1.1,
                }}
              >
                {m.totalPoints}
              </p>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.7rem",
                  color: medal.color,
                  fontWeight: 800,
                }}
              >
                {medal.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div
        style={{
          border: "1px solid rgba(255, 255, 255, 0.07)",
          background: "#141414",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "40px 1fr 120px 100px 80px",
            padding: "12px 16px",
            background: "#0F0F0F",
            borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
          }}
        >
          {["#", "ГИШҮҮН", "ЧИГЛЭЛ", "ДААЛГАВАР", "ОНШ"].map((h) => (
            <span
              key={h}
              style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "0.6rem",
                color: "#6B7280",
                letterSpacing: "0.1em",
              }}
            >
              {h}
            </span>
          ))}
        </div>
        {/* Rows */}
        {entries.map((m, i) => {
          const medal = rankMedal(i);
          return (
            <div
              key={m.uid}
              style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 120px 100px 80px",
                padding: "12px 16px",
                alignItems: "center",
                borderBottom:
                  i < entries.length - 1 ? "1px solid rgba(255, 255, 255, 0.04)" : "none",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#1A1A1A")}
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "transparent")
              }
            >
              <span
                style={{
                  fontFamily: "var(--font-jetbrains)",
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  color: medal.color,
                }}
              >
                {medal.label}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(139, 92, 246, 0.125)",
                    fontFamily: "var(--font-jetbrains)",
                    fontSize: "0.55rem",
                    color: "#8B5CF6",
                    fontWeight: 700,
                  }}
                >
                  {getInitials(m.name)}
                </div>
                <span
                  style={{
                    color: "#E8E8E8",
                    fontSize: "0.85rem",
                    fontFamily: "var(--font-barlow)",
                    fontWeight: 600,
                  }}
                >
                  {m.name}
                </span>
                {m.role === "admin" && (
                  <span
                    style={{
                      background: "rgba(139, 92, 246, 0.125)",
                      border: "1px solid rgba(139, 92, 246, 0.25)",
                      borderRadius: "2px",
                      padding: "1px 5px",
                      fontSize: "0.55rem",
                      color: "#8B5CF6",
                      fontFamily: "var(--font-jetbrains)",
                    }}
                  >
                    ADM
                  </span>
                )}
              </div>
              <span
                style={{
                  color: "#6B7280",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-barlow)",
                }}
              >
                {getMajorLabel(m.major).split(" ")[0]}
              </span>
              <span
                style={{
                  color: "#6B7280",
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "0.8rem",
                }}
              >
                -
              </span>
              <span
                style={{
                  fontFamily: "var(--font-barlow-condensed)",
                  fontWeight: 800,
                  fontSize: "1rem",
                  color: medal.color,
                }}
              >
                {m.totalPoints}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
