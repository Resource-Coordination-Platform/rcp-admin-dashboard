"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Boxes, MapPin, Radio, Search } from "lucide-react";
import {
  useEvents,
  useInventory,
  useRequests,
  useCategories,
} from "@/lib/hooks";
import type { HelpRequestRead } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, Input, Skeleton } from "@/components/ui/primitives";
import { RequestStatusBadge, UrgencyBadge } from "@/components/ui/badges";
import { RequestDetailModal } from "@/components/features/request-detail-modal";

// Dynamic import for Leaflet GIS Map component (SSR = false)
const GisMapComponent = dynamic(() => import("@/components/features/gis-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-[650px] w-full rounded-2xl" />,
});

export default function MapPage() {
  const requests = useRequests();
  const inventory = useInventory();
  const events = useEvents();
  const categories = useCategories(true);

  const [selectedRequest, setSelectedRequest] =
    useState<HelpRequestRead | null>(null);
  const [modalRequest, setModalRequest] = useState<HelpRequestRead | null>(
    null,
  );
  const [search, setSearch] = useState("");

  const { categoryById } = useMemo(() => {
    const map = new Map((categories.data ?? []).map((c) => [c.id, c]));
    return { categoryById: (id: string) => map.get(id) };
  }, [categories.data]);

  const requestList = requests.data ?? [];
  const inventoryList = inventory.data ?? [];
  const eventList = events.data ?? [];

  // Filter requests with coordinates or search query
  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requestList.filter((r) => {
      const matchSearch =
        !q ||
        r.description.toLowerCase().includes(q) ||
        r.area?.toLowerCase().includes(q);
      return matchSearch;
    });
  }, [requestList, search]);

  return (
    <div>
      <PageHeader
        title="Real-Time Spatial GIS Map"
        description="Live geospatial command center visualizing crisis requests, distribution warehouses, and active disaster events."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Sidebar: Request list for quick spatial targeting */}
        <Card className="p-4 lg:col-span-1">
          <div className="mb-3 space-y-2 border-b border-border pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Crisis Requests ({filteredRequests.length})
            </h3>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pins…"
                className="pl-8 text-xs"
              />
            </div>
          </div>

          {requests.isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No active requests found.
            </p>
          ) : (
            <div className="max-h-[540px] space-y-2 overflow-y-auto pr-1">
              {filteredRequests.map((r) => {
                const active = selectedRequest?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRequest(r)}
                    className={
                      "block w-full rounded-xl border p-2.5 text-left transition " +
                      (active
                        ? "border-brand-500 bg-brand-50 shadow-sm ring-1 ring-brand-300"
                        : "border-border bg-white hover:border-brand-300 hover:bg-slate-50")
                    }
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <p className="line-clamp-1 font-semibold text-xs text-slate-900">
                        {r.description}
                      </p>
                      <UrgencyBadge level={r.urgency} />
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {r.area || "Coords set"}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* Right Main Map Container */}
        <div className="lg:col-span-3">
          <GisMapComponent
            requests={filteredRequests}
            inventory={inventoryList}
            events={eventList}
            selectedRequest={selectedRequest}
            onSelectRequest={(r) => setSelectedRequest(r)}
            onRequestAllocate={(r) => setModalRequest(r)}
          />
        </div>
      </div>

      {/* Modal for stock allocation & dispatch */}
      {modalRequest && (
        <RequestDetailModal
          request={modalRequest}
          category={
            modalRequest.category_id
              ? categoryById(modalRequest.category_id)
              : undefined
          }
          onClose={() => setModalRequest(null)}
          onChanged={(updated) => setModalRequest(updated)}
        />
      )}
    </div>
  );
}
