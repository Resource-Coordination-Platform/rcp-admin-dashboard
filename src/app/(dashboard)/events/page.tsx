"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Map as LeafletMap, Marker as LeafletMarker, LeafletMouseEvent } from "leaflet";
import {
  ArrowRight,
  MapPin,
  Plus,
  Radio,
  Users,
} from "lucide-react";
import { useDeclareEvent, useDistricts, useEvents } from "@/lib/hooks";
import { BROADCAST_META, SRI_LANKA_DISTRICTS } from "@/lib/constants";
import type { BroadcastType, RequirementCreate } from "@/lib/types";
import { ApiError } from "@/lib/api";
import { formatDateTime, humanizeSkill, pct } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Progress,
  Select,
  Skeleton,
  Textarea,
} from "@/components/ui/primitives";
import { BroadcastBadge, EventStatusBadge } from "@/components/ui/badges";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

const COLOMBO_COORDS = { lat: 6.9271, lng: 79.8612 };
const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "260px",
};

// `leaflet` is dynamically imported in the picker to avoid server-side import

function buildStaticMapUrl(
  lat: number,
  lng: number,
  apiKey?: string,
) {
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: "11",
    size: "640x220",
    scale: "2",
    markers: `color:red|${lat},${lng}`,
  });
  if (apiKey) params.set("key", apiKey);
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

function parseCoordinate(raw: string, min: number, max: number) {
  const value = raw.trim();
  if (!value) return { value: null as number | null, valid: true };
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return { value: null as number | null, valid: false };
  }
  return { value: parsed, valid: true };
}

