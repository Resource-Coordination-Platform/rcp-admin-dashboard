"use client";

import { useState } from "react";
import {
  BadgeCheck,
  Mail,
  Phone,
  ShieldCheck,
  UserPlus,
  Users,
  Edit2,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { 
  useCoordinators, 
  useRegisterCoordinator,
  useUpdateCoordinator,
  useDeleteCoordinator,
} from "@/lib/hooks";
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
  Skeleton,
} from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

export default function TeamPage() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRead | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRead | null>(null);
  const { data: coordinators, isLoading } = useCoordinators();
  const isAdmin = profile?.user_type === "TENANT_ADMIN";
  
  const updateMutation = useUpdateCoordinator();
  const deleteMutation = useDeleteCoordinator();
  const toast = useToast();

  return (
    <div>
      <PageHeader
        title="Team"
        description="Provision coordinators who help triage requests, manage inventory and dispatch volunteers."
        actions={
          isAdmin ? (
            <Button onClick={() => setOpen(true)} disabled={!profile?.tenantSlug}>
              <UserPlus className="h-4 w-4" />
              Add coordinator
            </Button>
          ) : undefined
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
          title="Team Members"
          description="All coordinators and admins in your organization."
        />
        {isLoading ? (
          <div className="space-y-3 p-5">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !coordinators || coordinators.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No coordinators added yet"
            description="Invite a coordinator to share the operational workload."
            action={
              isAdmin ? (
                <Button
                  onClick={() => setOpen(true)}
                  disabled={!profile?.tenantSlug}
                >
                  <UserPlus className="h-4 w-4" />
                  Add coordinator
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {coordinators.map((u) => (
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
                <div className="flex flex-col items-end gap-2 text-right">
                  <div className="flex items-center gap-2">
                    <Badge tone={u.user_type === "TENANT_ADMIN" ? "brand" : "purple"}>
                      {u.user_type === "TENANT_ADMIN" ? "Admin" : "Coordinator"}
                    </Badge>
                    {isAdmin && profile?.id !== u.id && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditUser(u)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteUser(u)}
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Joined {relativeTime(u.created_at)}
                  </p>
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
          onCreated={() => {}}
        />
      )}

      {editUser && (
        <EditCoordinatorModal
          user={editUser}
          onClose={() => setEditUser(null)}
          updateMutation={updateMutation}
        />
      )}

      {deleteUser && (
        <Modal
          open
          onClose={() => setDeleteUser(null)}
          title="Remove coordinator?"
          description={`Are you sure you want to remove ${deleteUser.full_name}? They will no longer be able to access the console.`}
          footer={
            <>
              <Button variant="outline" onClick={() => setDeleteUser(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={deleteMutation.isPending}
                onClick={async () => {
                  try {
                    await deleteMutation.mutateAsync(deleteUser.id);
                    toast.success("Coordinator removed", "They no longer have access.");
                    setDeleteUser(null);
                  } catch (err) {
                    toast.error("Error", "Could not remove coordinator.");
                  }
                }}
              >
                Remove
              </Button>
            </>
          }
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
          <Field label="Temp password" required hint="Min 10 characters">
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

function EditCoordinatorModal({
  user,
  onClose,
  updateMutation,
}: {
  user: UserRead;
  onClose: () => void;
  updateMutation: ReturnType<typeof useUpdateCoordinator>;
}) {
  const toast = useToast();
  const [fullName, setFullName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone || "");

  async function submit() {
    try {
      await updateMutation.mutateAsync({
        userId: user.id,
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
      });
      toast.success("Coordinator updated", "Their profile has been saved.");
      onClose();
    } catch (err) {
      toast.error(
        "Could not update coordinator",
        err instanceof ApiError ? err.detail : "Unexpected error",
      );
    }
  }

  const valid = fullName.trim().length > 0;

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit coordinator"
      description={`Update profile details for ${user.email}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={updateMutation.isPending}
            disabled={!valid}
            onClick={submit}
          >
            Save changes
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
        <Field label="Phone">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Optional"
          />
        </Field>
      </div>
    </Modal>
  );
}
