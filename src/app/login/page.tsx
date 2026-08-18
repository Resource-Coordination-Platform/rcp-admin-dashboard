"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Boxes,
  LifeBuoy,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth";   // react hook for authentication
import { ApiError } from "@/lib/api";
import { Button, Field, Input } from "@/components/ui/primitives";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, isLoading, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();   // stops the browser refresh
    setError(null);
    setSubmitting(true);
    try {
      await login(tenantSlug.trim(), email.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401
            ? "Invalid tenant, email or password."
            : err.detail,
        );
      } else {
        setError("Unable to reach the server. Is the gateway running?");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left: brand / value panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-sidebar p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(60rem 60rem at 20% -10%, rgba(53,99,255,0.35), transparent), radial-gradient(50rem 50rem at 90% 110%, rgba(53,99,255,0.25), transparent)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 shadow-lg shadow-brand-600/40">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold">Resource Coordination Platform</p>
            <p className="text-sm text-sidebar-muted">Tenant Admin Console</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-semibold leading-tight">
            Coordinate relief when every minute counts.
          </h1>
          <p className="mt-4 text-slate-300">
            Triage requests, track inventory, dispatch volunteers and broadcast
            disaster events all from one command center.
          </p>

          <div className="mt-8 space-y-4">
            {[
              { icon: LifeBuoy, text: "Real-time request intake & triage" },
              { icon: Boxes, text: "Inventory with live reservations" },
              { icon: Radio, text: "District-aware volunteer broadcasting" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4 text-brand-300" />
                </div>
                <span className="text-sm text-slate-200">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-slate-400">
          Multi-tenant · Event-driven · Offline-first
        </p>
      </div>

      {/* Right: form */}
      <div className="flex w-full items-center justify-center bg-background px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <p className="font-semibold text-slate-900">RCP Admin</p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Welcome back
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to your organization's admin console.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <Field label="Organization slug" required hint="e.g. kolonnawa">
              <Input
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                placeholder="relief-org-lk"
                autoComplete="organization"
                required
              />
            </Field>
            <Field label="Email" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@relief-org.lk"
                autoComplete="email"
                required
              />
            </Field>
            <Field label="Password" required>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="securepass123"
                autoComplete="current-password"
                required
              />
            </Field>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              loading={submitting}
              className="w-full"
            >
              Sign in
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Portal access is provisioned by your platform operator during tenant
            onboarding.
          </p>
        </div>
      </div>
    </div>
  );
}
