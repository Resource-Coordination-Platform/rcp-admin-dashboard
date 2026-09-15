"use client";

import { useState } from "react";
import { Building2, KeyRound, Mail, User, Globe, AlertCircle } from "lucide-react";
import { useCreateTenant } from "@/lib/hooks";
import { ApiError } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";

export function TenantOnboardingModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const createTenant = useCreateTenant();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from organization name if slug hasn't been manually edited
  const handleNameChange = (val: string) => {
    setName(val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSlug(autoSlug);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !slug.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      setError("Please fill out all required fields.");
      return;
    }

    try {
      await createTenant.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        admin_full_name: adminFullName.trim() || "Tenant Admin",
        admin_email: adminEmail.trim(),
        admin_password: adminPassword,
      });

      toast.success(
        "Tenant Onboarded",
        `Organization "${name}" has been registered successfully.`
      );
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Failed to create tenant. Please verify the gateway connection.");
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Onboard New Tenant Organization"
      description="Provision a dedicated, isolated environment for a Community Organization, NGO, or Municipal Team."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Organization Info */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Building2 className="h-4 w-4 text-brand-600" />
            Organization Details
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Organization Name" required hint="e.g. Kolonnawa Mutual Aid">
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Red Cross Colombo"
                required
              />
            </Field>

            <Field label="Unique Slug" required hint="Identifier for login (e.g. kolonnawa)">
              <div className="relative">
                <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="colombo-redcross"
                  className="pl-9 font-mono text-sm"
                  required
                />
              </div>
            </Field>
          </div>

          <Field label="Description" hint="Optional summary of operations or region">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Regional disaster response team handling flood relief in Western province..."
              rows={2}
            />
          </Field>
        </div>

        {/* Initial Tenant Admin Credentials */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <User className="h-4 w-4 text-brand-600" />
            Primary Administrator Setup
          </h3>

          <Field label="Admin Full Name" required>
            <Input
              value={adminFullName}
              onChange={(e) => setAdminFullName(e.target.value)}
              placeholder="Saman Perera"
              required
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Admin Email" required>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@colombo-redcross.org"
                  className="pl-9"
                  required
                />
              </div>
            </Field>

            <Field label="Admin Password" required hint="Minimum 8 characters">
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="pl-9"
                  required
                />
              </div>
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={createTenant.isPending}>
            Onboard Organization
          </Button>
        </div>
      </form>
    </Modal>
  );
}
