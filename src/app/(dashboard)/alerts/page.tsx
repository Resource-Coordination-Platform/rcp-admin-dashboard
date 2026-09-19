"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Megaphone, Radio, Search, ShieldAlert } from "lucide-react";
import { useAlerts } from "@/lib/hooks";
import type { AlertSeverity, DisasterAlertRead } from "@/lib/types";
import { formatDateTime, relativeTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, EmptyState, Input, Select, Skeleton, Button, Badge } from "@/components/ui/primitives";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { BroadcastAlertModal } from "@/components/features/broadcast-alert-modal";

const MOCK_ALERTS: DisasterAlertRead[] = [
  {
    id: "alt-001",
    title: "Kelani River Basin Evacuation Warning",
    message: "River water levels have reached critical threshold (Level 2). Evacuation support units deployed in Kolonnawa.",
    severity: "HIGH",
    is_active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "alt-002",
    title: "Heavy Rainfall Advisory - Western Province",
    message: "Heavy rainfall exceeding 100mm expected in Colombo and Gampaha districts over next 24 hours.",
    severity: "MEDIUM",
    is_active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: "alt-003",
    title: "Relief Supply Hub Location Update",
    message: "New medical supply distribution camp opened at Kaduwela Central College grounds.",
    severity: "LOW",
    is_active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
  },
];

export default function AlertsPage() {
  const { data: serverAlerts, isLoading } = useAlerts();

  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);

  const alertList = useMemo(() => {
    return serverAlerts && serverAlerts.length > 0 ? serverAlerts : MOCK_ALERTS;
  }, [serverAlerts]);

  const filteredAlerts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return alertList.filter((a) => {
      const matchSev = severityFilter === "all" || a.severity === severityFilter;
      const matchSearch =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q);
      return matchSev && matchSearch;
    });
  }, [alertList, severityFilter, search]);

  return (
    <div>
      <PageHeader
        title="Emergency Alerts Broadcast Center"
        description="Publish tenant-isolated emergency disaster alerts to ground field teams and mobile victim apps (SRS 3.1.5.2 & 3.1.5.3)."
        actions={
          <Button variant="danger" onClick={() => setShowModal(true)}>
            <Megaphone className="h-4 w-4" />
            Broadcast New Alert
          </Button>
        }
      />

      <Card>
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-44 text-xs"
            >
              <option value="all">All Severities</option>
              <option value="HIGH">🚨 HIGH (Red)</option>
              <option value="MEDIUM">🟧 MEDIUM (Orange)</option>
              <option value="LOW">🟩 LOW (Green)</option>
            </Select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search emergency alerts…"
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredAlerts.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="No disaster alerts published"
            description="Broadcast emergency warnings and advisories using the button above."
          />
        ) : (
          <Table>
            <THead>
              <TH>Severity</TH>
              <TH>Alert Title & Message</TH>
              <TH>Tenant Scope</TH>
              <TH className="text-right">Published</TH>
            </THead>
            <TBody>
              {filteredAlerts.map((a) => (
                <TR key={a.id}>
                  <TD>
                    {a.severity === "HIGH" ? (
                      <Badge tone="danger" className="font-bold animate-pulse">
                        <ShieldAlert className="mr-1 h-3.5 w-3.5" />
                        HIGH
                      </Badge>
                    ) : a.severity === "MEDIUM" ? (
                      <Badge tone="warning">
                        MEDIUM
                      </Badge>
                    ) : (
                      <Badge tone="success">
                        LOW
                      </Badge>
                    )}
                  </TD>

                  <TD>
                    <p className="font-semibold text-slate-900">{a.title}</p>
                    <p className="max-w-xl text-xs text-slate-600 leading-relaxed mt-0.5">
                      {a.message}
                    </p>
                  </TD>

                  <TD>
                    <Badge tone="purple">
                      Effective Tenant Scope
                    </Badge>
                  </TD>

                  <TD className="text-right">
                    <span
                      className="text-xs text-muted-foreground"
                      title={formatDateTime(a.created_at)}
                    >
                      {relativeTime(a.created_at)}
                    </span>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {/* Broadcast Modal */}
      {showModal && (
        <BroadcastAlertModal
          open={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
