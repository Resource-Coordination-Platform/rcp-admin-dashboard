"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { useAuth } from "./auth";

export interface SafeZone {
  id: string;
  tenant_id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
}
export type SafeZoneCreate = Pick<SafeZone, "name" | "lat" | "lng"> & {
  type: "camp" | "medical";
};

export function useSafeZones() {
  const { claims } = useAuth();
  return useQuery({
    queryKey: ["safe-zones", claims?.tenant_id],
    queryFn: () => api.get<SafeZone[]>("/api/safe-zones"),
    refetchInterval: 30000,
  });
}
export function useCreateSafeZone() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (zone: SafeZoneCreate) =>
      api.post<SafeZone>("/api/safe-zones", zone),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["safe-zones"] }),
  });
}
