import type {
  BroadcastType,
  EventStatus,
  FormFieldType,
  InventoryStatus,
  RequestStatus,
  TaskStatus,
  UrgencyLevel,
} from "./types";

type Tone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple";

export const REQUEST_STATUS_META: Record<
  RequestStatus,
  { label: string; tone: Tone }
> = {
  pending: { label: "Pending", tone: "neutral" },
  verified: { label: "Verified", tone: "info" },
  approved: { label: "Approved", tone: "brand" },
  in_progress: { label: "In progress", tone: "warning" },
  fulfilled: { label: "Fulfilled", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export const REQUEST_STATUSES = Object.keys(
  REQUEST_STATUS_META,
) as RequestStatus[];

// Mirrors workflow.py TERMINAL_STATES. A flow that cannot reach one of these
// is a trap in a crisis, so the builder refuses to save one.
export const TERMINAL_STATUSES: RequestStatus[] = [
  "fulfilled",
  "rejected",
  "cancelled",
];

/** States a category may transition *from* — terminal states are final. */
export const SOURCE_STATUSES = REQUEST_STATUSES.filter(
  (s) => !TERMINAL_STATUSES.includes(s),
);

// Mirrors workflow.py DEFAULT_TRANSITIONS — what a category with no workflow
// of its own runs on. This is a fallback, NOT the source of truth: the states
// offered for a given request come from its category (see lib/workflow.ts).
export const DEFAULT_TRANSITIONS: Partial<
  Record<RequestStatus, RequestStatus[]>
> = {
  pending: ["verified", "rejected", "cancelled"],
  verified: ["approved", "rejected", "cancelled"],
  approved: ["in_progress", "cancelled"],
  in_progress: ["fulfilled", "cancelled"],
};

export const DEFAULT_INITIAL_STATUS: RequestStatus = "pending";

// Mirrors form_schema.py FieldType.
export const FIELD_TYPE_META: Record<
  FormFieldType,
  { label: string; hint: string }
> = {
  text: { label: "Short text", hint: "Single line, up to 500 characters" },
  textarea: { label: "Long text", hint: "Paragraph, up to 5000 characters" },
  integer: { label: "Whole number", hint: "No decimals" },
  number: { label: "Number", hint: "Decimals allowed" },
  boolean: { label: "Yes / No", hint: "Checkbox" },
  date: { label: "Date", hint: "ISO date (YYYY-MM-DD)" },
  select: { label: "Single choice", hint: "Pick one of your options" },
  multiselect: { label: "Multiple choice", hint: "Pick any of your options" },
  phone: { label: "Phone", hint: "Up to 30 characters" },
};

export const FIELD_TYPES = Object.keys(FIELD_TYPE_META) as FormFieldType[];

export const URGENCY_META: Record<
  UrgencyLevel,
  { label: string; tone: Tone; rank: number }
> = {
  low: { label: "Low", tone: "neutral", rank: 0 },
  medium: { label: "Medium", tone: "info", rank: 1 },
  high: { label: "High", tone: "warning", rank: 2 },
  critical: { label: "Critical", tone: "danger", rank: 3 },
};

export const INVENTORY_STATUS_META: Record<
  InventoryStatus,
  { label: string; tone: Tone }
> = {
  available: { label: "Available", tone: "success" },
  reserved: { label: "Reserved", tone: "warning" },
  depleted: { label: "Depleted", tone: "danger" },
  expired: { label: "Expired", tone: "neutral" },
};

export const TASK_STATUS_META: Record<TaskStatus, { label: string; tone: Tone }> =
  {
    assigned: { label: "Assigned", tone: "info" },
    accepted: { label: "Accepted", tone: "brand" },
    in_progress: { label: "In progress", tone: "warning" },
    completed: { label: "Completed", tone: "success" },
    declined: { label: "Declined", tone: "danger" },
    cancelled: { label: "Cancelled", tone: "neutral" },
  };

export const EVENT_STATUS_META: Record<EventStatus, { label: string; tone: Tone }> =
  {
    DECLARED: { label: "Declared", tone: "info" },
    BROADCASTING: { label: "Broadcasting", tone: "warning" },
    TEAM_FORMED: { label: "Team formed", tone: "success" },
    CLOSED: { label: "Closed", tone: "neutral" },
  };

export const BROADCAST_META: Record<
  BroadcastType,
  { label: string; description: string }
> = {
  RADIUS_L1: {
    label: "Local (L1)",
    description: "Source district only",
  },
  RADIUS_L2: {
    label: "Regional (L2)",
    description: "Source district + neighbouring districts",
  },
  TARGETED: {
    label: "Targeted",
    description: "Explicit distant districts, bypassing adjacency",
  },
};

// Fallback district list (the live list is fetched from /api/volunteer/events/districts)
export const SRI_LANKA_DISTRICTS = [
  "Ampara",
  "Anuradhapura",
  "Badulla",
  "Batticaloa",
  "Colombo",
  "Galle",
  "Gampaha",
  "Hambantota",
  "Jaffna",
  "Kalutara",
  "Kandy",
  "Kegalle",
  "Kilinochchi",
  "Kurunegala",
  "Mannar",
  "Matale",
  "Matara",
  "Moneragala",
  "Mullaitivu",
  "Nuwara Eliya",
  "Polonnaruwa",
  "Puttalam",
  "Ratnapura",
  "Trincomalee",
  "Vavuniya",
];

export const NAV_STORAGE_KEY = "rcp.sidebar.collapsed";
