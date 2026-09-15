"use client";

import { useMemo, useState } from "react";
import { KeyRound, Mail, Search, ShieldAlert, ShieldCheck, UserX, Users } from "lucide-react";
import { useAdminResetUserPassword } from "@/lib/hooks";
import type { UserType } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, EmptyState, Input, Select, Button, Badge } from "@/components/ui/primitives";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

interface GlobalUser {
  id: string;
  tenant_slug: string | null;
  full_name: string;
  email: string;
  user_type: UserType;
  status: "ACTIVE" | "DISABLED";
  created_at: string;
}

const MOCK_GLOBAL_USERS: GlobalUser[] = [
  {
    id: "usr-001",
    tenant_slug: "kolonnawa",
    full_name: "Saman Perera",
    email: "admin@kolonnawa-aid.org",
    user_type: "TENANT_ADMIN",
    status: "ACTIVE",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
  {
    id: "usr-002",
    tenant_slug: "kolonnawa",
    full_name: "Kamal Fernando",
    email: "coordinator@kolonnawa-aid.org",
    user_type: "COORDINATOR",
    status: "ACTIVE",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
  },
  {
    id: "usr-003",
    tenant_slug: "redcross-colombo",
    full_name: "Nimal Wickramasinghe",
    email: "nimal@redcross.lk",
    user_type: "TENANT_ADMIN",
    status: "ACTIVE",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
  },
  {
    id: "usr-004",
    tenant_slug: null, // Global user
    full_name: "Sunil Shantha",
    email: "sunil.field@gmail.com",
    user_type: "VOLUNTEER",
    status: "ACTIVE",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
];

export default function GlobalUsersPage() {
  const toast = useToast();
  const resetPasswordMutation = useAdminResetUserPassword();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [userList, setUserList] = useState<GlobalUser[]>(MOCK_GLOBAL_USERS);
  const [resetUser, setResetUser] = useState<GlobalUser | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return userList.filter((u) => {
      const matchRole = roleFilter === "all" || u.user_type === roleFilter;
      const matchSearch =
        !q ||
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.tenant_slug && u.tenant_slug.toLowerCase().includes(q));
      return matchRole && matchSearch;
    });
  }, [userList, roleFilter, search]);

  const toggleUserStatus = (userId: string) => {
    setUserList((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const nextStatus = u.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
          toast.success(
            "User Status Updated",
            `${u.full_name} is now ${nextStatus.toLowerCase()}.`
          );
          return { ...u, status: nextStatus };
        }
        return u;
      })
    );
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser || !newPassword) return;

    try {
      await resetPasswordMutation.mutateAsync({
        userId: resetUser.id,
        body: { new_password: newPassword },
      });
      toast.success("Password Reset", `Password reset link/token generated for ${resetUser.full_name}.`);
      setResetUser(null);
      setNewPassword("");
    } catch {
      toast.error("Error", "Could not reset password.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Global User Directory & Security"
        description="Cross-tenant user search, global account disabling, and administrative password resets."
      />

      <Card>
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-44 text-xs"
            >
              <option value="all">All Roles</option>
              <option value="TENANT_ADMIN">Tenant Admins</option>
              <option value="COORDINATOR">Coordinators</option>
              <option value="VOLUNTEER">Volunteers (Global)</option>
              <option value="VICTIM">Victims</option>
            </Select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, tenant…"
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users found"
            description="Try adjusting search or role filters."
          />
        ) : (
          <Table>
            <THead>
              <TH>User Details</TH>
              <TH>Tenant Organization</TH>
              <TH>User Role</TH>
              <TH>Status</TH>
              <TH className="text-right">Security Actions</TH>
            </THead>
            <TBody>
              {filteredUsers.map((u) => (
                <TR key={u.id}>
                  <TD>
                    <p className="font-semibold text-slate-900">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3 text-slate-400" />
                      {u.email}
                    </p>
                  </TD>

                  <TD>
                    {u.tenant_slug ? (
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-700">
                        {u.tenant_slug}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Global User</span>
                    )}
                  </TD>

                  <TD>
                    <Badge tone="brand">{u.user_type}</Badge>
                  </TD>

                  <TD>
                    {u.status === "ACTIVE" ? (
                      <Badge tone="success">
                        <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                        Active
                      </Badge>
                    ) : (
                      <Badge tone="danger">
                        <ShieldAlert className="mr-1 h-3.5 w-3.5" />
                        Disabled
                      </Badge>
                    )}
                  </TD>

                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setResetUser(u)}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        Reset Password
                      </Button>

                      <Button
                        size="sm"
                        variant={u.status === "ACTIVE" ? "danger" : "subtle"}
                        onClick={() => toggleUserStatus(u.id)}
                      >
                        <UserX className="h-3.5 w-3.5" />
                        {u.status === "ACTIVE" ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {/* Reset Password Modal */}
      {resetUser && (
        <Modal
          open={!!resetUser}
          onClose={() => setResetUser(null)}
          title="Reset User Password"
          description={`Set a new security password for ${resetUser.full_name} (${resetUser.email}).`}
        >
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <Field label="New Password" required hint="Minimum 8 characters">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                required
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setResetUser(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={resetPasswordMutation.isPending}>
                Set New Password
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
