"use client";

import { cn } from "@/lib/format";
import { Skeleton } from "./primitives";

type Accent = "brand" | "emerald" | "amber" | "red" | "sky" | "violet" | "slate";

const ACCENTS: Record<Accent, { bg: string; fg: string; ring: string }> = {
  brand: { bg: "bg-brand-50", fg: "text-brand-600", ring: "ring-brand-100" },
  emerald: { bg: "bg-emerald-50", fg: "text-emerald-600", ring: "ring-emerald-100" },
  amber: { bg: "bg-amber-50", fg: "text-amber-600", ring: "ring-amber-100" },
  red: { bg: "bg-red-50", fg: "text-red-600", ring: "ring-red-100" },
  sky: { bg: "bg-sky-50", fg: "text-sky-600", ring: "ring-sky-100" },
  violet: { bg: "bg-violet-50", fg: "text-violet-600", ring: "ring-violet-100" },
  slate: { bg: "bg-slate-100", fg: "text-slate-600", ring: "ring-slate-200" },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "brand",
  hint,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  accent?: Accent;
  hint?: React.ReactNode;
  loading?: boolean;
}) {
  const a = ACCENTS[accent];
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-inset",
            a.bg,
            a.fg,
            a.ring,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-20" />
      ) : (
        <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          {value}
        </p>
      )}
      {hint && !loading && (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
