"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  CheckCircle,
  Copy,
  Check,
  Filter,
  Plus,
  Power,
  Search,
  ShieldAlert,
  ShieldCheck,
  Slash,
} from "lucide-react";
import { useTenants, useUpdateTenantStatus } from "@/lib/hooks";
import type { TenantRead } from "@/lib/types";
import { formatDateTime, relativeTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  Card,
  EmptyState,
  Input,
  Skeleton,
  Button,
  Badge,
} from "@/components/ui/primitives";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { TenantOnboardingModal } from "@/components/features/tenant-onboarding-modal";
import { useToast } from "@/components/ui/toast";

type StatusFilter = "all" | "active" | "suspended" | "disabled";

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
  { label: "Disabled", value: "disabled" },
];

export default function TenantsPage() {
  const toast = useToast();
  const { data: tenants, isLoading } = useTenants();
  const updateStatus = useUpdateTenantStatus();

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const tenantList = tenants ?? [];

  const metrics = useMemo(() => {
    const total = tenantList.length;
    const active = tenantList.filter((t) => t.status === "active").length;
    const suspended = tenantList.filter((t) => t.status === "suspended").length;
    const disabled = tenantList.filter((t) => t.status === "disabled").length;
    return { total, active, suspended, disabled };
  }, [tenantList]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tenantList.filter((t) => {
      const matchFilter = filter === "all" || t.status === filter;
      const matchSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q));
      return matchFilter && matchSearch;
    });
  }, [tenantList, filter, search]);

  const copySlug = (slug: string) => {
    navigator.clipboard.writeText(slug);
    setCopiedSlug(slug);
    toast.success("Slug Copied", `"${slug}" copied to clipboard.`);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleStatusToggle = async (
    tenant: TenantRead,
    newStatus: "active" | "suspended" | "disabled",
  ) => {
    try {
      await updateStatus.mutateAsync({
        tenantId: tenant.id,
        status: newStatus,
      });
      toast.success(
        "Status Updated",
        `Organization "${tenant.name}" status changed to ${newStatus.toUpperCase()}.`,
      );
    } catch (err) {
      toast.error("Update Failed", "Could not change tenant status.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Tenant Organizations"
        description="Platform Super Admin console for onboarding new NGOs, MERTs and CBOs and managing lifecycle access."
        actions={
          <Button onClick={() => setShowOnboardModal(true)}>
            <Plus className="h-4 w-4" />
            Onboard Organization
          </Button>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Registered Tenants"
          value={metrics.total}
          icon={Building2}
          accent="brand"
          loading={isLoading}
        />
        <StatCard
          label="Active Organizations"
          value={metrics.active}
          icon={CheckCircle}
          accent="emerald"
          loading={isLoading}
        />
        <StatCard
          label="Suspended Tenants"
          value={metrics.suspended}
          icon={ShieldAlert}
          accent="amber"
          loading={isLoading}
        />
        <StatCard
          label="Disabled Tenants"
          value={metrics.disabled}
          icon={Slash}
          accent="red"
          loading={isLoading}
        />
      </div>

      {/* Main Table Card */}
      <Card className="mt-6">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_FILTERS.map((f) => {
              const active = filter === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
                    (active
                      ? "bg-brand-600 text-white"
                      : "text-slate-600 hover:bg-slate-100")
                  }
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search organizations…"
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <EmptyState
            icon={filter === "all" ? Building2 : Filter}
            title={
              search
                ? "No matching organizations"
                : filter === "all"
                  ? "No tenants registered yet"
                  : `No ${filter} organizations`
            }
            description="Onboard your first tenant organization using the button above."
          />
        ) : (
          <Table>
            <THead>
              <TH>Organization</TH>
              <TH>Slug / Identifier</TH>
              <TH>Status</TH>
              <TH>Registered</TH>
              <TH className="text-right">Actions</TH>
            </THead>
            <TBody>
              {filteredRows.map((t) => (
                <TR key={t.id}>
                  <TD>
                    <p className="font-semibold text-slate-900">{t.name}</p>
                    {t.description && (
                      <p className="max-w-xs truncate text-xs text-muted-foreground">
                        {t.description}
                      </p>
                    )}
                  </TD>

                  <TD>
                    <button
                      onClick={() => copySlug(t.slug)}
                      className="group flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-medium text-slate-700 hover:bg-slate-200"
                      title="Click to copy slug"
                    >
                      <span>{t.slug}</span>
                      {copiedSlug === t.slug ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-slate-400 group-hover:text-slate-600" />
                      )}
                    </button>
                  </TD>

                  <TD>
                    {t.status === "active" ? (
                      <Badge tone="success">
                        <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                        Active
                      </Badge>
                    ) : t.status === "suspended" ? (
                      <Badge tone="warning">
                        <ShieldAlert className="mr-1 h-3.5 w-3.5" />
                        Suspended
                      </Badge>
                    ) : (
                      <Badge tone="danger">
                        <Power className="mr-1 h-3.5 w-3.5" />
                        Disabled
                      </Badge>
                    )}
                  </TD>

                  <TD>
                    <span
                      className="text-xs text-muted-foreground"
                      title={formatDateTime(t.created_at)}
                    >
                      {relativeTime(t.created_at)}
                    </span>
                  </TD>

                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      {t.status === "active" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          loading={updateStatus.isPending}
                          onClick={() => handleStatusToggle(t, "suspended")}
                        >
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="subtle"
                          loading={updateStatus.isPending}
                          onClick={() => handleStatusToggle(t, "active")}
                        >
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                          Re-activate
                        </Button>
                      )}

                      {t.status !== "disabled" && (
                        <Button
                          size="sm"
                          variant="danger"
                          loading={updateStatus.isPending}
                          onClick={() => handleStatusToggle(t, "disabled")}
                        >
                          <Power className="h-3.5 w-3.5" />
                          Disable
                        </Button>
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {/* Onboarding Modal */}
      {showOnboardModal && (
        <TenantOnboardingModal
          open={showOnboardModal}
          onClose={() => setShowOnboardModal(false)}
        />
      )}
    </div>
  );
}
