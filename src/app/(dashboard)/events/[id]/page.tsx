"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Radio,
  RefreshCw,
  Users,
  XCircle,
} from "lucide-react";
import { useCloseEvent, useEvent, useEventAssignments, useRebroadcastEvent } from "@/lib/hooks";
import type { AssignmentStatus } from "@/lib/types";
import { ApiError } from "@/lib/api";
import { formatDateTime, humanizeSkill, pct } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Progress,
  Skeleton,
} from "@/components/ui/primitives";
import { BroadcastBadge, EventStatusBadge } from "@/components/ui/badges";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

const statusLabels: Record<AssignmentStatus, string> = {
  NOTIFIED: "Awaiting response", ACCEPTED: "Accepted", EN_ROUTE: "En route",
  COMPLETED: "Completed", DECLINED: "Declined", REJECTED_FULL: "Quota full",
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { data: event, isLoading, error, refetch } = useEvent(id);
  const roster = useEventAssignments(id);
  const rebroadcast = useRebroadcastEvent();
  const closeEvent = useCloseEvent();
  const [confirmClose, setConfirmClose] = useState(false);

  const canRebroadcast =
    event?.status === "DECLARED" || event?.status === "BROADCASTING";
  const canClose = event?.status !== "CLOSED";

  async function onRebroadcast() {
    try {
      await rebroadcast.mutateAsync(id);
      toast.success("Rebroadcast sent", "Matching re-ran for open buckets.");
    } catch (err) {
      toast.error(
        "Rebroadcast failed",
        err instanceof ApiError ? err.detail : "Unexpected error",
      );
    }
  }

  async function onClose() {
    try {
      await closeEvent.mutateAsync(id);
      toast.success("Event closed", "The response has been marked closed.");
      setConfirmClose(false);
    } catch (err) {
      toast.error(
        "Could not close event",
        err instanceof ApiError ? err.detail : "Unexpected error",
      );
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!event) {
    return (
      <Card className="p-10 text-center">
        <p className="text-sm text-muted-foreground">
          {error instanceof ApiError && error.status === 404
            ? "Event not found."
            : "Unable to load this event. Please try again."}
        </p>
        <Button variant="outline" className="mt-3" onClick={() => void refetch()}>Retry</Button>
        <Link
          href="/events"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back to events
        </Link>
      </Card>
    );
  }

  const filled = event.requirements.reduce((a, r) => a + r.filled_count, 0);
  const needed = event.requirements.reduce((a, r) => a + r.required_count, 0);
  const progress = pct(filled, needed);
  const assignments = roster.data ?? [];
  const accepted = assignments.filter(a => a.status === "ACCEPTED").length;
  const enRoute = assignments.filter(a => a.status === "EN_ROUTE").length;
  const completed = assignments.filter(a => a.status === "COMPLETED").length;
  const joined = accepted + enRoute + completed;

  return (
    <div>
      <Link
        href="/events"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> All events
      </Link>

      {/* Header card */}
      <Card className="p-6">
        {error && <p role="alert" className="mb-3 text-sm text-amber-700">Event refresh failed. Showing the last loaded data.</p>}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <EventStatusBadge status={event.status} />
              <BroadcastBadge type={event.broadcast_type} />
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              {event.title}
            </h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {event.source_district}
              </span>
              {event.latitude != null && event.longitude != null && (
                <a
                  href={`https://www.google.com/maps?q=${event.latitude},${event.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-brand-600 hover:underline"
                >
                  {event.latitude.toFixed(5)}, {event.longitude.toFixed(5)}
                </a>
              )}
              <span>Declared {formatDateTime(event.created_at)}</span>
            </p>
            {event.description && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-700">
                {event.description}
              </p>
            )}
            {event.target_districts.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Targeted:
                </span>
                {event.target_districts.map((d) => (
                  <Badge key={d} tone="purple">
                    {d}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              disabled={!canRebroadcast}
              loading={rebroadcast.isPending}
              onClick={onRebroadcast}
            >
              <RefreshCw className="h-4 w-4" />
              Rebroadcast
            </Button>
            <Button
              variant="danger"
              disabled={!canClose}
              onClick={() => setConfirmClose(true)}
            >
              <XCircle className="h-4 w-4" />
              Close
            </Button>
          </div>
        </div>

        {/* Overall progress */}
        <div className="mt-6 rounded-xl bg-slate-50 p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <Users className="h-4 w-4" />
              Overall team fill
            </span>
            <span className="font-semibold text-slate-900">
              {filled} / {needed} volunteers · {progress}%
            </span>
          </div>
          <Progress
            value={progress}
            tone={progress === 100 ? "success" : "brand"}
            className="h-2.5"
          />
        </div>
      </Card>

      {/* Requirements */}
      <Card className="mt-6">
        <CardHeader
          title="Skill requirements"
          description="First-come-first-serve fill per skill bucket."
        />
        <div className="divide-y divide-border">
          {event.requirements.map((r) => {
            const rp = pct(r.filled_count, r.required_count);
            const done = r.status === "FULFILLED";
            return (
              <div key={r.id} className="flex items-center gap-4 px-5 py-4">
                <div
                  className={
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl " +
                    (done
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-brand-50 text-brand-600")
                  }
                >
                  {done ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Radio className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">
                      {humanizeSkill(r.skill)}
                    </p>
                    <span className="text-sm font-medium text-slate-700">
                      {r.filled_count}/{r.required_count}
                    </span>
                  </div>
                  <Progress
                    className="mt-2"
                    value={rp}
                    tone={done ? "success" : "brand"}
                  />
                </div>
                <Badge tone={done ? "success" : "warning"} dot>
                  {done ? "Fulfilled" : "Open"}
                </Badge>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Volunteer task progress" description="Current volunteer-reported status. Updates every 5 seconds while this page is visible." />
        {roster.error && (
          <div role="alert" className="px-5 pb-4 text-sm text-amber-700">
            Could not refresh volunteer progress. {roster.data ? "Showing the last loaded statuses." : "Try again to load the team."}
            <Button variant="outline" className="ml-3" onClick={() => void roster.refetch()}>Retry</Button>
          </div>
        )}
        {roster.isLoading ? <Skeleton className="m-5 h-32" /> : roster.data && (
          <>
            <div className="grid grid-cols-1 gap-3 px-5 sm:grid-cols-3">
              {[["Accepted", accepted], ["En route", enRoute], ["Completed", completed]].map(([label, count]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-semibold">{count}</p>
                </div>
              ))}
            </div>
            <div className="p-5">
              <p className="mb-2 text-sm font-medium">Task completion: {completed} / {joined} joined volunteers ({pct(completed, joined)}%)</p>
              <Progress value={pct(completed, joined)} tone="success" />
              <p className="mt-2 text-xs text-muted-foreground">Team fill counts accepted places. Task completion counts volunteers who finished their assignment.</p>
            </div>
            {assignments.length === 0 ? <p className="px-5 pb-5 text-sm text-muted-foreground">No volunteers have been notified for this event yet.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-y bg-slate-50 text-muted-foreground"><tr>
                    {["Volunteer", "Assigned skill", "Status", "Last update"].map(label => <th key={label} className="px-5 py-3 font-medium">{label}</th>)}
                  </tr></thead>
                  <tbody className="divide-y">
                    {assignments.map(assignment => (
                      <tr key={assignment.id}>
                        <td className="px-5 py-4"><p className="font-semibold">{assignment.volunteer.full_name}</p>
                          <p className="text-xs text-muted-foreground">{assignment.volunteer.base_district || "District not set"}</p>
                          {assignment.volunteer.phone && <a className="text-brand-600" href={`tel:${assignment.volunteer.phone}`}>{assignment.volunteer.phone}</a>}
                        </td>
                        <td className="px-5 py-4">{humanizeSkill(assignment.requirement.skill)}</td>
                        <td className="px-5 py-4"><Badge tone={assignment.status === "COMPLETED" ? "success" : assignment.status === "EN_ROUTE" ? "purple" : "warning"}>{statusLabels[assignment.status]}</Badge></td>
                        <td className="px-5 py-4 text-muted-foreground">{formatDateTime(assignment.updated_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        size="sm"
        title="Close this event?"
        description="Closing stops further matching. This cannot be reopened from the console."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmClose(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={closeEvent.isPending}
              onClick={onClose}
            >
              Close event
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-900">{event.title}</span> will
          be marked as closed. Volunteers already assigned keep their tasks.
        </p>
      </Modal>
    </div>
  );
}
