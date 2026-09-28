"use client";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export interface GoodsDelivery {
  id: string; victim_request_id: string; district: string; status: string;
  pickup_name: string; pickup_latitude: number; pickup_longitude: number;
  destination_latitude: number | null; destination_longitude: number | null;
  volunteer_name: string | null; created_at: string; updated_at: string;
  handed_over_at: string | null; code_verified_at: string | null;
  volunteer_confirmed_at: string | null; victim_confirmed_at: string | null;
  completed_at: string | null;
  lines: { id: string; name: string; quantity: number; unit: string }[];
  history: { action: string; created_at: string }[];
}
export const goodsStatus: Record<string, string> = {
  RESERVED: 'Stock reserved ? ready to send', OPEN: 'Broadcast to district', ACCEPTED: 'Awaiting centre collection', COLLECTED: 'Goods handed over',
  EN_ROUTE: 'En route to victim', CODE_VERIFIED: 'Victim code verified',
  AWAITING_CONFIRMATION: 'Awaiting both confirmations', COMPLETED: 'Delivery completed',
};
export function useGoodsDeliveries() {
  return useQuery({ queryKey: ['goods-deliveries'], queryFn: () => api.get<GoodsDelivery[]>('/api/volunteers/deliveries'), refetchInterval: 5000 });
}
export function useGoodsDeliveryAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => api.post<GoodsDelivery>(`/api/volunteers/deliveries/${id}/${action}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goods-deliveries'] }); qc.invalidateQueries({ queryKey: ['inventory'] }); qc.invalidateQueries({ queryKey: ['requests'] }); },
  });
}
export function useCreateGoodsDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { victim_request_id: string; district: string; lines: { inventory_item_id: string; quantity: number }[] }) => api.post<GoodsDelivery>('/api/volunteers/deliveries', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goods-deliveries'] });
      qc.invalidateQueries({ queryKey: ['inventory'] }); qc.invalidateQueries({ queryKey: ['requests'] });
      qc.invalidateQueries({ queryKey: ['global-requests'] });
    },
  });
}

export function useVerifyHelpRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/requests/help/${id}/verify`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requests'] }); qc.invalidateQueries({ queryKey: ['global-requests'] }); },
  });
}
