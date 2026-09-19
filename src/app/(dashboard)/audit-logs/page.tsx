"use client";

import { useMemo, useState } from "react";
import { ClipboardList, Filter, Search, ShieldCheck, UserCheck, Boxes, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, EmptyState, Input, Select, Badge } from "@/components/ui/primitives";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime, relativeTime } from "@/lib/format";

interface AuditLogEntry {
  id: string;
  action: string;
  actor: string;
  role: string;
  details: string;
  category: "INVENTORY" | "VERIFICATION" | "DISPATCH" | "TENANT";
  timestamp: string;
  status: "SUCCESS" | "WARNING" | "FAILED";
}

// Sample audit entries matching coordinator activities
const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "log-101",
    action: "STOCK_RESERVED",
    actor: "Coordinator Perera",
    role: "COORDINATOR",
    details: "Reserved 500L Clean Drinking Water for Request #req-889",
    category: "INVENTORY",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    status: "SUCCESS",
  },
  {
    id: "log-102",
    action: "REQUEST_VERIFIED",
    actor: "Admin Silva",
    role: "TENANT_ADMIN",
    details: "Verified emergency flood relief request in Kolonnawa area",
    category: "VERIFICATION",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    status: "SUCCESS",
  },
  {
    id: "log-103",
    action: "VOLUNTEER_DISPATCHED",
    actor: "Coordinator Perera",
    role: "COORDINATOR",
    details: "Assigned Task #task-402 to Volunteer Kasun Bandara",
    category: "DISPATCH",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    status: "SUCCESS",
  },
  {
    id: "log-104",
    action: "TENANT_ONBOARDED",
    actor: "Super Admin System",
    role: "SUPER_ADMIN",
    details: "Onboarded tenant organization 'Red Cross Colombo'",
    category: "TENANT",
    timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    status: "SUCCESS",
  },
];

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return INITIAL_AUDIT_LOGS.filter((log) => {
      const matchCat = categoryFilter === "all" || log.category === categoryFilter;
      const matchSearch =
        !q ||
        log.action.toLowerCase().includes(q) ||
        log.actor.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, categoryFilter]);

  return (
    <div>
      <PageHeader
        title="Operational Audit Logs"
        description="Immutable audit trail capturing coordinator verification logs, inventory adjustments, and dispatch executions."
      />

      <Card>
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-44 text-xs"
            >
              <option value="all">All Categories</option>
              <option value="INVENTORY">📦 Inventory Adjustments</option>
              <option value="VERIFICATION">✅ Verifications</option>
              <option value="DISPATCH">🚚 Volunteer Dispatch</option>
              <option value="TENANT">🏢 Tenant Management</option>
            </Select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit trail…"
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No audit entries found"
            description="Operational actions executed by coordinators will log here automatically."
          />
        ) : (
          <Table>
            <THead>
              <TH>Action Type</TH>
              <TH>Executed By</TH>
              <TH>Details</TH>
              <TH>Category</TH>
              <TH className="text-right">Timestamp</TH>
            </THead>
            <TBody>
              {filteredLogs.map((log) => (
                <TR key={log.id}>
                  <TD>
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {log.action}
                    </span>
                  </TD>

                  <TD>
                    <p className="font-medium text-xs text-slate-900">{log.actor}</p>
                    <span className="text-[10px] text-muted-foreground">{log.role}</span>
                  </TD>

                  <TD>
                    <p className="max-w-md text-xs text-slate-700">{log.details}</p>
                  </TD>

                  <TD>
                    <Badge
                      tone={
                        log.category === "INVENTORY"
                          ? "warning"
                          : log.category === "DISPATCH"
                          ? "brand"
                          : "success"
                      }
                    >
                      {log.category}
                    </Badge>
                  </TD>

                  <TD className="text-right">
                    <span
                      className="text-xs text-muted-foreground"
                      title={formatDateTime(log.timestamp)}
                    >
                      {relativeTime(log.timestamp)}
                    </span>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
