"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Boxes,
  LifeBuoy,
  Radio,
  ShieldCheck,
  Building2,
  ShieldAlert,
  Power,
} from "lucide-react";
import { useAuth } from "@/lib/auth"; // react hook for authentication
import { ApiError } from "@/lib/api";
import { Button, Field, Input } from "@/components/ui/primitives";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [tenantSlug, setTenantSlug] = useState("");
  const [tenantInfo, setTenantInfo] = useState<{
    name: string;
    status: string;
  } | null>(null);
  const [tenantLoading, setTenantLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<
    "INVALID_CREDENTIALS" | "TENANT_SUSPENDED" | "USER_DISABLED" | null
  >(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Debounced Tenant Lookup when user types tenantSlug
  useEffect(() => {
    const slug = tenantSlug.trim().toLowerCase();
    if (!slug) {
      setTenantInfo(null);
      return;
    }
    const timer = setTimeout(async () => {
      const formattedName = slug
        .split("-")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" ");
      setTenantInfo({ name: formattedName, status: "active" });
    }, 300);
    return () => clearTimeout(timer);
  }, [tenantSlug]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); // stops the browser refresh
    setError(null);
    setErrorCode(null);
    setSubmitting(true);

    try {
      await login(tenantSlug.trim(), email.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        if (
          err.status === 403 ||
          err.detail.toLowerCase().includes("suspended")
        ) {
          setErrorCode("TENANT_SUSPENDED");
          setError(
            "Organization account has been suspended. Please contact platform administration.",
          );
        } else if (err.detail.toLowerCase().includes("disabled")) {
          setErrorCode("USER_DISABLED");
          setError("Your user account is disabled. Access revoked.");
        } else {
          setErrorCode("INVALID_CREDENTIALS");
          setError(
            err.status === 401
              ? "Invalid tenant, email or password."
              : err.detail,
          );
        }
      } else {
        setError("Unable to reach the server. Is the gateway running?");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'linear-gradient(135deg, #fff7f2 0%, #ffe8d9 25%, #fff1eb 50%, #ffecd6 75%, #fff5ee 100%)' }}>
      {/* Left: brand / value panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-sidebar p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(60rem 60rem at 20% -10%, rgba(11,114,97,0.40), transparent), radial-gradient(50rem 50rem at 90% 110%, rgba(11,114,97,0.25), transparent)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 p-1.5 backdrop-blur shadow-lg shadow-brand-600/40">
            <img src="/logo.png" alt="RCP Logo" className="h-full w-full object-contain rounded-lg" />
          </div>
          <div>
            <p className="font-bold text-base text-white">
              Sahasra Resource Coordination Platform
            </p>
            <p className="text-xs text-sidebar-muted">Tenant Admin Console</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            Coordinate relief when every minute counts.
          </h1>
          <p className="mt-4 text-slate-300 text-sm leading-relaxed">
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
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2" style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(40px) saturate(1.8)', WebkitBackdropFilter: 'blur(40px) saturate(1.8)' }}>
        <div className="glass-card w-full max-w-sm rounded-2xl p-8">
          {/* Brand header */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 p-1.5 ring-1 ring-brand-200 shadow-sm">
              <img src="/logo.png" alt="RCP Logo" className="h-full w-full object-contain rounded-lg" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-lg leading-tight">RCP Admin</p>
              <p className="text-xs text-muted-foreground">Resource Coordination Platform</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to your organization's admin console.
          </p>

          {/* Dynamic Branding Display **/}
          {tenantInfo && (
            <div className="glass-card mt-6 flex items-center gap-3 rounded-xl border border-brand-200 p-3 transition-all">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] text-brand-600 font-bold uppercase tracking-wider">
                  Organization Target
                </p>
                <p className="text-xs font-bold text-slate-900">
                  {tenantInfo.name}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <Field label="Organization slug" required >
              <Input
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                autoComplete="organization"
                required
              />
            </Field>
            <Field label="Email" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </Field>
            <Field label="Password" required>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="............"
                autoComplete="current-password"
                required
              />
            </Field>

            {/* Error & Warning Badges */}
            {error && (
              <div
                className={
                  "glass-toast rounded-xl border p-3.5 text-sm flex items-start gap-2.5 shadow-sm " +
                  (errorCode === "TENANT_SUSPENDED"
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : errorCode === "USER_DISABLED"
                      ? "border-red-300 bg-red-50 text-red-900"
                      : "border-red-200 bg-red-50 text-red-700")
                }
              >
                {errorCode === "TENANT_SUSPENDED" ? (
                  <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                ) : errorCode === "USER_DISABLED" ? (
                  <Power className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
                ) : null}
                <div>
                  <p className="font-semibold text-xs uppercase tracking-wider">
                    {errorCode === "TENANT_SUSPENDED"
                      ? "TENANT_SUSPENDED"
                      : errorCode === "USER_DISABLED"
                        ? "USER_DISABLED"
                        : "Authentication Failed"}
                  </p>
                  <p className="text-xs mt-0.5 opacity-90">{error}</p>
                </div>
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

         
        </div>
      </div>
    </div>
  );
}