export default function EventsPage() {
  const { data, isLoading } = useEvents();
  const [open, setOpen] = useState(false);
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

  return (
    <div>
      <PageHeader
        title="Disaster Events"
        description="Declare a response, broadcast skill needs to volunteers by district, and watch teams form in real time."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Declare event
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : (data ?? []).length === 0 ? (
        <Card>
          <EmptyState
            icon={Radio}
            title="No events declared"
            description="When a crisis hits, declare an event to broadcast volunteer requirements across affected districts."
            action={
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" />
                Declare an event
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {(data ?? []).map((e) => {
            const filled = e.requirements.reduce((a, r) => a + r.filled_count, 0);
            const needed = e.requirements.reduce(
              (a, r) => a + r.required_count,
              0,
            );
            const hasCoordinates = e.latitude !== null && e.longitude !== null;
            const coordinates = hasCoordinates
              ? { lat: e.latitude!, lng: e.longitude! }
              : null;
            const staticMapUrl =
              coordinates && mapsApiKey
                ? buildStaticMapUrl(coordinates.lat, coordinates.lng, mapsApiKey)
                : null;
            const progress = pct(filled, needed);
            return (
              <Link key={e.id} href={`/events/${e.id}`}>
                <Card className="group h-full p-5 transition hover:border-brand-200 hover:shadow-elevated">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-slate-900">
                        {e.title}
                      </h3>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {e.source_district}
                        <span className="text-slate-300">·</span>
                        {formatDateTime(e.created_at)}
                      </p>
                    </div>
                    <EventStatusBadge status={e.status} />
                  </div>

                  {coordinates && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-border bg-slate-50">
                      {staticMapUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={staticMapUrl}
                          alt={`Map preview for ${e.title}`}
                          loading="lazy"
                          className="h-28 w-full object-cover"
                        />
                      ) : (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          Location pinned at {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <BroadcastBadge type={e.broadcast_type} />
                    {e.requirements.slice(0, 3).map((r) => (
                      <Badge key={r.id} tone="neutral">
                        {humanizeSkill(r.skill)} {r.filled_count}/
                        {r.required_count}
                      </Badge>
                    ))}
                    {e.requirements.length > 3 && (
                      <Badge tone="neutral">
                        +{e.requirements.length - 3} more
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        Team fill
                      </span>
                      <span className="font-semibold text-slate-900">
                        {filled}/{needed} ({progress}%)
                      </span>
                    </div>
                    <Progress
                      value={progress}
                      tone={progress === 100 ? "success" : "brand"}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-end text-sm font-medium text-brand-600 opacity-0 transition group-hover:opacity-100">
                    Open <ArrowRight className="ml-1 h-4 w-4" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {open && <DeclareEventModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function DeclareEventModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const declare = useDeclareEvent();
  const districtsQuery = useDistricts();

  const districts = useMemo(() => {
    const keys = districtsQuery.data
      ? Object.keys(districtsQuery.data).sort()
      : SRI_LANKA_DISTRICTS;
    return keys;
  }, [districtsQuery.data]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceDistrict, setSourceDistrict] = useState("Colombo");
  const [latitude, setLatitude] = useState(String(COLOMBO_COORDS.lat));
  const [longitude, setLongitude] = useState(String(COLOMBO_COORDS.lng));
  const [broadcastType, setBroadcastType] = useState<BroadcastType>("RADIUS_L1");
  const [targetDistricts, setTargetDistricts] = useState<string[]>([]);
  const [requirements, setRequirements] = useState<RequirementCreate[]>([
    { skill: "", required_count: 1 },
  ]);

  const neighbours = districtsQuery.data?.[sourceDistrict] ?? [];

  function updateReq(i: number, patch: Partial<RequirementCreate>) {
    setRequirements((r) =>
      r.map((req, idx) => (idx === i ? { ...req, ...patch } : req)),
    );
  }

  function toggleTarget(d: string) {
    setTargetDistricts((t) =>
      t.includes(d) ? t.filter((x) => x !== d) : [...t, d],
    );
  }

  function applyDetectedDistrict(detectedDistrict: string) {
    const detected = detectedDistrict.trim().toLowerCase();
    const matched = districts.find((d) => d.toLowerCase() === detected);
    if (!matched) return;
    setSourceDistrict(matched);
    setTargetDistricts([]);
  }

  const parsedLat = parseCoordinate(latitude, -90, 90);
  const parsedLng = parseCoordinate(longitude, -180, 180);
  const coordinatePairComplete =
    (parsedLat.value === null) === (parsedLng.value === null);
  const coordinatesValid =
    parsedLat.valid && parsedLng.valid && coordinatePairComplete;

  async function submit() {
    const cleanedReqs = requirements
      .filter((r) => r.skill.trim())
      .map((r) => ({
        skill: r.skill.trim().toLowerCase().replace(/\s+/g, "_"),
        required_count: Math.max(1, Number(r.required_count) || 1),
      }));

    if (cleanedReqs.length === 0) {
      toast.error("Add at least one requirement", "Each event needs a skill bucket.");
      return;
    }

    if (!coordinatesValid) {
      toast.error(
        "Invalid coordinates",
        "Enter valid latitude/longitude values, or leave both blank.",
      );
      return;
    }

    const locationPayload =
      parsedLat.value === null || parsedLng.value === null
        ? { latitude: null, longitude: null }
        : { latitude: parsedLat.value, longitude: parsedLng.value };

    try {
      await declare.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        source_district: sourceDistrict,
        ...locationPayload,
        broadcast_type: broadcastType,
        target_districts:
          broadcastType === "TARGETED" ? targetDistricts : null,
        requirements: cleanedReqs,
      });
      toast.success(
        "Event declared",
        "Volunteers are being matched asynchronously.",
      );
      onClose();
    } catch (err) {
      toast.error(
        "Could not declare event",
        err instanceof ApiError ? err.detail : "Unexpected error",
      );
    }
  }

  const valid =
    title.trim().length >= 3 &&
    coordinatesValid &&
    (broadcastType !== "TARGETED" || targetDistricts.length > 0) &&
    requirements.some((r) => r.skill.trim());

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Declare a disaster event"
      description="Broadcast volunteer requirements to affected districts."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={declare.isPending} disabled={!valid} onClick={submit}>
            <Radio className="h-4 w-4" />
            Declare & broadcast
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Event title" required hint="At least 3 characters">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Kelani river flooding — evacuation support"
          />
        </Field>
        <Field label="Description">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Situation summary, what's needed, safety notes…"
          />
        </Field>

        <Field
          label="Location pin"
          hint="Click the map or drag the pin to set the exact incident point. District auto-fills when detected."
        >
          <div className="space-y-3">
            <EventLocationPicker
              lat={parsedLat.value ?? COLOMBO_COORDS.lat}
              lng={parsedLng.value ?? COLOMBO_COORDS.lng}
              onCoordinatesChange={(lat, lng) => {
                setLatitude(lat.toFixed(6));
                setLongitude(lng.toFixed(6));
              }}
              onDistrictDetected={applyDetectedDistrict}
            />

            <div className="grid grid-cols-2 gap-3">
              <Field label="Latitude">
                <Input
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="6.927100"
                />
              </Field>
              <Field label="Longitude">
                <Input
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="79.861200"
                />
              </Field>
            </div>

            {!coordinatesValid && (
              <p className="text-xs text-red-600">
                Coordinates are invalid. Keep latitude in -90..90 and longitude
                in -180..180.
              </p>
            )}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Source district" required>
            <Select
              value={sourceDistrict}
              onChange={(e) => {
                setSourceDistrict(e.target.value);
                setTargetDistricts([]);
              }}
            >
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Broadcast reach" required>
            <Select
              value={broadcastType}
              onChange={(e) =>
                setBroadcastType(e.target.value as BroadcastType)
              }
            >
              {(Object.keys(BROADCAST_META) as BroadcastType[]).map((b) => (
                <option key={b} value={b}>
                  {BROADCAST_META[b].label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="rounded-lg bg-brand-50/70 px-3 py-2 text-xs text-brand-800">
          {BROADCAST_META[broadcastType].description}
          {broadcastType === "RADIUS_L2" && neighbours.length > 0 && (
            <span className="mt-1 block text-brand-700">
              Neighbours: {neighbours.join(", ")}
            </span>
          )}
        </div>

        {broadcastType === "TARGETED" && (
          <Field label="Target districts" required>
            <div className="flex flex-wrap gap-1.5">
              {districts
                .filter((d) => d !== sourceDistrict)
                .map((d) => {
                  const active = targetDistricts.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleTarget(d)}
                      className={
                        "rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition " +
                        (active
                          ? "bg-brand-600 text-white ring-brand-600"
                          : "bg-white text-slate-600 ring-border hover:ring-brand-300")
                      }
                    >
                      {d}
                    </button>
                  );
                })}
            </div>
          </Field>
        )}

        {/* Requirements */}
        <div className="rounded-xl border border-border bg-slate-50/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Volunteer requirements
              </p>
              <p className="text-xs text-muted-foreground">
                One skill bucket per row. Volunteers fill on a first come basis.
              </p>
            </div>
            <Button
              size="sm"
              variant="subtle"
              onClick={() =>
                setRequirements((r) => [...r, { skill: "", required_count: 1 }])
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add skill
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            {requirements.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={r.skill}
                  onChange={(e) => updateReq(i, { skill: e.target.value })}
                  placeholder="Skill (e.g. first_aid, boat_operator)"
                  className="h-9 flex-1"
                />
                <Input
                  type="number"
                  min={1}
                  value={r.required_count}
                  onChange={(e) =>
                    updateReq(i, { required_count: Number(e.target.value) })
                  }
                  className="h-9 w-20"
                />
                {requirements.length > 1 && (
                  <button
                    onClick={() =>
                      setRequirements((rs) => rs.filter((_, idx) => idx !== i))
                    }
                    className="rounded-md px-2 py-1 text-xs text-slate-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function EventLocationPicker({
  lat,
  lng,
  onCoordinatesChange,
  onDistrictDetected,
}: {
  lat: number;
  lng: number;
  onCoordinatesChange: (lat: number, lng: number) => void;
  onDistrictDetected: (district: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const initialPositionRef = useRef({ lat, lng });
  const onCoordinatesChangeRef = useRef(onCoordinatesChange);
  const onDistrictDetectedRef = useRef(onDistrictDetected);

  useEffect(() => {
    onCoordinatesChangeRef.current = onCoordinatesChange;
    onDistrictDetectedRef.current = onDistrictDetected;
  }, [onCoordinatesChange, onDistrictDetected]);

  const reverseGeocodeDistrict = useCallback(async (nextLat: number, nextLng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${nextLat}&lon=${nextLng}&addressdetails=1`,
      );
      if (!response.ok) return;
      const data = (await response.json()) as {
        address?: {
          county?: string;
          state_district?: string;
          state?: string;
        };
      };
      const detectedDistrict =
        data.address?.county ?? data.address?.state_district ?? data.address?.state;
      if (detectedDistrict) onDistrictDetectedRef.current(detectedDistrict);
    } catch {
      /* district lookup is optional */
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const { lat: initialLat, lng: initialLng } = initialPositionRef.current;

    let mounted = true;

    async function init() {
      const L = (await import("leaflet")).default;

      const LOCATION_PIN_ICON = L.divIcon({
        className: "",
        html: `
          <div style="width:18px;height:18px;border-radius:9999px;background:#1d4ed8;border:3px solid #ffffff;box-shadow:0 10px 24px rgba(29,78,216,.35);"></div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const map = L.map(containerRef.current as HTMLDivElement, {
        scrollWheelZoom: true,
        zoomControl: true,
      }).setView([initialLat, initialLng], 11);

      const tileLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        },
      );
      tileLayer.addTo(map);

      const marker = L.marker([initialLat, initialLng], {
        draggable: true,
        icon: LOCATION_PIN_ICON,
      }).addTo(map);

      const handleClick = (event: LeafletMouseEvent) => {
        const nextLat = event.latlng.lat;
        const nextLng = event.latlng.lng;
        marker.setLatLng([nextLat, nextLng]);
        map.panTo([nextLat, nextLng]);
        onCoordinatesChangeRef.current(nextLat, nextLng);
        void reverseGeocodeDistrict(nextLat, nextLng);
      };

      const handleDragEnd = () => {
        const next = marker.getLatLng();
        onCoordinatesChangeRef.current(next.lat, next.lng);
        void reverseGeocodeDistrict(next.lat, next.lng);
      };

      map.on("click", handleClick);
      marker.on("dragend", handleDragEnd);

      if (!mounted) {
        map.remove();
        return;
      }

      mapRef.current = map as unknown as LeafletMap;
      markerRef.current = marker as unknown as LeafletMarker;

      return () => {
        map.off("click", handleClick);
        marker.off("dragend", handleDragEnd);
        map.remove();
        mapRef.current = null;
        markerRef.current = null;
      };
    }

    const cleanupPromise = init();

    return () => {
      mounted = false;
      // cleanupPromise may resolve to a cleanup function but we avoid awaiting here
    };
  }, [reverseGeocodeDistrict]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    const current = marker.getLatLng();
    if (current.lat !== lat || current.lng !== lng) {
      marker.setLatLng([lat, lng]);
      map.panTo([lat, lng]);
    }
  }, [lat, lng]);

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div ref={containerRef} style={MAP_CONTAINER_STYLE} />
    </div>
  );
}
