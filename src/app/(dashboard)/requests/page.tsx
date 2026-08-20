"use client";

import { useMemo, useState } from "react";
import { Filter, LifeBuoy, Lock, Search } from "lucide-react";
import {
  useCategories,
  useRequests,
} from "@/lib/hooks";
import { URGENCY_META } from "@/lib/constants";
import type { HelpRequestRead, RequestStatus } from "@/lib/types";
import { formatDateTime, relativeTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  EmptyState,
  Input,
  Skeleton,
} from "@/components/ui/primitives";
import {
  RequestStatusBadge,
  UrgencyBadge,
} from "@/components/ui/badges";
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
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<HelpRequestRead | null>(null);

  const { data, isLoading } = useRequests(
    filter === "all" ? undefined : filter,
  );
  const categories = useCategories(true);

  // Requests can reference a retired category, so the lookup includes inactive
  // ones — and it resolves the whole category, not just the name: the detail
  // modal needs its form schema and approval flow.
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
    const filtered = q
      ? list.filter(
          (r) =>
            r.description.toLowerCase().includes(q) ||
            r.area?.toLowerCase().includes(q) ||
            categoryName(r.category_id).toLowerCase().includes(q),
        )
      : list;
    return [...filtered].sort(
      (a, b) =>
        URGENCY_META[b.urgency].rank - URGENCY_META[a.urgency].rank ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [data, search, categoryName]);

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
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search requests…"
              className="pl-9"
            />
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
            description="Requests submitted by victims and coordinators will appear here for triage."
          />
        ) : (
          <Table>
            <THead>
              <TH>Request</TH>
              <TH>Category</TH>
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
                      {r.area ?? "No area"} · qty {r.quantity_needed}
                    </p>
                  </TD>
                  <TD className="text-slate-600">
                    {categoryName(r.category_id)}
                  </TD>
                  <TD>
                    <UrgencyBadge level={r.urgency} />
                  </TD>
                  <TD>
                    <RequestStatusBadge status={r.status} />
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
          category={categoryById(selected.category_id)}
          onClose={() => setSelected(null)}
          onChanged={(updated) => setSelected(updated)}
        />
      )}
    </div>
  );
}
