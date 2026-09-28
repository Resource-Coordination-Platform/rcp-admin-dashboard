"use client";
import { useEffect, useRef, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngLiteral } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  useCreateSafeZone,
  useSafeZones,
  type SafeZone,
} from "@/lib/safe-zones";

function MapActions({
  zones,
  onPick,
}: {
  zones: SafeZone[];
  onPick: (point: LatLngLiteral) => void;
}) {
  const map = useMap();
  const fitted = useRef(false);
  useMapEvents({ click: (event) => onPick(event.latlng) });
  useEffect(() => {
    if (zones.length && !fitted.current) {
      map.fitBounds(
        zones.map((z) => [z.lat, z.lng]),
        { padding: [60, 60], maxZoom: 14 },
      );
      fitted.current = true;
    }
  }, [map, zones]);
  return null;
}

export default function SafeZonesMap() {
  const zones = useSafeZones();
  const create = useCreateSafeZone();
  const [point, setPoint] = useState<LatLngLiteral | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<"camp" | "medical">("camp");
  return (
    <section
      className="relative isolate h-[calc(100dvh-140px)] min-h-[520px] overflow-hidden rounded-2xl border border-slate-200"
      aria-label="Safe zones map"
    >
      <MapContainer
        center={[7.8731, 80.7718]}
        zoom={8}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="topright" />
        <MapActions
          zones={zones.data ?? []}
          onPick={(p) => {
            if (!create.isPending) {
              setPoint(p);
              create.reset();
            }
          }}
        />
        {(zones.data ?? []).map((zone) => (
          <CircleMarker
            key={zone.id}
            center={[zone.lat, zone.lng]}
            radius={10}
            pathOptions={{
              color: "white",
              weight: 3,
              fillColor: zone.type === "medical" ? "#ef4444" : "#059669",
              fillOpacity: 1,
            }}
          >
            <Popup>
              <strong>{zone.name}</strong>
              <br />
              {zone.type === "medical" ? "Medical centre" : "Relief camp"}
            </Popup>
          </CircleMarker>
        ))}
        {point && (
          <CircleMarker
            center={point}
            radius={12}
            pathOptions={{
              color: "#2563eb",
              dashArray: "4 3",
              fillOpacity: 0.3,
            }}
          />
        )}
      </MapContainer>
      <div className="absolute left-4 top-4 z-[1000] max-w-[calc(100%-5rem)] rounded-2xl bg-white/95 p-4 shadow-lg">
        <h1 className="text-xl font-bold text-slate-900">Safe zones</h1>
        <p className="mt-1 text-sm text-slate-600">
          Click the map to mark a relief camp or medical centre.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          🟢 Relief camp · 🔴 Medical centre · {zones.data?.length ?? 0} zones
        </p>
        {zones.isLoading && <p className="mt-2 text-sm">Loading safe zones…</p>}
        {zones.isError && (
          <button
            className="mt-2 text-sm text-red-600"
            onClick={() => zones.refetch()}
          >
            Could not load safe zones. Retry
          </button>
        )}
        {create.isSuccess && (
          <p role="status" className="mt-2 text-sm text-emerald-700">
            Safe zone saved.
          </p>
        )}
      </div>
      {point && (
        <form
          className="absolute bottom-8 left-4 right-4 z-[1000] rounded-2xl bg-white p-4 shadow-xl sm:right-auto sm:w-80"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!name.trim() || create.isPending) return;
            try {
              await create.mutateAsync({
                name: name.trim(),
                type,
                lat: point.lat,
                lng: point.lng,
              });
              setPoint(null);
              setName("");
            } catch {
              /* Keep the position and form for retry. */
            }
          }}
        >
          <h2 className="font-semibold">Add safe zone</h2>
          <p className="mb-3 text-xs text-slate-500">
            {point.lat.toFixed(5)}, {point.lng.toFixed(5)} · Click map to
            reposition
          </p>
          <label className="block text-sm">
            Name
            <input
              autoFocus
              required
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mb-3 mt-1 w-full rounded-lg border p-2"
              placeholder="e.g. Central school relief camp"
            />
          </label>
          <label className="block text-sm">
            Type
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "camp" | "medical")}
              className="mb-3 mt-1 w-full rounded-lg border p-2"
            >
              <option value="camp">Relief camp</option>
              <option value="medical">Medical centre</option>
            </select>
          </label>
          {create.isError && (
            <p role="alert" className="mb-3 text-sm text-red-600">
              {create.error.message || "Unable to save. Please retry."}
            </p>
          )}
          <div className="flex gap-2">
            <button
              disabled={create.isPending || !name.trim()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {create.isPending ? "Saving…" : "Save safe zone"}
            </button>
            <button
              type="button"
              disabled={create.isPending}
              onClick={() => setPoint(null)}
              className="rounded-lg border px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
