"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  LifeBuoy,
  Package,
  Radio,
  TriangleAlert,
  Users,
} from "lucide-react";
import {
  useEvents,
  useInventory,
  useNeedVsFulfillment,
  useRequestSummary,
  useRequests,
  useCategories,
} from "@/lib/hooks";
import { REQUEST_STATUS_META } from "@/lib/constants";
import type { HelpRequestRead, RequestStatus } from "@/lib/types";
import {
  formatDateTime,
  formatRequestLocation,
  relativeTime,
} from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  Card,
  CardHeader,
  EmptyState,
  Skeleton,
  Button,
} from "@/components/ui/primitives";
import {
  EventStatusBadge,
  RequestStatusBadge,
  UrgencyBadge,
} from "@/components/ui/badges";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { RequestDetailModal } from "@/components/features/request-detail-modal";

const STATUS_COLORS: Record<string, string> = {
  pending: "#94a3b8",
  verified: "#0ea5e9",
  approved: "#3563ff",
  in_progress: "#f59e0b",
  fulfilled: "#10b981",
  rejected: "#ef4444",
  cancelled: "#cbd5e1",
};

export default function OverviewPage() {
  const summary = useRequestSummary();
  const needVsFulfillment = useNeedVsFulfillment();
  const events = useEvents();
  const inventory = useInventory();
  const recent = useRequests();
  const categories = useCategories(true);
  const [selectedRequest, setSelectedRequest] =
    useState<HelpRequestRead | null>(null);

  const categoryById = useMemo(() => {
    const map = new Map(
      (categories.data ?? []).map((category) => [category.id, category]),
    );
    return (id: string) => map.get(id);
  }, [categories.data]);

  const inventoryItems = inventory.data ?? [];
  const lowStockItems = inventoryItems.filter(
    (i) => i.quantity_available <= 10,
  );

  const summaryData = summary.data ?? {};
  const totalRequests = Object.values(summaryData).reduce((a, b) => a + b, 0);
  const openRequests =
    (summaryData.pending ?? 0) +
    (summaryData.verified ?? 0) +
    (summaryData.approved ?? 0) +
    (summaryData.in_progress ?? 0);
  const fulfilled = summaryData.fulfilled ?? 0;
  const activeEvents = (events.data ?? []).filter(
    (e) => e.status === "DECLARED" || e.status === "BROADCASTING",
  ).length;
  const totalStock = inventoryItems.reduce(
    (a, i) => a + i.quantity_available,
    0,
  );

  const pieData = (Object.entries(summaryData) as [RequestStatus, number][])
    .filter(([, v]) => v > 0)
    .map(([status, value]) => ({
      name: REQUEST_STATUS_META[status]?.label ?? status,
      value,
      status,
    }));

  const barData = (needVsFulfillment.data ?? []).map((r) => ({
    name: r.category,
    Needed: r.quantity_needed,
    Stock: r.stock_available,
  }));

  const recentRequests = (recent.data ?? []).slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="The live snapshot of the organization's relief operations."
      />

      {/* Low Stock Threshold Warning Banner */}
      {lowStockItems.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
              <TriangleAlert className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-950">
                ⚠️ Low-Stock Threshold Warning ({lowStockItems.length} items
                critical)
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                The following warehouse inventory items are below minimum
                operating thresholds:{" "}
                <span className="font-semibold">
                  {lowStockItems
                    .map((i) => `${i.name} (${i.quantity_available} left)`)
                    .join(", ")}
                </span>
              </p>
            </div>
          </div>
          <Link href="/inventory" className="shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="border-amber-400 bg-white hover:bg-amber-100"
            >
              Replenish Inventory
            </Button>
          </Link>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total requests"
          value={totalRequests}
          icon={LifeBuoy}
          accent="brand"
          loading={summary.isLoading}
          hint={`${openRequests} currently open`}
        />
        <StatCard
          label="Fulfilled"
          value={fulfilled}
          icon={CheckCircle2}
          accent="emerald"
          loading={summary.isLoading}
          hint={
            totalRequests
              ? `${Math.round((fulfilled / totalRequests) * 100)}% fulfillment rate`
              : "No requests yet"
          }
        />
        <StatCard
          label="Active events"
          value={activeEvents}
          icon={Radio}
          accent="violet"
          loading={events.isLoading}
          hint={`${events.data?.length ?? 0} total declared`}
        />
        <StatCard
          label="Stock available"
          value={totalStock}
          icon={Boxes}
          accent="amber"
          loading={inventory.isLoading}
          hint={`${inventory.data?.length ?? 0} inventory items`}
        />
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Need vs. available stock"
            description="Current requests compared to available stock, by category."
          />
          <div className="p-5">
            {needVsFulfillment.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : barData.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No category data yet"
                description="Create resource categories and log requests to see the need-vs-fulfillment picture."
              />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} barGap={6}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(148,163,184,0.08)" }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                      boxShadow: "0 10px 30px -12px rgba(15,23,42,0.18)",
                    }}
                  />
                  <Bar dataKey="Needed" fill="#3563ff" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Stock" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Request status"
            description="Distribution across the pipeline."
          />
          <div className="p-5">
            {summary.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : pieData.length === 0 ? (
              <EmptyState
                icon={LifeBuoy}
                title="No requests yet"
                description="Incoming requests will break down here by status."
              />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={54}
                      outerRadius={80}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {pieData.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={STATUS_COLORS[entry.status] ?? "#94a3b8"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        fontSize: 13,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1.5">
                  {pieData.map((entry) => (
                    <div
                      key={entry.status}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-2 text-slate-600">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              STATUS_COLORS[entry.status] ?? "#94a3b8",
                          }}
                        />
                        {entry.name}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Recent activity + active events */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent requests"
            action={
              <Link
                href="/requests"
                className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          {recent.isLoading ? (
            <div className="space-y-3 p-5">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentRequests.length === 0 ? (
            <EmptyState
              icon={LifeBuoy}
              title="No requests yet"
              description="New help requests will appear here as they come in."
            />
          ) : (
            <Table>
              <THead>
                <TH>Request</TH>
                <TH>Urgency</TH>
                <TH>Status</TH>
                <TH className="text-right">Created</TH>
              </THead>
              <TBody>
                {recentRequests.map((r) => (
                  <TR key={r.id} onClick={() => setSelectedRequest(r)}>
                    <TD>
                      <p className="max-w-xs truncate font-medium text-slate-900">
                        {r.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRequestLocation(r)}
                        {r.quantity_needed
                          ? ` · qty ${r.quantity_needed}`
                          : r.needs
                            ? ` · ${Array.isArray(r.needs) ? r.needs.join(", ") : r.needs}`
                            : ""}
                      </p>
                    </TD>
                    <TD>
                      <UrgencyBadge level={r.urgency ?? "medium"} />
                    </TD>
                    <TD>
                      <RequestStatusBadge status={r.status ?? "pending"} />
                    </TD>
                    <TD className="text-right text-xs text-muted-foreground">
                      {relativeTime(r.created_at)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Active events"
            action={
              <Link
                href="/events"
                className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                All <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          <div className="p-4">
            {events.isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (events.data ?? []).length === 0 ? (
              <EmptyState
                icon={TriangleAlert}
                title="No events declared"
                description="Declare a disaster event to broadcast to volunteers."
              />
            ) : (
              <div className="space-y-2.5">
                {(events.data ?? []).slice(0, 4).map((e) => {
                  const filled = e.requirements.reduce(
                    (a, r) => a + r.filled_count,
                    0,
                  );
                  const needed = e.requirements.reduce(
                    (a, r) => a + r.required_count,
                    0,
                  );
                  return (
                    <Link
                      key={e.id}
                      href={`/events/${e.id}`}
                      className="block rounded-xl border border-border p-3 transition hover:border-brand-200 hover:bg-brand-50/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-medium text-slate-900">
                          {e.title}
                        </p>
                        <EventStatusBadge status={e.status} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {e.source_district} · {filled}/{needed} volunteers ·{" "}
                        {formatDateTime(e.created_at)}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          category={
            selectedRequest.category_id
              ? categoryById(selectedRequest.category_id)
              : undefined
          }
          onClose={() => setSelectedRequest(null)}
          onChanged={(updated) => setSelectedRequest(updated)}
        />
      )}
    </div>
  );
}
