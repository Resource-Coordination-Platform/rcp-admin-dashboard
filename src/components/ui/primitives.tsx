"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/format";

// ---------------- Button ----------------
type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "subtle";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800",
  secondary:
    "bg-slate-900 text-white shadow-sm hover:bg-slate-800 active:bg-slate-950",
  outline:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800",
  subtle: "bg-brand-50 text-brand-700 hover:bg-brand-100",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-6 text-sm gap-2",
  icon: "h-9 w-9",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading, children, disabled, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "focus-ring inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

// ---------------- Card ----------------
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface shadow-card",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  title,
  description,
  action,
}: {
  className?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-border px-5 py-4",
        className,
      )}
    >
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// ---------------- Badge ----------------
type Tone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple";

const BADGE_TONES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
  purple: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function Badge({
  tone = "neutral",
  className,
  dot,
  children,
}: {
  tone?: Tone;
  className?: string;
  dot?: boolean;
  children: React.ReactNode;
}) {
  const dotColor: Record<Tone, string> = {
    neutral: "bg-slate-400",
    brand: "bg-brand-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    info: "bg-sky-500",
    purple: "bg-violet-500",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        BADGE_TONES[tone],
        className,
      )}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", dotColor[tone])} />
      )}
      {children}
    </span>
  );
}

// ---------------- Inputs ----------------
export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "focus-ring h-10 w-full rounded-lg border border-input bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "focus-ring min-h-[80px] w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "select-caret focus-ring h-10 w-full appearance-none rounded-lg border border-input bg-white px-3 pr-9 text-sm text-slate-900",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export function Label({
  className,
  children,
  required,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-sm font-medium text-slate-700",
        className,
      )}
      {...props}
    >
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

// ---------------- Skeleton ----------------
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} />;
}

// ---------------- Empty state ----------------
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ---------------- Progress bar ----------------
export function Progress({
  value,
  tone = "brand",
  className,
}: {
  value: number;
  tone?: "brand" | "success" | "warning" | "danger";
  className?: string;
}) {
  const colors = {
    brand: "bg-brand-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
  };
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}
    >
      <div
        className={cn("h-full rounded-full transition-all", colors[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
