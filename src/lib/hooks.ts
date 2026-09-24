"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type {
  DisasterAlertCreate,
  DisasterAlertRead,
  DisasterEventCreate,
  DisasterEventRead,
  DispatchTaskCreate,
  DispatchTaskRead,
  DistrictMap,
  HelpRequestRead,
  InventoryItemCreate,
  InventoryItemRead,
  NeedVsFulfillmentRow,
  RequestStatus,
  RequestStatusSummary,
  ResourceCategoryCreate,
  ResourceCategoryRead,
  ResourceCategoryUpdate,
  UserRead,
  VolunteerDirectoryPage,
  VolunteerDirectoryQuery,
  AuditLogRead,
} from "./types";

export const qk = {
  auditLogs: ["audit-logs"] as const,
  alerts: ["alerts"] as const,
  categories: (includeInactive = false) =>
    ["categories", includeInactive ? "with-inactive" : "active"] as const,
  inventory: ["inventory"] as const,
  requests: (status?: RequestStatus) => ["requests", status ?? "all"] as const,
  events: ["events"] as const,
  event: (id: string) => ["events", id] as const,
  districts: ["districts"] as const,
  needVsFulfillment: ["reports", "need-vs-fulfillment"] as const,
  requestSummary: ["reports", "request-summary"] as const,
  volunteers: (query: VolunteerDirectoryQuery) =>
    ["volunteers", "directory", query] as const,
  volunteerSkills: ["volunteers", "skills"] as const,
};

// ---- Categories ----
export function useCategories(includeInactive = false) {
  return useQuery({
    queryKey: qk.categories(includeInactive),
    queryFn: () =>
      api.get<ResourceCategoryRead[]>("/api/inventory/categories", {
        query: { include_inactive: includeInactive || undefined },
      }),
  });
}

/** Both category lists plus anything that renders a category name or flow. */
function invalidateCategories(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["categories"] });
  qc.invalidateQueries({ queryKey: ["reports"] });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ResourceCategoryCreate) =>
      api.post<ResourceCategoryRead>("/api/inventory/categories", body),
    onSuccess: () => invalidateCategories(qc),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ResourceCategoryUpdate }) =>
      api.patch<ResourceCategoryRead>(`/api/inventory/categories/${id}`, body),
    onSuccess: () => {
      invalidateCategories(qc);
      // a changed workflow changes which actions each open request offers
      qc.invalidateQueries({ queryKey: ["requests"] });
    },
  });
}

/** Soft delete — the category stops accepting new requests but stays attached
 * to the ones already recorded against it. */
export function useDeactivateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.del<ResourceCategoryRead>(`/api/inventory/categories/${id}`),
    onSuccess: () => invalidateCategories(qc),
  });
}

// ---- Inventory ----
export function useInventory() {
  return useQuery({
    queryKey: qk.inventory,
    queryFn: () => api.get<InventoryItemRead[]>("/api/inventory/items"),
  });
}

export function useAddInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InventoryItemCreate) =>
      api.post<InventoryItemRead>("/api/inventory/items", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.inventory });
      qc.invalidateQueries({ queryKey: qk.needVsFulfillment });
    },
  });
}

export function useReserveStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      api.post<InventoryItemRead>(
        `/api/inventory/items/${id}/reserve`,
        undefined,
        { query: { quantity } },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.inventory });
      qc.invalidateQueries({ queryKey: qk.needVsFulfillment });
    },
  });
}

// ---- Help requests ----
export function useRequests(status?: RequestStatus) {
  return useQuery({
    queryKey: qk.requests(status),
    queryFn: () =>
      api.get<HelpRequestRead[]>("/api/requests", {
        query: status ? { status } : undefined,
      }),
  });
}

export function useGlobalRequests(status?: RequestStatus) {
  return useQuery({
    queryKey: ["global-requests", status],
    queryFn: () =>
      api.get<HelpRequestRead[]>("/api/volunteer/requests", {
        query: status ? { status } : undefined,
      }),
  });
}

export const usePendingRequests = useRequests;

