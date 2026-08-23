"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./api";
import type {
  AdminPasswordReset,
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
} from "./types";

export const qk = {
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
// `includeInactive` matters: retired categories keep their history but stop
// accepting requests, and the admin still has to be able to see and reactivate
// them.
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
      api.get<HelpRequestRead[]>("/api/volunteer/requests/pending"),
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
    },
  });
}

// ---- Dispatch ----
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
    queryFn: () =>
      api.get<RequestStatusSummary>("/api/reports/request-summary"),
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
export function useRegisterCoordinator(tenantSlug: string) {
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
  });
}

export function useAdminResetUserPassword() {
  return useMutation({
    mutationFn: ({
      userId,
      body,
    }: {
      userId: string;
      body: AdminPasswordReset;
    }) => api.post<{ message: string; user_id: string }>(`/api/admin/users/${userId}/reset-password`, body),
  });
}
