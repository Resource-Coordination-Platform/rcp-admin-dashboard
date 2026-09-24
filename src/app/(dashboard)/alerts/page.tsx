"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Megaphone,
  Radio,
  Search,
  ShieldAlert,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAlerts } from "@/lib/hooks";
import type { AlertSeverity, DisasterAlertRead } from "@/lib/types";
import { formatDateTime, relativeTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  EmptyState,
  Input,
  Select,
  Skeleton,
  Button,
  Badge,
} from "@/components/ui/primitives";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { BroadcastAlertModal } from "@/components/features/broadcast-alert-modal";



export default function AlertsPage() {
  const queryClient = useQueryClient();
  const { data: serverAlerts, isLoading } = useAlerts();

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "BROADCASTING" | "CLOSED" }) => {
      return api.patch(`/api/alerts/${id}/status`, { status });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const deleteAlert = useMutation({
    mutationFn: async (id: string) => {
      return api.del(`/api/alerts/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);

  const alertList = useMemo(() => {
    return serverAlerts || [];
  }, [serverAlerts]);

  const filteredAlerts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return alertList.filter((a) => {
      const matchSev =
        severityFilter === "all" || a.severity === severityFilter;
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
              <TH>Status</TH>
              <TH className="text-right">Published</TH>
              <TH className="text-right">Actions</TH>
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
                      <Badge tone="warning">MEDIUM</Badge>
                    ) : (
                      <Badge tone="success">LOW</Badge>
                    )}
                  </TD>

                  <TD>
                    <p className="font-semibold text-slate-900">{a.title}</p>
                    <p className="max-w-xl text-xs text-slate-600 leading-relaxed mt-0.5">
                      {a.message}
                    </p>
                  </TD>

                  <TD>
                    {a.status === "BROADCASTING" ? (
                      <Badge tone="success" className="font-bold animate-pulse">
                        <Radio className="mr-1 h-3.5 w-3.5" />
                        BROADCASTING
                      </Badge>
                    ) : (
                      <Badge tone="neutral">CLOSED</Badge>
                    )}
                  </TD>

                  <TD className="text-right">
                    <span
                      className="text-xs text-muted-foreground"
                      title={formatDateTime(a.created_at)}
                    >
                      {relativeTime(a.created_at)}
                    </span>
                  </TD>

                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      {a.status === "BROADCASTING" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => updateStatus.mutate({ id: a.id, status: "CLOSED" })}
                          disabled={updateStatus.isPending}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this closed alert?")) {
                              deleteAlert.mutate(a.id);
                            }
                          }}
                          disabled={deleteAlert.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
