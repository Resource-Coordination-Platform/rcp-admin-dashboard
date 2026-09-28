"use client";
import { isExpiredStock } from "@/lib/inventory";
import { useState, useMemo, useEffect } from 'react';
import { useInventory, useDistricts, useCategories } from '@/lib/hooks';
import { useCreateGoodsDelivery } from '@/lib/deliveries';
import type { HelpRequestRead, InventoryItemRead } from '@/lib/types';
import { Modal } from '@/components/ui/modal';
import { Button, Input, Select, Badge } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';

export function ClaimRequestModal({ request, isOpen, onClose, onSuccess }: {
  request: HelpRequestRead; isOpen: boolean; onClose: () => void; onSuccess?: () => void;
}) {
  const inventory = useInventory();
  const districts = useDistricts();
  const categories = useCategories(true);
  const create = useCreateGoodsDelivery();
  const toast = useToast();
  const [district, setDistrict] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const stock = (inventory.data ?? []).filter(i => i.quantity_available > 0 && !isExpiredStock(i));
  const stockIds = new Set(stock.map(item => item.id));
  const lines = Object.entries(quantities).filter(([id, quantity]) => stockIds.has(id) && quantity > 0).map(([inventory_item_id, quantity]) => ({ inventory_item_id, quantity }));

  // Build a set of category_ids that the victim requested
  const requestedCategoryIds = useMemo(() => new Set(
    (request.requested_items ?? []).map(item => item.category_id).filter(Boolean)
  ), [request.requested_items]);

  // Map category_id → requested quantity for auto-fill
  const requestedByCategory = useMemo(() => {
    const map = new Map<string, { label: string; quantity: number; unit: string }>();
    for (const item of request.requested_items ?? []) {
      if (item.category_id) map.set(item.category_id, { label: item.label, quantity: item.quantity ?? 0, unit: item.unit });
    }
    return map;
  }, [request.requested_items]);

  // Split stock into matched (items whose category matches a victim request) and other
  const { matched, other } = useMemo(() => {
    const m: InventoryItemRead[] = [];
    const o: InventoryItemRead[] = [];
    for (const item of stock) {
      if (requestedCategoryIds.has(item.category_id)) m.push(item);
      else o.push(item);
    }
    return { matched: m, other: o };
  }, [stock, requestedCategoryIds]);

  // Auto-fill quantities for matched items on first load
  useEffect(() => {
    if (!inventory.isLoading && matched.length > 0 && Object.keys(quantities).length === 0) {
      const auto: Record<string, number> = {};
      for (const item of matched) {
        const requested = requestedByCategory.get(item.category_id);
        if (requested) {
          auto[item.id] = Math.min(requested.quantity, item.quantity_available);
        }
      }
      if (Object.keys(auto).length > 0) setQuantities(auto);
    }
  }, [inventory.isLoading, matched, requestedByCategory, quantities]);

  const submit = async () => {
    try {
      await create.mutateAsync({ victim_request_id: request.id, district, lines });
      toast.success('Stock reserved', 'Send the delivery assignment from this help request when ready.');
      onSuccess?.(); onClose();
    } catch (e) { toast.error('Could not reserve stock', e instanceof Error ? e.message : 'Please retry'); }
  };

  if (request.status.toUpperCase() !== 'VERIFIED') return <Modal open={isOpen} onClose={onClose} title="Manage help request">
    <p className="text-sm">Verify this request in Help Requests before reserving supplies and sending a volunteer.</p>
    <a className="mt-4 inline-block text-brand-600 font-medium" href="/requests">Open Help Requests</a>
  </Modal>;

  const renderStockItem = (item: InventoryItemRead, isMatch: boolean) => {
    const cat = categories.data?.find(c => c.id === item.category_id);
    const requested = requestedByCategory.get(item.category_id);
    return (
      <div key={item.id} className={`flex items-center gap-4 rounded-lg border p-3 ${isMatch ? 'border-amber-300 bg-amber-50/50' : ''}`}>
        <div className="flex-1">
          <p className="font-medium">{item.name}{isMatch && <Badge tone="warning" className="ml-2 text-[10px]">Requested</Badge>}</p>
          <p className="text-xs text-slate-500">{item.quantity_available} {cat?.unit || 'units'} available</p>
          {isMatch && requested && <p className="text-xs text-amber-700 mt-0.5">Victim requested: {requested.quantity} {requested.unit}</p>}
        </div>
        <Input aria-label={`Allocate ${item.name}`} type="number" min={0} max={item.quantity_available} step={1} value={quantities[item.id] || ''} placeholder="0" className="w-24" onChange={e => setQuantities(q => ({ ...q, [item.id]: Math.max(0, Math.min(item.quantity_available, Math.floor(Number(e.target.value)))) }))} />
      </div>
    );
  };

  return <Modal open={isOpen} onClose={onClose} title="Reserve requested supplies">
    <div className="space-y-5">
      {/* Victim's requested items - structured display */}
      <div className="rounded-xl bg-slate-50 p-4 text-sm space-y-3">
        <p className="font-semibold">Request #{request.id.slice(0, 8)}</p>
        {request.requested_items?.length ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Victim requested items</p>
            {request.requested_items.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-1 border-b border-slate-200 last:border-0">
                <span className="font-medium text-slate-800">{item.label}</span>
                <span className="text-slate-600 font-semibold">{item.quantity ?? '?'} <span className="font-normal text-slate-500">{item.unit}</span></span>
              </div>
            ))}
          </div>
        ) : <p className="text-slate-500">No specific items listed</p>}
        {request.description && <p className="text-slate-600 pt-1">{request.description}</p>}
        {request.latitude != null && request.longitude != null && <a className="text-brand-600" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${request.latitude},${request.longitude}`}>View victim location</a>}
      </div>

      <label className="block text-sm font-medium">Victim / delivery district
        <Select value={district} onChange={e => setDistrict(e.target.value)} className="mt-2">
          <option value="">Choose the district after checking the victim location</option>
          {Object.keys(districts.data ?? {}).map(d => <option key={d}>{d}</option>)}
        </Select>
      </label>

      <p className="text-sm text-slate-600">Select the goods to supply. {matched.length > 0 ? 'Matching items are highlighted and pre-filled with the requested quantities.' : 'Quantities are reserved now and deducted once handed to the volunteer.'}</p>
      {(inventory.error || districts.error) && <p role="alert" className="text-red-600">Unable to load inventory or districts. Close and retry.</p>}
      {inventory.isLoading && <p>Loading available stock...</p>}
      {!inventory.isLoading && !stock.length && <p>No available stock. Add inventory before arranging delivery.</p>}

      <div className="max-h-72 overflow-y-auto space-y-3">
        {/* Matched items first (items whose category matches victim's request) */}
        {matched.length > 0 && <>
          <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">📦 Matching inventory items</p>
          {matched.map(item => renderStockItem(item, true))}
        </>}
        {/* Other available stock */}
        {other.length > 0 && <>
          {matched.length > 0 && <p className="text-xs font-medium text-slate-500 uppercase tracking-wide pt-2">Other available stock</p>}
          {other.map(item => renderStockItem(item, false))}
        </>}
      </div>
      <p className="text-xs text-slate-500">The pickup location comes from your tenant centre. No disaster event or skill matching is involved.</p>
      <div className="flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!district || !lines.length || !!inventory.error || !!districts.error} loading={create.isPending} onClick={submit}>Reserve stock</Button></div>
    </div>
  </Modal>;
}
