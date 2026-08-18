import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(input: string | null | undefined): string {
  if (!input) return "—";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(input: string | null | undefined): string {
  if (!input) return "—";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(input: string | null | undefined): string {
  if (!input) return "—";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (mins < 1) return "just now";
  if (mins < 60) return rtf.format(Math.sign(diff) * mins, "minute");
  const hours = Math.round(mins / 60);
  if (hours < 24) return rtf.format(Math.sign(diff) * hours, "hour");
  const days = Math.round(hours / 24);
  if (days < 30) return rtf.format(Math.sign(diff) * days, "day");
  const months = Math.round(days / 30);
  return rtf.format(Math.sign(diff) * months, "month");
}

export function humanizeSkill(skill: string): string {
  return skill
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function pct(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.min(100, Math.round((numerator / denominator) * 100));
}

// Deterministic pleasant color for avatars/tags based on a string seed.
export function colorFromString(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 45%)`;
}
