"use client";

import { useState } from "react";
import {
  BadgeCheck,
  Mail,
  Phone,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useAdminResetUserPassword, useRegisterCoordinator } from "@/lib/hooks";
import { ApiError } from "@/lib/api";
import { colorFromString, initials, relativeTime } from "@/lib/format";
import type { UserRead } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
} from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

export default function TeamPage() {
  const { profile, claims } = useAuth();
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState<UserRead[]>([]);
  const [resetTarget, setResetTarget] = useState<UserRead | null>(null);
  const canResetPasswords = claims?.roles.includes("super_admin") ?? false;

  return (
    <div>
      <PageHeader
        title="Team"
        description="Provision coordinators who help triage requests, manage inventory and dispatch volunteers."
        actions={
          <Button onClick={() => setOpen(true)} disabled={!profile?.tenantSlug}>
            <UserPlus className="h-4 w-4" />
            Add coordinator
          </Button>
        }
      />

      {/* Role explainer */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Tenant Admin</p>
              <Badge tone="brand">Full access</Badge>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Manages categories, inventory, requests, disaster events and the
            team. Provisioned during tenant onboarding.
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Coordinator</p>
              <Badge tone="purple">Operational</Badge>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Handles day-to-day triage: managing requests, inventory items,
            volunteer dispatch and events. Cannot create categories.
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Coordinators added this session"
          description="The directory API is not exposed to the portal; newly-created coordinators appear here until you reload."
        />
        {added.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No coordinators added yet"
            description="Invite a coordinator to share the operational workload."
            action={
              <Button onClick={() => setOpen(true)} disabled={!profile?.tenantSlug}>
                <UserPlus className="h-4 w-4" />
                Add coordinator
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {added.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-5 py-4">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: colorFromString(u.full_name) }}
                >
                  {initials(u.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-medium text-slate-900">
                    {u.full_name}
                    <BadgeCheck className="h-4 w-4 text-emerald-500" />
                  </p>
                  <p className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {u.email}
                    </span>
                    {u.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {u.phone}
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <Badge tone="purple">Coordinator</Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {relativeTime(u.created_at)}
                  </p>
                  {canResetPasswords && (
                    <button
                      onClick={() => setResetTarget(u)}
                      className="mt-2 text-xs font-medium text-brand-600 hover:underline"
                    >
                      Reset password
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {open && profile?.tenantSlug && (
        <AddCoordinatorModal
          tenantSlug={profile.tenantSlug}
          onClose={() => setOpen(false)}
          onCreated={(u) => setAdded((prev) => [u, ...prev])}
        />
      )}

        {resetTarget && canResetPasswords && (
          <ResetPasswordModal
            user={resetTarget}
            onClose={() => setResetTarget(null)}
          />
        )}
    </div>
  );
}

function AddCoordinatorModal({
  tenantSlug,
  onClose,
  onCreated,
}: {
  tenantSlug: string;
  onClose: () => void;
  onCreated: (u: UserRead) => void;
}) {
  const toast = useToast();
  const register = useRegisterCoordinator(tenantSlug);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  async function submit() {
    try {
      const user = await register.mutateAsync({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
      });
      toast.success("Coordinator added", `${fullName} can now sign in.`);
      onCreated(user);
      onClose();
    } catch (err) {
      toast.error(
        "Could not add coordinator",
        err instanceof ApiError ? err.detail : "Unexpected error",
      );
    }
  }

  const valid =
    fullName.trim() && email.trim().includes("@") && password.length >= 10;

  return (
    <Modal
      open
      onClose={onClose}
      title="Add a coordinator"
      description={`They'll be able to sign in to the "${tenantSlug}" console.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={register.isPending}
            disabled={!valid}
            onClick={submit}
          >
            Create coordinator
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Full name" required>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Coordinator name"
          />
        </Field>
        <Field label="Email" required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="coordinator@example.org"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
            />
          </Field>
          <Field
            label="Temp password"
            required
            hint="Min 10 characters"
          >
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Share securely"
            />
          </Field>
        </div>
        <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          Share this temporary password with the coordinator over a secure
          channel. They can change it after signing in.
        </div>
      </div>
    </Modal>
  );
}

function ResetPasswordModal({
  user,
  onClose,
}: {
  user: UserRead;
  onClose: () => void;
}) {
  const toast = useToast();
  const resetPassword = useAdminResetUserPassword();
  const [newPassword, setNewPassword] = useState("");

  async function submit() {
    try {
      const result = await resetPassword.mutateAsync({
        userId: user.id,
        body: { new_password: newPassword },
      });
      toast.success(
        "Temporary password reset",
        `Shared with ${user.full_name}. User ID: ${result.user_id}`,
      );
      onClose();
    } catch (err) {
      toast.error(
        "Could not reset password",
        err instanceof ApiError ? err.detail : "Unexpected error",
      );
    }
  }

  const valid = newPassword.length >= 10;

  return (
    <Modal
      open
      onClose={onClose}
      title="Reset user password"
      description={`Create a temporary password for ${user.full_name}.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={resetPassword.isPending} disabled={!valid} onClick={submit}>
            Reset password
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          Share the temporary password securely. The user can change it after
          signing in.
        </div>
        <Field label="Temporary password" required hint="At least 10 characters">
          <Input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="temp-password-123"
          />
        </Field>
      </div>
    </Modal>
  );
}
