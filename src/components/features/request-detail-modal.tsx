"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  ClipboardList,
  MapPin,
  Package,
  Search,
  Send,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import {
  useDispatchTask,
  useUpdateRequestStatus,
  useVolunteerDirectory,
  useVolunteerSkills,
} from "@/lib/hooks";
import { DEFAULT_TRANSITIONS, REQUEST_STATUS_META } from "@/lib/constants";
import type {
  HelpRequestRead,
  RequestStatus,
  ResourceCategoryRead,
  VolunteerDirectoryEntry,
} from "@/lib/types";
import {
  allowedNext,
  initialStatus,
  isTerminal,
  reachableFrom,
} from "@/lib/workflow";
import { formatAnswer } from "@/lib/form-schema";
import { ApiError } from "@/lib/api";
import { colorFromString, formatDateTime, humanizeSkill, initials } from "@/lib/format";
import { Modal } from "@/components/ui/modal";
import {
  Badge,
  Button,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import { RequestStatusBadge, UrgencyBadge } from "@/components/ui/badges";
import { useToast } from "@/components/ui/toast";

export function RequestDetailModal({
  request,
  category,
  onClose,
  onChanged,
}: {
  request: HelpRequestRead;
  /** Undefined only while the category list is still loading. */
  category?: ResourceCategoryRead;
  onClose: () => void;
  onChanged: (r: HelpRequestRead) => void;
}) {
  const toast = useToast();
  const updateStatus = useUpdateRequestStatus();
  const [showDispatch, setShowDispatch] = useState(false);

  // The actions offered come from the category's own approval flow, not a
  // fixed map — that is what makes the workflow engine customizable. Anything
  // else here would offer buttons the backend rejects.
  const nextStatuses = allowedNext(category?.workflow, request.status);

  // Dispatch is gated on Approved/In progress by the logistics service
  // (dispatch.assign_task), independently of the category's flow — so a custom
  // flow that never passes through Approved can never dispatch. Say which of
  // the two it is rather than telling the admin to "approve" a state their
  // flow does not have.
  const canDispatch =
    request.status === "approved" || request.status === "in_progress";
  const flowReaches = reachableFrom(
    initialStatus(category?.workflow),
    category?.workflow?.transitions ?? DEFAULT_TRANSITIONS,
  );
  const dispatchHint = canDispatch
    ? "Assign an available volunteer to fulfil this request."
    : flowReaches.has("approved") || flowReaches.has("in_progress")
      ? "Approve this request first to enable dispatch."
      : "This category's approval flow never reaches Approved, so volunteer dispatch is unavailable on it.";

  async function advance(status: RequestStatus) {
    try {
      const updated = await updateStatus.mutateAsync({
        id: request.id,
        status,
      });
      toast.success(
        "Status updated",
        `Request is now “${REQUEST_STATUS_META[status].label}”.`,
      );
      onChanged(updated);
    } catch (err) {
      toast.error(
        "Could not update status",
        err instanceof ApiError ? err.detail : "Unexpected error",
      );
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Request details"
      description={category?.name ?? "Uncategorized"}
      footer={
        <>
          {nextStatuses.length === 0 && (
            <p className="mr-auto text-xs text-muted-foreground">
              {isTerminal(request.status)
                ? `“${REQUEST_STATUS_META[request.status].label}” is a final state in this category's flow.`
                : "This category's approval flow offers no further steps from here."}
            </p>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {nextStatuses.map((s) => (
            <Button
              key={s}
              variant={
                s === "rejected" || s === "cancelled" ? "danger" : "primary"
              }
              loading={updateStatus.isPending}
              onClick={() => advance(s)}
            >
              Mark {REQUEST_STATUS_META[s].label}
            </Button>
          ))}
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <RequestStatusBadge status={request.status} />
          <UrgencyBadge level={request.urgency} />
          {request.is_sensitive && (
            <Badge tone="warning">
              <ShieldAlert className="mr-1 h-3.5 w-3.5" />
              Sensitive
            </Badge>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Description
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-800">
            {request.description}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Detail
            icon={Package}
            label="Quantity needed"
            value={String(request.quantity_needed)}
          />
          <Detail
            icon={MapPin}
            label="Area"
            value={request.area ?? "Not specified"}
          />
          <Detail
            icon={CalendarClock}
            label="Created"
            value={formatDateTime(request.created_at)}
          />
          <Detail
            icon={CalendarClock}
            label="Verified"
            value={formatDateTime(request.verified_at)}
          />
        </div>

        <IntakeAnswers request={request} category={category} />

        {/* Dispatch */}
        <div className="rounded-xl border border-border bg-slate-50/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Dispatch a volunteer
              </p>
              <p className="text-xs text-muted-foreground">{dispatchHint}</p>
            </div>
            <Button
              size="sm"
              variant={showDispatch ? "outline" : "subtle"}
              disabled={!canDispatch}
              onClick={() => setShowDispatch((v) => !v)}
            >
              {showDispatch ? "Hide" : "Dispatch"}
            </Button>
          </div>

          {showDispatch && canDispatch && (
            <DispatchPanel request={request} onDispatched={onClose} />
          )}
        </div>
      </div>
    </Modal>
  );
}

/**
 * The answers to the category's admin-defined intake form. Ordered by the
 * category's current definition; anything the request carries that the
 * definition no longer mentions is still shown — a redefinition is never
 * applied retroactively, so old requests keep the fields they were validated
 * against and a coordinator must still be able to read them.
 */
function IntakeAnswers({
  request,
  category,
}: {
  request: HelpRequestRead;
  category?: ResourceCategoryRead;
}) {
  const answers = request.extra_fields ?? {};
  const specs = category?.form_schema ?? [];
  const known = specs.filter((spec) => spec.key in answers);
  const retired = Object.keys(answers).filter(
    (key) => !specs.some((spec) => spec.key === key),
  );

  if (known.length === 0 && retired.length === 0) return null;

  return (
    <div className="rounded-xl border border-border p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <ClipboardList className="h-3.5 w-3.5" />
        {category?.name ?? "Category"} intake
      </p>
      <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {known.map((spec) => (
          <div key={spec.key}>
            <dt className="text-xs text-muted-foreground">{spec.label}</dt>
            <dd className="text-sm font-medium text-slate-900">
              {formatAnswer(spec, answers[spec.key])}
            </dd>
          </div>
        ))}
        {retired.map((key) => (
          <div key={key}>
            <dt className="flex items-center gap-1 text-xs text-muted-foreground">
              {key}
              <Badge tone="neutral">removed from form</Badge>
            </dt>
            <dd className="text-sm font-medium text-slate-900">
              {formatAnswer(undefined, answers[key])}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-inset ring-border">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function DispatchPanel({
  request,
  onDispatched,
}: {
  request: HelpRequestRead;
  onDispatched: () => void;
}) {
  const toast = useToast();
  const dispatch = useDispatchTask();
  const [skill, setSkill] = useState("");
  // The request's area is the natural starting filter; it matches against
  // the volunteer's city (districts are picked from the dropdown instead).
  const [area, setArea] = useState(request.area ?? "");
  const [selected, setSelected] = useState<VolunteerDirectoryEntry | null>(null);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");

  const [debouncedArea, setDebouncedArea] = useState(area);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedArea(area), 300);
    return () => clearTimeout(t);
  }, [area]);

  const skills = useVolunteerSkills();
  const volunteers = useVolunteerDirectory(
    useMemo(
      () => ({
        skill: skill || undefined,
        city: debouncedArea.trim() || undefined,
        available_only: true, // dispatch only makes sense for available volunteers
        limit: 25,
      }),
      [skill, debouncedArea],
    ),
  );
  const results = volunteers.data?.items ?? [];

  async function submit() {
    if (!selected) return;
    try {
      await dispatch.mutateAsync({
        request_id: request.id,
        volunteer_user_id: selected.user_id,
        title: title.trim() || `Fulfil: ${request.description.slice(0, 40)}`,
        instructions: instructions.trim() || undefined,
      });
      toast.success(
        "Volunteer dispatched",
        `Task assigned to ${selected.full_name}.`,
      );
      onDispatched();
    } catch (err) {
      toast.error(
        "Dispatch failed",
        err instanceof ApiError ? err.detail : "Unexpected error",
      );
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Filter by skill">
          <Select value={skill} onChange={(e) => setSkill(e.target.value)}>
            <option value="">Any skill</option>
            {(skills.data ?? []).map((s) => (
              <option key={s} value={s}>
                {humanizeSkill(s)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Filter by city">
          <Input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="e.g. Colombo"
          />
        </Field>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Available volunteers
        </p>
        {volunteers.isLoading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Searching…
          </p>
        ) : volunteers.error ? (
          <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-red-200 py-6 text-center">
            <p className="text-sm text-red-600">
              {volunteers.error instanceof ApiError
                ? volunteers.error.detail
                : "Could not reach the volunteer service."}
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border py-6 text-center">
            <Search className="h-5 w-5 text-slate-300" />
            <p className="text-sm text-muted-foreground">
              No available volunteers match these filters.
            </p>
          </div>
        ) : (
          <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
            {results.map((v) => {
              const active = selected?.user_id === v.user_id;
              const location =
                [v.city, v.base_district].filter(Boolean).join(", ") ||
                "No district set";
              return (
                <button
                  key={v.user_id}
                  onClick={() => setSelected(v)}
                  className={
                    "flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition " +
                    (active
                      ? "border-brand-400 bg-brand-50 ring-1 ring-brand-200"
                      : "border-border bg-white hover:border-brand-200")
                  }
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: colorFromString(v.full_name) }}
                  >
                    {initials(v.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {v.full_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {location}
                      {v.skills.length > 0
                        ? " · " + v.skills.map(humanizeSkill).join(", ")
                        : ""}
                    </p>
                  </div>
                  {active && (
                    <Badge tone="brand">
                      <UserRound className="mr-1 h-3 w-3" />
                      Selected
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <div className="space-y-3 border-t border-border pt-4">
          <Field label="Task title" required>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Fulfil: ${request.description.slice(0, 40)}`}
            />
          </Field>
          <Field label="Instructions">
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Pickup location, contact details, notes…"
            />
          </Field>
          <div className="flex justify-end">
            <Button loading={dispatch.isPending} onClick={submit}>
              <Send className="h-4 w-4" />
              Dispatch to {selected.full_name}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
