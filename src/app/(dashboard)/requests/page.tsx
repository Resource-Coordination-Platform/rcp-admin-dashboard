"use client";

import { useMemo, useState } from "react";
import { Filter, LifeBuoy, Lock, Search } from "lucide-react";
import { useCategories, useRequests } from "@/lib/hooks";
import { URGENCY_META } from "@/lib/constants";
import type { HelpRequestRead, RequestStatus } from "@/lib/types";
import { formatDateTime, relativeTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, EmptyState, Input, Select, Skeleton } from "@/components/ui/primitives";
import { RequestStatusBadge, UrgencyBadge } from "@/components/ui/badges";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { RequestDetailModal } from "@/components/features/request-detail-modal";

const FILTERS: { label: string; value: RequestStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Verified", value: "verified" },
  { label: "Approved", value: "approved" },
  { label: "In progress", value: "in_progress" },
  { label: "Fulfilled", value: "fulfilled" },
  { label: "Rejected", value: "rejected" },
];

export default function RequestsPage() {
  const [filter, setFilter] = useState<RequestStatus | "all">("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<HelpRequestRead | null>(null);

  const { data, isLoading } = useRequests(
    filter === "all" ? undefined : filter,
  );
  const categories = useCategories(true);

  const { categoryById, categoryName } = useMemo(() => {
    const map = new Map((categories.data ?? []).map((c) => [c.id, c]));
    return {
      categoryById: (id: string) => map.get(id),
      categoryName: (id: string) => map.get(id)?.name ?? "Uncategorized",
    };
  }, [categories.data]);

  const rows = useMemo(() => {
    const list = data ?? [];
    const q = search.trim().toLowerCase();

    return list.filter((r) => {
      const matchStatus =
        filter === "all" ||
        (r.status ? String(r.status).toLowerCase() : "pending") === filter;

      const matchUrgency =
        urgencyFilter === "all" ||
        (r.urgency ? String(r.urgency).toLowerCase() : "medium") === urgencyFilter;

      const matchCategory =
        categoryFilter === "all" || r.category_id === categoryFilter;

      const matchSearch =
        !q ||
        r.description.toLowerCase().includes(q) ||
        r.area?.toLowerCase().includes(q) ||
        categoryName(r.category_id ?? "").toLowerCase().includes(q);

      return matchStatus && matchUrgency && matchCategory && matchSearch;
    }).sort(
      (a, b) =>
        URGENCY_META[b.urgency ?? "medium"].rank -
          URGENCY_META[a.urgency ?? "medium"].rank ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [data, filter, urgencyFilter, categoryFilter, search, categoryName]);

  return (
    <div>
      <PageHeader
        title="Help Requests"
        description="Triage incoming needs, advance them through the pipeline, and dispatch volunteers."
      />

      <Card>
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((f) => {
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
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="w-36 text-xs"
            >
              <option value="all">All Urgencies</option>
              <option value="critical">🚨 Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>

            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-40 text-xs"
            >
              <option value="all">All Categories</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search requests…"
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={filter === "all" ? LifeBuoy : Filter}
            title={
              search
                ? "No matching requests"
                : filter === "all"
                  ? "No requests yet"
                  : `No ${filter.replace("_", " ")} requests`
            }
            description="Requests submitted by victims"
          />
        ) : (
          <Table>
            <THead>
              <TH>Request</TH>
              <TH>Disaster / Category</TH>
              <TH>Urgency</TH>
              <TH>Status</TH>
              <TH className="text-right">Created</TH>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id} onClick={() => setSelected(r)}>
                  <TD>
                    <div className="flex items-center gap-2">
                      <p className="max-w-sm truncate font-medium text-slate-900">
                        {r.description}
                      </p>
                      {r.is_sensitive && (
                        <Lock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.area ??
                        (r.latitude && r.longitude
                          ? `${r.latitude.toFixed(3)}, ${r.longitude.toFixed(3)}`
                          : "No area")}
                      {r.quantity_needed
                        ? ` · qty ${r.quantity_needed}`
                        : r.needs
                          ? ` · ${Array.isArray(r.needs) ? r.needs.join(", ") : r.needs}`
                          : ""}
                    </p>
                  </TD>
                  <TD className="text-slate-600">
                    {r.disaster_type || (r.category_id ? categoryName(r.category_id) : "General")}
                  </TD>
                  <TD>
                    <UrgencyBadge level={r.urgency ?? "medium"} />
                  </TD>
                  <TD>
                    <RequestStatusBadge status={r.status ?? "pending"} />
                  </TD>
                  <TD className="text-right">
                    <span
                      className="text-xs text-muted-foreground"
                      title={formatDateTime(r.created_at)}
                    >
                      {relativeTime(r.created_at)}
                    </span>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {selected && (
        <RequestDetailModal
          request={selected}
          category={selected.category_id ? categoryById(selected.category_id) : undefined}
          onClose={() => setSelected(null)}
          onChanged={(updated) => setSelected(updated)}
        />
      )}
    </div>
  );
}
