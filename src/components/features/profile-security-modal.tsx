"use client";

import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Badge, Button, Field, Input } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";

export function ProfileSecurityModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const { profile, updateProfile, changePassword, claims } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }, [open, profile]);

  const email = profile?.email ?? "admin";
  const displayName = profile?.full_name?.trim() || email.split("@")[0];
  const roleLabel =
    claims?.roles.includes("tenant_admin")
      ? "Tenant Admin"
      : claims?.roles[0] ?? "member";

  async function saveProfile() {
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      toast.error("Full name required", "Please enter your display name.");
      return;
    }

    try {
      setSavingProfile(true);
      await updateProfile({
        full_name: trimmedName,
        phone: trimmedPhone ? trimmedPhone : null,
      });
      toast.success("Profile updated", "Your name and phone number were saved.");
      onClose();
    } catch (err) {
      toast.error(
        "Could not update profile",
        err instanceof ApiError ? err.detail : "Unexpected error",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function submitPasswordChange() {
    if (!currentPassword.trim()) {
      toast.error("Current password required", "Enter your current password.");
      return;
    }
    if (newPassword.length < 10) {
      toast.error("Password too short", "Use at least 10 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match", "Re-enter the new password.");
      return;
    }

    try {
      setSavingPassword(true);
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success(
        "Password changed",
        "Your refresh tokens were rotated. If you had other sessions, they will need to sign in again.",
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(
        "Could not change password",
        err instanceof ApiError ? err.detail : "Unexpected error",
      );
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Profile & security"
      description="Update your display details and change your password from one place."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-slate-50/80 p-3.5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-600/25">
              {displayName
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() ?? "")
                .join("") || "A"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-base font-semibold text-slate-900">
                  {displayName}
                </p>
                <Badge tone="brand">
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                  {roleLabel}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tenant: {profile?.tenantSlug ?? "—"}
              </p>
            </div>
          </div>
        </div>

        <section className="space-y-3.5 rounded-2xl border border-border p-3.5">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <UserRound className="h-4 w-4 text-brand-600" />
              Profile details
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Update the name and phone number that appear across the console.
            </p>
          </div>

          <Field label="Full name" required>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tenant Administrator"
            />
          </Field>

          <Field label="Phone">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+94771234567"
            />
          </Field>

          <div className="flex justify-end">
            <Button loading={savingProfile} onClick={saveProfile}>
              Save profile
            </Button>
          </div>
        </section>

        <section className="space-y-3.5 rounded-2xl border border-border p-3.5">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <KeyRound className="h-4 w-4 text-brand-600" />
              Change password
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use this when you are rotating a temporary password or updating
              your login secret.
            </p>
          </div>

          <Field label="Current password" required>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="New password" required hint="At least 10 characters">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm new password" required>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
            </Field>
          </div>

          <div className="flex justify-end">
            <Button loading={savingPassword} onClick={submitPasswordChange}>
              Update password
            </Button>
          </div>
        </section>
      </div>
    </Modal>
  );
}
