"use client";

import { useMemo, useState } from "react";
import {
  ClipboardList,
  Filter,
  Search,
  ShieldCheck,
  UserCheck,
  Boxes,
  AlertCircle,
  Download,
} from "lucide-react";   
import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  EmptyState,
  Input,
  Select,
  Badge,
  Button,
} from "@/components/ui/primitives";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime, relativeTime } from "@/lib/format";
import { useAuditLogs } from "@/lib/hooks";

export default function AuditLogsPage() {
  const { data: serverLogs, isLoading } = useAuditLogs();
  const logs = serverLogs || [];

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      const matchCat =
        categoryFilter === "all" || log.category === categoryFilter;
      const matchSearch =
        !q ||
        log.action.toLowerCase().includes(q) ||
        log.actor.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [logs, search, categoryFilter]);

  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ["Timestamp", "Category", "Action", "Actor", "Role", "Details", "Status"];
    const rows = filteredLogs.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.category,
      log.action,
      log.actor,
      log.role,
      `"${log.details.replace(/"/g, '""')}"`, // Handle commas in details
      log.status
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "audit_logs.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

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
          
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={filteredLogs.length === 0}
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            Export to CSV
          </Button>
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
                    <p className="font-medium text-xs text-slate-900">
                      {log.actor}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {log.role}
                    </span>
                  </TD>

                  <TD>
                    <p className="max-w-md text-xs text-slate-700">
                      {log.details}
                    </p>
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
                      title={formatDateTime(log.created_at)}
                    >
                      {relativeTime(log.created_at)}
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
