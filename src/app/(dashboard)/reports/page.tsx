"use client";

import { useMemo, useState } from "react";
import { Download, FileText, Printer, Search, BarChart3, CheckCircle2, LifeBuoy, Package } from "lucide-react";
import { useNeedVsFulfillment, useRequestSummary } from "@/lib/hooks";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, EmptyState, Input, Skeleton, Button, Badge } from "@/components/ui/primitives";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";

export default function ReportsPage() {
  const toast = useToast();
  const needVsFulfillment = useNeedVsFulfillment();
  const summary = useRequestSummary();

  const [search, setSearch] = useState("");

  const dataRows = needVsFulfillment.data ?? [];
  const summaryData = summary.data ?? {};

  const totalNeeded = useMemo(() => {
    return dataRows.reduce((a, b) => a + b.quantity_needed, 0);
  }, [dataRows]);

  const totalStock = useMemo(() => {
    return dataRows.reduce((a, b) => a + b.stock_available, 0);
  }, [dataRows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dataRows;
    return dataRows.filter((r) => r.category.toLowerCase().includes(q));
  }, [dataRows, search]);

  // Export to CSV Function
  const handleExportCSV = () => {
    if (dataRows.length === 0) {
      toast.error("Export Failed", "No report data available to export.");
      return;
    }

    const headers = ["Category ID", "Category Name", "Open Requests", "Fulfilled Requests", "Quantity Needed", "Stock Available", "Coverage Rate (%)"];
    const csvLines = [headers.join(",")];

    for (const row of dataRows) {
      const coverage = row.quantity_needed > 0
        ? Math.min(100, Math.round((row.stock_available / row.quantity_needed) * 100))
        : 100;
      
      const line = [
        `"${row.category_id}"`,
        `"${row.category.replace(/"/g, '""')}"`,
        row.open_requests,
        row.fulfilled_requests,
        row.quantity_needed,
        row.stock_available,
        `${coverage}%`,
      ];
      csvLines.push(line.join(","));
    }

    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `RCP_Need_vs_Fulfillment_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("CSV Downloaded", "Need vs Fulfillment report exported to CSV.");
  };

  // Export to PDF / Print Function
  const handleExportPDF = () => {
    toast.success("Preparing PDF Print", "Opening print preview dialog...");
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className="space-y-6 print:p-0">
      <PageHeader
        title="Analytical Reports & Governance"
        description="Need vs. Fulfillment summaries, resource utilization analytics, and exportable reporting module."
        actions={
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={handleExportPDF}>
              <Printer className="h-4 w-4" />
              Export PDF / Print
            </Button>
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 print:grid-cols-4">
        <StatCard
          label="Total Resource Demanded"
          value={totalNeeded}
          icon={Package}
          accent="brand"
          loading={needVsFulfillment.isLoading}
        />
        <StatCard
          label="Available Warehouse Stock"
          value={totalStock}
          icon={BarChart3}
          accent="emerald"
          loading={needVsFulfillment.isLoading}
        />
        <StatCard
          label="Fulfilled Requests"
          value={summaryData.fulfilled ?? 0}
          icon={CheckCircle2}
          accent="amber"
          loading={summary.isLoading}
        />
        <StatCard
          label="Pending Intake Needs"
          value={(summaryData.pending ?? 0) + (summaryData.verified ?? 0)}
          icon={LifeBuoy}
          accent="sky"
          loading={summary.isLoading}
        />
      </div>

      {/* Report Data Table */}
      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <h3 className="text-sm font-semibold text-slate-900">
            Category Need vs. Fulfillment Summary
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search category report…"
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {needVsFulfillment.isLoading ? (
          <div className="space-y-3 p-5">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No report rows available"
            description="Log incoming relief requests and stock items to generate category report data."
          />
        ) : (
          <Table>
            <THead>
              <TH>Resource Category</TH>
              <TH>Open Requests</TH>
              <TH>Fulfilled</TH>
              <TH>Quantity Needed</TH>
              <TH>Stock Available</TH>
              <TH className="text-right">Fulfillment Coverage</TH>
            </THead>
            <TBody>
              {filteredRows.map((r) => {
                const coverage = r.quantity_needed > 0
                  ? Math.min(100, Math.round((r.stock_available / r.quantity_needed) * 100))
                  : 100;
                
                const isShortage = r.stock_available < r.quantity_needed;

                return (
                  <TR key={r.category_id}>
                    <TD>
                      <p className="font-semibold text-slate-900">{r.category}</p>
                    </TD>
                    <TD>
                      <span className="font-mono text-xs font-medium text-slate-700">
                        {r.open_requests}
                      </span>
                    </TD>
                    <TD>
                      <span className="font-mono text-xs font-semibold text-emerald-600">
                        {r.fulfilled_requests}
                      </span>
                    </TD>
                    <TD>
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {r.quantity_needed}
                      </span>
                    </TD>
                    <TD>
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {r.stock_available}
                      </span>
                    </TD>
                    <TD className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Badge tone={isShortage ? "danger" : "success"}>
                          {coverage}% {isShortage ? "Shortage" : "Covered"}
                        </Badge>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
