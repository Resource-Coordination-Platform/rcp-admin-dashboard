"use client";

import {
  BROADCAST_META,
  EVENT_STATUS_META,
  INVENTORY_STATUS_META,
  REQUEST_STATUS_META,
  TASK_STATUS_META,
  URGENCY_META,
} from "@/lib/constants";
import type {
  BroadcastType,
  EventStatus,
  InventoryStatus,
  RequestStatus,
  TaskStatus,
  UrgencyLevel,
} from "@/lib/types";
import { Badge } from "./primitives";

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const m = REQUEST_STATUS_META[status];
  return (
    <Badge tone={m.tone} dot>
      {m.label}
    </Badge>
  );
}

export function UrgencyBadge({ level }: { level: UrgencyLevel }) {
  const m = URGENCY_META[level];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function InventoryStatusBadge({ status }: { status: InventoryStatus }) {
  const m = INVENTORY_STATUS_META[status];
  return (
    <Badge tone={m.tone} dot>
      {m.label}
    </Badge>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const m = TASK_STATUS_META[status];
  return (
    <Badge tone={m.tone} dot>
      {m.label}
    </Badge>
  );
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const m = EVENT_STATUS_META[status];
  return (
    <Badge tone={m.tone} dot>
      {m.label}
    </Badge>
  );
}

export function BroadcastBadge({ type }: { type: BroadcastType }) {
  return <Badge tone="purple">{BROADCAST_META[type].label}</Badge>;
}
