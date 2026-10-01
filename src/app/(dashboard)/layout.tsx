"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { NAV_ITEMS } from "@/components/layout/nav";
import { Topbar } from "@/components/layout/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  const pathname = usePathname();
  const forbidden = !hasRole("tenant_admin") && NAV_ITEMS.some((item) => item.adminOnly && (pathname === item.href || pathname.startsWith(item.href + "/")));
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && forbidden) router.replace("/dashboard");
  }, [isLoading, isAuthenticated, forbidden, router]);

  if (isLoading || !isAuthenticated || forbidden) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Decorative gradient orbs for glass refraction */}
      <div className="glass-bg-orbs" aria-hidden="true">
        <div className="glass-bg-orb-3" />
      </div>

      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="relative z-10 lg:pl-64">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
