"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type {
  HelpRequestRead,
  InventoryItemRead,
  DisasterEventRead,
} from "@/lib/types";
import { URGENCY_META } from "@/lib/constants";
import { Badge, Button } from "@/components/ui/primitives";
import { UrgencyBadge } from "@/components/ui/badges";
import { Boxes, MapPin, Navigation, Radio } from "lucide-react";

// Custom Leaflet Icons using SVG Data URIs for clean cross-browser rendering
function createCustomIcon(color: string, symbol: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="28" height="38">
    <path fill="${color}" stroke="#ffffff" stroke-width="16" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67a24 24 0 0 1-35.464 0z"/>
    <circle cx="192" cy="192" r="70" fill="#ffffff"/>
  </svg>`;

  return L.icon({
    iconUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -34],
  });
}

const ICONS = {
  critical: createCustomIcon("#ef4444", "C"),
  high: createCustomIcon("#f97316", "H"),
  medium: createCustomIcon("#eab308", "M"),
  low: createCustomIcon("#3b82f6", "L"),
  warehouse: createCustomIcon("#10b981", "W"),
  event: createCustomIcon("#8b5cf6", "E"),
};

// Haversine Distance Formula (in KM)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 13, { duration: 1.2 });
  }, [lat, lng, map]);
  return null;
}

export interface GisMapProps {
  requests: HelpRequestRead[];
  inventory: InventoryItemRead[];
  events: DisasterEventRead[];
  selectedRequest: HelpRequestRead | null;
  onSelectRequest: (r: HelpRequestRead) => void;
  onRequestAllocate: (r: HelpRequestRead) => void;
}

export default function GisMapComponent({
  requests,
  inventory,
  events,
  selectedRequest,
  onSelectRequest,
  onRequestAllocate,
}: GisMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (containerRef.current) {
        const container = containerRef.current.querySelector(
          ".leaflet-container",
        ) as (HTMLElement & { _leaflet_id?: number | null }) | null;
        if (container) {
          container._leaflet_id = null;
        }
      }
    };
  }, []);

  // Center of Sri Lanka by default
  const defaultCenter: [number, number] = [6.9271, 79.8612];

  const mapCenter: [number, number] = useMemo(() => {
    if (selectedRequest?.latitude && selectedRequest?.longitude) {
      return [selectedRequest.latitude, selectedRequest.longitude];
    }
    const firstReqWithCoords = requests.find((r) => r.latitude && r.longitude);
    if (firstReqWithCoords?.latitude && firstReqWithCoords?.longitude) {
      return [firstReqWithCoords.latitude, firstReqWithCoords.longitude];
    }
    return defaultCenter;
  }, [selectedRequest, requests]);

  // Proximity warehouse calculations for selected request
  const nearbyWarehouses = useMemo(() => {
    if (!selectedRequest?.latitude || !selectedRequest?.longitude) return [];

    // Group inventory items by storage_location
    const locMap = new Map<string, InventoryItemRead[]>();
    for (const item of inventory) {
      const loc = item.storage_location || "Central Warehouse";
      if (!locMap.has(loc)) locMap.set(loc, []);
      locMap.get(loc)!.push(item);
    }

    // Default mock coordinates for warehouses around Colombo/Kandy if not specified
    const warehouseCoords: Record<string, [number, number]> = {
      "Central Warehouse": [6.9271, 79.8612],
      "Colombo Hub": [6.9319, 79.8478],
      "Gampaha Depot": [7.0917, 79.9997],
      "Kandy Operations Unit": [7.2906, 80.6337],
    };

    const results = [];
    for (const [locName, items] of locMap.entries()) {
      const coords: [number, number] = warehouseCoords[locName] || [
        6.92 + results.length * 0.05,
        79.85 + results.length * 0.05,
      ];
      const dist = calculateDistance(
        selectedRequest.latitude,
        selectedRequest.longitude,
        coords[0],
        coords[1],
      );
      const totalAvailable = items.reduce(
        (a, b) => a + b.quantity_available,
        0,
      );
      results.push({
        location: locName,
        coords,
        distanceKm: dist,
        totalAvailable,
        items,
      });
    }

    return results.sort((a, b) => a.distanceKm - b.distanceKm);
  }, [selectedRequest, inventory]);

  return (
    <div
      ref={containerRef}
      className="relative h-[650px] w-full overflow-hidden rounded-2xl border border-border shadow-lg"
    >
      <MapContainer
        center={mapCenter}
        zoom={11}
        scrollWheelZoom={true}
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRecenter lat={mapCenter[0]} lng={mapCenter[1]} />

        {/* Render Help Requests */}
        {requests.map((r) => {
          if (!r.latitude || !r.longitude) return null;
          const urgencyKey = (
            r.urgency ? String(r.urgency).toLowerCase() : "medium"
          ) as keyof typeof ICONS;
          const icon = ICONS[urgencyKey] || ICONS.medium;

          return (
            <Marker
              key={r.id}
              position={[r.latitude, r.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectRequest(r),
              }}
            >
              <Popup>
                <div className="p-1 space-y-2 max-w-xs">
                  <div className="flex items-center gap-1.5">
                    <UrgencyBadge level={r.urgency} />
                    <span className="text-xs font-semibold text-slate-700 uppercase">
                      {r.status}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-slate-900">
                    {r.description}
                  </p>
                  <p className="text-xs text-slate-500">
                    📍{" "}
                    {r.area ||
                      `${r.latitude.toFixed(3)}, ${r.longitude.toFixed(3)}`}
                  </p>
                  <Button
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => onRequestAllocate(r)}
                  >
                    Allocate & Dispatch
                  </Button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Render Disaster Events */}
        {events.map((e) => {
          if (!e.latitude || !e.longitude) return null;
          return (
            <Marker
              key={e.id}
              position={[e.latitude, e.longitude]}
              icon={ICONS.event}
            >
              <Popup>
                <div className="p-1 space-y-1">
                  <Badge tone="purple">
                    <Radio className="mr-1 h-3 w-3" /> Event: {e.status}
                  </Badge>
                  <p className="font-bold text-sm text-slate-900">{e.title}</p>
                  <p className="text-xs text-slate-600">{e.source_district}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Proximity Matching Overlay Drawer */}
      {selectedRequest && (
        <div className="absolute bottom-4 right-4 z-10 w-96 rounded-xl border border-border bg-white/95 p-4 shadow-2xl backdrop-blur">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">
                Proximity Stock Matcher
              </span>
              <h4 className="font-semibold text-sm text-slate-900 line-clamp-1">
                {selectedRequest.description}
              </h4>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Navigation className="h-3 w-3 text-brand-500" />
                {selectedRequest.area || "Coordinates set"}
              </p>
            </div>
            <UrgencyBadge level={selectedRequest.urgency} />
          </div>

          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold text-slate-600">
              Nearby Warehouses & Available Stock:
            </p>
            {nearbyWarehouses.length === 0 ? (
              <p className="text-xs text-slate-400">
                No warehouse coordinates available.
              </p>
            ) : (
              <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                {nearbyWarehouses.map((wh) => (
                  <div
                    key={wh.location}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs"
                  >
                    <div>
                      <p className="font-medium text-slate-900 flex items-center gap-1">
                        <Boxes className="h-3.5 w-3.5 text-emerald-600" />
                        {wh.location}
                      </p>
                      <p className="text-[10px] text-emerald-700 font-semibold">
                        {wh.totalAvailable} items in stock
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="rounded bg-brand-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand-700">
                        {wh.distanceKm} km away
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              className="w-full"
              onClick={() => onRequestAllocate(selectedRequest)}
            >
              Allocate Stock for Request
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
