// Types mirror the backend Pydantic schemas exposed through the gateway.
// Source of truth: services/{iam,logistics,analytics,volunteer}/app/schemas.

export type UserType =
  | "VOLUNTEER"
  | "VICTIM"
  | "DONATOR"
  | "TENANT_ADMIN"
  | "COORDINATOR";

export type Role =
  | "super_admin"
  | "tenant_admin"
  | "coordinator"
  | "volunteer"
  | "victim"
  | "donator"
  | "team_lead";

// ---- Auth (IAM) ----
export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface JwtClaims {
  sub: string;
  user_type: UserType;
  roles: Role[];
  tenant_id?: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  jti: string;
}

export interface TenantRead {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
}

export interface UserRead {
  id: string;
  tenant_id: string | null;
  user_type: UserType;
  email: string;
  full_name: string;
  phone: string | null;
  status: string;
  roles: Role[];
  created_at: string;
}

export interface ProfileUpdate {
  full_name?: string;
  phone?: string | null;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
}

export interface AdminPasswordReset {
  new_password: string;
}

// ---- Logistics: requests ----
export type RequestStatus =
  | "pending"
  | "verified"
  | "approved"
  | "in_progress"
  | "fulfilled"
  | "rejected"
  | "cancelled";

export type UrgencyLevel = "low" | "medium" | "high" | "critical";

export interface HelpRequestRead {
  id: string;
  tenant_id: string;
  category_id: string;
  description: string;
  quantity_needed: number;
  urgency: UrgencyLevel;
  status: RequestStatus;
  /** Answers to the category's admin-defined intake form, keyed by field key. */
  extra_fields: Record<string, unknown> | null;
  area: string | null;
  is_sensitive: boolean;
  created_at: string;
  verified_at: string | null;
  fulfilled_at: string | null;
}

export interface HelpRequestCreate {
  category_id: string;
  description: string;
  quantity_needed?: number;
  urgency?: UrgencyLevel;
  requester_name?: string | null;
  requester_phone?: string | null;
  area?: string | null;
  is_sensitive?: boolean;
  extra_fields?: Record<string, unknown> | null;
}

// ---- Logistics: inventory ----
export type InventoryStatus = "available" | "reserved" | "depleted" | "expired";

// ---- Logistics: the customizable workflow engine ----
// A resource category carries two admin-authored JSON definitions. Both are
// validated server-side and enforced on every request that uses the category,
// so these types must match the backend exactly — an extra or misnamed key is
// a 422, not a silently ignored property.
//   form_schema → services/logistics/app/services/form_schema.py
//   workflow    → services/logistics/app/services/workflow.py

export type FormFieldType =
  | "text"
  | "textarea"
  | "integer"
  | "number"
  | "boolean"
  | "date"
  | "select"
  | "multiselect"
  | "phone";

/** One field spec. `key` (not `name`) is the wire contract. */
export interface FormFieldSpec {
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  /** select/multiselect only */
  options?: string[];
  /** integer/number only */
  min?: number;
  max?: number;
  /** text/textarea/phone only */
  max_length?: number;
  help_text?: string;
}

/** Approval flow: which platform states this category uses, and how they connect. */
export interface WorkflowDefinition {
  initial: RequestStatus;
  transitions: Partial<Record<RequestStatus, RequestStatus[]>>;
}

export interface ResourceCategoryRead {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  form_schema: FormFieldSpec[] | null;
  /** null means the category runs on the platform default flow. */
  workflow: WorkflowDefinition | null;
  is_active: boolean;
}

export interface ResourceCategoryCreate {
  name: string;
  description?: string | null;
  unit?: string;
  form_schema?: FormFieldSpec[] | null;
  workflow?: WorkflowDefinition | null;
}

/** Partial update; an explicit null on form_schema/workflow clears it back to
 * the platform default. Keys left out are untouched. */
export interface ResourceCategoryUpdate {
  name?: string;
  description?: string | null;
  unit?: string;
  form_schema?: FormFieldSpec[] | null;
  workflow?: WorkflowDefinition | null;
  is_active?: boolean;
}

export interface InventoryItemRead {
  id: string;
  category_id: string;
  name: string;
  quantity_total: number;
  quantity_reserved: number;
  quantity_available: number;
  status: InventoryStatus;
  expiry_date: string | null;
  storage_location: string | null;
  created_at: string;
}

export interface InventoryItemCreate {
  category_id: string;
  name: string;
  quantity_total: number;
  expiry_date?: string | null;
  storage_location?: string | null;
  donor_name?: string | null;
}

// ---- Logistics: dispatch ----
export type TaskStatus =
  | "assigned"
  | "accepted"
  | "in_progress"
  | "completed"
  | "declined"
  | "cancelled";

export interface DispatchTaskRead {
  id: string;
  request_id: string;
  volunteer_user_id: string;
  title: string;
  instructions: string | null;
  status: TaskStatus;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
}

export interface DispatchTaskCreate {
  request_id: string;
  volunteer_user_id: string;
  title: string;
  instructions?: string | null;
}

// ---- Volunteer service: directory ----
// Volunteers are global actors owned by the volunteer service; the portal
// reads them through GET /api/volunteer/directory. (The old logistics
// /api/volunteers/available endpoint is deprecated — its table has no writer.)
export interface VolunteerDirectoryEntry {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  base_district: string | null;
  city: string | null;
  available_status: boolean;
  skills: string[];
  created_at: string;
}

export interface VolunteerDirectoryPage {
  items: VolunteerDirectoryEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface VolunteerDirectoryQuery {
  q?: string;
  skill?: string;
  district?: string;
  city?: string;
  available_only?: boolean;
  limit?: number;
  offset?: number;
}

// ---- Analytics ----
export interface NeedVsFulfillmentRow {
  category_id: string;
  category: string;
  open_requests: number;
  fulfilled_requests: number;
  quantity_needed: number;
  stock_available: number;
}

export type RequestStatusSummary = Partial<Record<RequestStatus, number>>;

// ---- Volunteer service: disaster events ----
export type EventStatus = "DECLARED" | "BROADCASTING" | "TEAM_FORMED" | "CLOSED";
export type BroadcastType = "RADIUS_L1" | "RADIUS_L2" | "TARGETED";
export type RequirementStatus = "OPEN" | "FULFILLED";

export interface RequirementRead {
  id: string;
  skill: string;
  required_count: number;
  filled_count: number;
  status: RequirementStatus;
}

export interface RequirementCreate {
  skill: string;
  required_count: number;
}

export interface DisasterEventRead {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  source_district: string;
  latitude: number | null;
  longitude: number | null;
  broadcast_type: BroadcastType;
  target_districts: string[];
  status: EventStatus;
  requirements: RequirementRead[];
  created_at: string;
}

export interface DisasterEventCreate {
  title: string;
  description?: string | null;
  source_district: string;
  latitude?: number | null;
  longitude?: number | null;
  broadcast_type?: BroadcastType;
  target_districts?: string[] | null;
  requirements: RequirementCreate[];
}

export type DistrictMap = Record<string, string[]>;

export interface ApiError {
  status: number;
  detail: string;
}
