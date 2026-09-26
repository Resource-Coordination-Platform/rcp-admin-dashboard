"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Radio,
  RefreshCw,
  Users,
  XCircle,
  Pencil,
  Plus,
} from "lucide-react";
import { useCloseEvent, useEvent, useRebroadcastEvent, useUpdateEvent } from "@/lib/hooks";
import { BROADCAST_META } from "@/lib/constants";
import { ApiError } from "@/lib/api";
import { formatDateTime, humanizeSkill, pct } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Progress,
  Skeleton,
  Field,
  Input,
  Textarea,
} from "@/components/ui/primitives";
import { BroadcastBadge, EventStatusBadge } from "@/components/ui/badges";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

export default function EventDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const toast = useToast();
  const { data: event, isLoading } = useEvent(id);
  const rebroadcast = useRebroadcastEvent();
  const closeEvent = useCloseEvent();
  const [confirmClose, setConfirmClose] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const canRebroadcast =
    event?.status === "DECLARED" || event?.status === "BROADCASTING";
  const canClose = event?.status !== "CLOSED";
  const canEdit = event?.status !== "CLOSED";

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
        <p className="text-sm text-muted-foreground">Event not found.</p>
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
              {event.latitude !== null && event.longitude !== null && (
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
              disabled={!canEdit}
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
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

      {isEditing && event && (
        <EditEventModal event={event} onClose={() => setIsEditing(false)} />
      )}
    </div>
  );
}

function EditEventModal({ event, onClose }: { event: any; onClose: () => void }) {
  const toast = useToast();
  const updateEvent = useUpdateEvent();

  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description || "");
  const [requirements, setRequirements] = useState<
    Array<{ skill: string; required_count: number; filled_count: number; isExisting: boolean }>
  >(
    event.requirements.map((r: any) => ({
      skill: r.skill,
      required_count: r.required_count,
      filled_count: r.filled_count,
      isExisting: true,
    }))
  );

  function updateReq(i: number, patch: Partial<typeof requirements[0]>) {
    setRequirements((r) => r.map((req, idx) => (idx === i ? { ...req, ...patch } : req)));
  }

  function removeReq(i: number) {
    const req = requirements[i];
    if (req.isExisting && req.filled_count > 0) {
      toast.error("Cannot remove", "This skill already has volunteers assigned.");
      return;
    }
    setRequirements((rs) => rs.filter((_, idx) => idx !== i));
  }

  async function submit() {
    const cleanedReqs = requirements
      .filter((r) => r.skill.trim())
      .map((r) => ({
        skill: r.skill.trim().toLowerCase().replace(/\s+/g, "_"),
        required_count: Math.max(1, Number(r.required_count) || 1),
      }));

    if (cleanedReqs.length === 0) {
      toast.error("Requirements needed", "Event must have at least one skill requirement.");
      return;
    }

    try {
      await updateEvent.mutateAsync({
        id: event.id,
        title: title.trim(),
        description: description.trim() || null,
        requirements: cleanedReqs,
      });
      toast.success("Event updated", "Changes have been saved successfully.");
      onClose();
    } catch (err: any) {
      toast.error("Could not update event", err.detail || "Unexpected error");
    }
  }

  const valid = title.trim().length >= 3 && requirements.some((r) => r.skill.trim());

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Edit event"
      description="Update event details and requirements."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={updateEvent.isPending} disabled={!valid} onClick={submit}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Event title" required hint="At least 3 characters">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Description">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </Field>

        <div className="rounded-xl border border-border bg-slate-50/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Volunteer requirements</p>
            </div>
            <Button
              size="sm"
              variant="subtle"
              onClick={() =>
                setRequirements((r) => [
                  ...r,
                  { skill: "", required_count: 1, filled_count: 0, isExisting: false },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add skill
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            {requirements.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={r.skill}
                  onChange={(e) => updateReq(i, { skill: e.target.value })}
                  placeholder="Skill (e.g. first_aid)"
                  className="h-9 flex-1"
                  disabled={r.isExisting}
                />
                <Input
                  type="number"
                  min={Math.max(1, r.filled_count)}
                  value={r.required_count}
                  onChange={(e) => updateReq(i, { required_count: Number(e.target.value) })}
                  className="h-9 w-24"
                />
                <button
                  onClick={() => removeReq(i)}
                  disabled={r.isExisting && r.filled_count > 0}
                  className="rounded-md px-2 py-1 text-xs text-slate-400 hover:text-red-600 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
