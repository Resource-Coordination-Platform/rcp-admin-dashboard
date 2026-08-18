"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { initials } from "@/lib/format";
import { NAV_ITEMS } from "./nav";
import { ProfileSecurityModal } from "@/components/features/profile-security-modal";

function currentTitle(pathname: string): string {
  const match = NAV_ITEMS.find(
    (i) =>
      pathname === i.href ||
      (i.href !== "/dashboard" && pathname.startsWith(i.href)),
  );
  return match?.label ?? "Overview";
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const { profile, claims, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const email = profile?.email ?? "admin";
  const name = profile?.full_name?.trim() || email.split("@")[0];
  const role =
    claims?.roles.includes("tenant_admin")
      ? "Tenant Admin"
      : claims?.roles[0] ?? "member";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur lg:px-8">
      <button
        onClick={onMenu}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1">
        <h2 className="text-sm font-semibold text-slate-900 lg:text-base">
          {currentTitle(pathname)}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Live
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-slate-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {initials(name)}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold leading-tight text-slate-900">
                {name}
              </p>
              <p className="text-[11px] leading-tight text-muted-foreground">
                {role}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {menuOpen && (
            <>
            <div
              className="fixed inset-0 z-30"
              aria-hidden
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-full z-40 mt-2 w-60 animate-scale-in rounded-xl border border-border bg-surface p-1.5 shadow-elevated">
              <div className="border-b border-border px-3 py-2.5">
                <p className="text-sm font-medium text-slate-900">{email}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />
                  {profile?.tenantSlug
                    ? `Tenant: ${profile.tenantSlug}`
                    : "Tenant admin"}
                </p>
              </div>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setProfileOpen(true);
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <UserRound className="h-4 w-4" />
                Profile & security
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
            </>
          )}
        </div>
      </div>
      <ProfileSecurityModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
    </header>
  );
}
