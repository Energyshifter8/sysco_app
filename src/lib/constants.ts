export const MAJORS = [
  { value: "computer_science", label: "Компьютерын ухаан" },
  { value: "software_engineering", label: "Програм хангамж" },
  { value: "artificial_intelligence", label: "Хиймэл оюун ухаан" },
  { value: "data_science", label: "Өгөгдлийн ухаан" },
  { value: "cyber_security", label: "Кибер аюулгүй байдал" },
  { value: "network_engineering", label: "Мэдээлэл, холбоо сүлжээний инженерчлэл" },
  { value: "iot_technology", label: "IoT технологи" },
  { value: "information_technology", label: "Мэдээллийн технологи" },
  { value: "information_systems", label: "Мэдээллийн систем" },
  { value: "multimedia", label: "Мультимедиа" },
] as const;

export type MajorValue = (typeof MAJORS)[number]["value"];

export function getMajorLabel(value: string): string {
  const match = MAJORS.find((m) => m.value === value);
  return match ? match.label : value;
}