export function useUpdateRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: RequestStatus }) =>
      api.patch<HelpRequestRead>(`/api/requests/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requests"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      setTimeout(() => qc.invalidateQueries({ queryKey: ["audit-logs"] }), 1500);
    },
  });
}

export function useClaimRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      victim_request_id: string;
      category_id: string;
      quantity_needed?: number;
      urgency?: string;
    }) => api.post<HelpRequestRead>("/api/requests/claim", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requests"] });
      qc.invalidateQueries({ queryKey: ["global-requests"] });
      setTimeout(() => qc.invalidateQueries({ queryKey: ["audit-logs"] }), 1500);
    },
  });
}

export function useDeleteRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.del(`/api/requests/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requests"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

// ---- Dispatch ----
export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get<any[]>("/api/volunteers/tasks"),
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      api.patch(`/api/volunteers/tasks/${taskId}/status`, null, {
        query: { new_status: status },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDispatchTask() {
  return useMutation({
    mutationFn: (body: DispatchTaskCreate) =>
      api.post<DispatchTaskRead>("/api/volunteers/tasks", body),
  });
}

// ---- Volunteer directory ----
// Served by the volunteer service (global volunteer pool), not logistics.
export function useVolunteerDirectory(
  query: VolunteerDirectoryQuery = {},
  enabled = true,
) {
  return useQuery({
    queryKey: qk.volunteers(query),
    queryFn: () =>
      api.get<VolunteerDirectoryPage>("/api/volunteer/directory", {
        query: {
          q: query.q,
          skill: query.skill,
          district: query.district,
          city: query.city,
          available_only: query.available_only,
          limit: query.limit ?? 50,
          offset: query.offset ?? 0,
        },
      }),
    enabled,
    placeholderData: (previous) => previous, // keep the list while refiltering
  });
}

/** Skill slugs actually present in the pool — powers the filter dropdown. */
export function useVolunteerSkills() {
  return useQuery({
    queryKey: qk.volunteerSkills,
    queryFn: () => api.get<string[]>("/api/volunteer/directory/skills"),
    staleTime: 1000 * 60 * 5,
  });
}

// ---- Reports ----
export function useNeedVsFulfillment() {
  return useQuery({
    queryKey: qk.needVsFulfillment,
    queryFn: () =>
      api.get<NeedVsFulfillmentRow[]>("/api/reports/need-vs-fulfillment"),
  });
}

export function useRequestSummary() {
  return useQuery({
    queryKey: qk.requestSummary,
    queryFn: async () => {
      const requests = await api.get<HelpRequestRead[]>("/api/requests");
      const summary: RequestStatusSummary = {};
      for (const req of requests) {
        const status = (req.status || "pending").toLowerCase() as RequestStatus;
        summary[status] = (summary[status] || 0) + 1;
      }
      return summary;
    },
  });
}

// ---- Disaster events ----
export function useEvents() {
  return useQuery({
    queryKey: qk.events,
    queryFn: () => api.get<DisasterEventRead[]>("/api/volunteer/events"),
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: qk.event(id),
    queryFn: () => api.get<DisasterEventRead>(`/api/volunteer/events/${id}`),
    enabled: !!id,
  });
}

export function useDistricts() {
  return useQuery({
    queryKey: qk.districts,
    queryFn: () => api.get<DistrictMap>("/api/volunteer/events/districts"),
    staleTime: 1000 * 60 * 60,
  });
}

export function useDeclareEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DisasterEventCreate) =>
      api.post<DisasterEventRead>("/api/volunteer/events", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.events }),
  });
}

export function useRebroadcastEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<DisasterEventRead>(`/api/volunteer/events/${id}/rebroadcast`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: qk.events });
      qc.invalidateQueries({ queryKey: qk.event(id) });
    },
  });
}

export function useCloseEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<DisasterEventRead>(`/api/volunteer/events/${id}/close`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: qk.events });
      qc.invalidateQueries({ queryKey: qk.event(id) });
    },
  });
}

// ---- Team (register coordinator) ----
export function useCoordinators() {
  return useQuery({
    queryKey: ["coordinators"],
    queryFn: () => api.get<UserRead[]>("/api/auth/tenants/me/users"),
  });
}

export function useRegisterCoordinator(tenantSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      email: string;
      password: string;
      full_name: string;
      phone?: string;
    }) =>
      api.post<UserRead>(
        `/api/auth/tenants/${tenantSlug}/register`,
        { ...body, user_type: "COORDINATOR" },
        { auth: false },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coordinators"] });
      setTimeout(() => qc.invalidateQueries({ queryKey: ["audit-logs"] }), 1500);
    },
  });
}

export function useUpdateCoordinator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      full_name,
      phone,
    }: {
      userId: string;
      full_name?: string;
      phone?: string;
    }) =>
      api.patch<UserRead>(`/api/auth/tenants/me/users/${userId}`, {
        full_name,
        phone,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coordinators"] });
      setTimeout(() => qc.invalidateQueries({ queryKey: ["audit-logs"] }), 1500);
    },
  });
}

export function useDeleteCoordinator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.del(`/api/auth/tenants/me/users/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coordinators"] });
      setTimeout(() => qc.invalidateQueries({ queryKey: ["audit-logs"] }), 1500);
    },
  });
}

// ---- Emergency Disaster Alerts (SRS 3.1.5.2 & 3.1.5.3) ----
export function useAlerts() {
  return useQuery({
    queryKey: qk.alerts,
    queryFn: () => api.get<DisasterAlertRead[]>("/api/alerts"),
  });
}

export function useBroadcastAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DisasterAlertCreate) =>
      api.post<DisasterAlertRead>("/api/alerts", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.alerts }),
  });
}

// ---- Audit Logs ----
export function useAuditLogs() {
  return useQuery({
    queryKey: qk.auditLogs,
    queryFn: () => api.get<AuditLogRead[]>("/api/audit-logs"),
  });
}
