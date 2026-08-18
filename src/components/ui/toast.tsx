"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import { cn } from "@/lib/format";

type ToastVariant = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (t: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: TriangleAlert,
};

const STYLES: Record<ToastVariant, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-brand-200 bg-brand-50 text-brand-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
};

const ICON_STYLES: Record<ToastVariant, string> = {
  success: "text-emerald-600",
  error: "text-red-600",
  info: "text-brand-600",
  warning: "text-amber-600",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
  }, []);

  const value: ToastContextValue = {
    toast,
    success: (title, description) =>
      toast({ title, description, variant: "success" }),
    error: (title, description) =>
      toast({ title, description, variant: "error" }),
    info: (title, description) => toast({ title, description, variant: "info" }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDone={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 4500);
    return () => clearTimeout(timer);
  }, [onDone]);

  const Icon = ICONS[toast.variant];

  return (
    <div
      className={cn(
        "pointer-events-auto flex animate-fade-in items-start gap-3 rounded-xl border p-4 shadow-elevated",
        STYLES[toast.variant],
      )}
      role="status"
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", ICON_STYLES[toast.variant])} />
      <div className="flex-1">
        <p className="text-sm font-semibold">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-sm opacity-80">{toast.description}</p>
        )}
      </div>
      <button
        onClick={onDone}
        className="rounded-md p-0.5 opacity-50 transition hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
