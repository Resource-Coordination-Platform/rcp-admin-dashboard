"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/format";
import { NAV_ITEMS } from "./nav";

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-slate-100 transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 shadow-lg shadow-brand-600/30">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-white">RCP Admin</p>
              <p className="text-[11px] text-sidebar-muted">
                Resource Coordination
              </p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-sidebar-hover hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Coordination
          </p>
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium transition-colors",
                  active
                    ? "bg-brand-600 text-white shadow-lg shadow-brand-600/20"
                    : "text-slate-300 hover:bg-sidebar-hover hover:text-white",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    active ? "text-white" : "text-slate-400 group-hover:text-white",
                  )}
                />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        {/* <div className="border-t border-white/5 p-4">
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-xs font-medium text-white">Need help?</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-sidebar-muted">
              Review the API docs at{" "}
              <span className="text-brand-300">/docs</span> on each service.
            </p>
          </div>
        </div> */}
      </aside>
    </>
  );
}
