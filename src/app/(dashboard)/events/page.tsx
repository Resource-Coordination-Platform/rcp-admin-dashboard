"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type {
  Map as LeafletMap,
  Marker as LeafletMarker,
  LeafletMouseEvent,
} from "leaflet";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  
  Eye,
  Flame,
  Image as ImageIcon,
  MapPin,
  Maximize2,
  Phone,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  User,
  Users,
  Waves,
  X,
} from "lucide-react";
import {
  useCloseEvent,
  useDeclareEvent,
  useDistricts,
  useEvents,
  useVolunteerReports,
} from "@/lib/hooks";
import { BROADCAST_META, SRI_LANKA_DISTRICTS } from "@/lib/constants";
import type {
  BroadcastType,
  DisasterEventRead,
  RequirementCreate,
  VolunteerReportRead,
  VolunteerReportStatus,
} from "@/lib/types";
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

function buildStaticMapUrl(lat: number, lng: number, apiKey?: string) {
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

interface PreFillEventData {
  title?: string;
  description?: string;
  sourceDistrict?: string;
}

export default function EventsPage() {
  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = useEvents();
  const { data: reports, isLoading: reportsLoading, refetch: refetchReports } = useVolunteerReports();
  const [declareOpen, setDeclareOpen] = useState(false);
  const [preFillData, setPreFillData] = useState<PreFillEventData | null>(null);
  const [viewImageModal, setViewImageModal] = useState<string | null>(null);

  // Left column filters (Volunteer reports)
  const [reportStatusTab, setReportStatusTab] = useState<"ALL" | VolunteerReportStatus>("ALL");
  const [reportSearch, setReportSearch] = useState("");

  // Right column filters (Declared events)
  const [eventStatusTab, setEventStatusTab] = useState<"ALL" | "ACTIVE" | "CLOSED">("ALL");
  const [eventSearch, setEventSearch] = useState("");

  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

  // Filtered volunteer reports
  const filteredReports = useMemo(() => {
    return (reports ?? []).filter((r) => {
      if (reportStatusTab !== "ALL" && r.status !== reportStatusTab) return false;
      if (reportSearch.trim()) {
        const q = reportSearch.toLowerCase();
        const matchesCategory = r.category.toLowerCase().includes(q);
        const matchesDesc = (r.description || "").toLowerCase().includes(q);
        const matchesVolunteer = (r.volunteer_name || "").toLowerCase().includes(q);
        if (!matchesCategory && !matchesDesc && !matchesVolunteer) {
          return false;
        }
      }
      return true;
    });
  }, [reports, reportStatusTab, reportSearch]);

  // Filtered declared events
  const filteredEvents = useMemo(() => {
    return (events ?? []).filter((e) => {
      if (eventStatusTab === "ACTIVE" && e.status === "CLOSED") return false;
      if (eventStatusTab === "CLOSED" && e.status !== "CLOSED") return false;
      if (eventSearch.trim()) {
        const q = eventSearch.toLowerCase();
        const matchesTitle = e.title.toLowerCase().includes(q);
        const matchesDistrict = e.source_district.toLowerCase().includes(q);
        const matchesDesc = (e.description || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesDistrict && !matchesDesc) return false;
      }
      return true;
    });
  }, [events, eventStatusTab, eventSearch]);

  const activeEventsCount = useMemo(() => {
    return (events ?? []).filter((e) => e.status !== "CLOSED").length;
  }, [events]);

  function handleDeclareFromReport(report: VolunteerReportRead) {
    setPreFillData({
      title: `${report.category} Response — GPS (${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)})`,
      description: `Reported by volunteer ${report.volunteer_name || "Field Volunteer"}${report.volunteer_phone ? ` (${report.volunteer_phone})` : ""}.\nLocation: GPS ${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}\nSeverity: ${report.severity}\n\nField Notes: ${report.description || "Immediate volunteer response requested."}`,
    });
    setDeclareOpen(true);
  }

  function handleOpenDeclareManual() {
    setPreFillData(null);
    setDeclareOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disaster Operations Center"
        description="Monitor ground volunteer incident reports on the left, and broadcast declared disaster events on the right."
        actions={
          <Button onClick={handleOpenDeclareManual}>
            <Plus className="h-4 w-4" />
            Declare event
          </Button>
        }
      />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Field Reports</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {reportsLoading ? "..." : (reports ?? []).length}
          </p>
          <p className="mt-0.5 text-xs text-amber-700 font-medium">
            {reports?.length ?? 0} GN-verified reports
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-l-brand-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Active Events</span>
            <Radio className="h-4 w-4 text-brand-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {eventsLoading ? "..." : activeEventsCount}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {(events ?? []).length} total response events
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Verified Reports</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {reportsLoading ? "..." : (reports ?? []).filter((r) => r.status === "VERIFIED").length}
          </p>
          <p className="mt-0.5 text-xs text-emerald-700 font-medium">
            Ground-verified incidents
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">GPS Reports</span>
            <MapPin className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {(reports ?? []).filter((r) => r.latitude && r.longitude).length}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Location-tagged reports</p>
        </Card>
      </div>

      {/* Main 2-Column Split Layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* ================= LEFT SIDE: Volunteer Disaster Reports ================= */}
        <div className="flex flex-col space-y-4">
          <div className="rounded-2xl border border-coral-200/80 bg-gradient-to-r from-coral-50/70 to-surface p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-coral-500 text-white shadow-xs">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Volunteer Field Reports
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Incident reports submitted by ground volunteers via the mobile app
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetchReports()}
                  title="Refresh reports"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-coral-200/60 pt-3">
              <div className="inline-flex rounded-lg bg-surface p-1 shadow-xs ring-1 ring-border">
                {(["ALL", "VERIFIED"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setReportStatusTab(tab)}
                    className={
                      "rounded-md px-2.5 py-1 text-xs font-medium transition " +
                      (reportStatusTab === tab
                        ? "bg-coral-500 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900")
                    }
                  >
                    {tab === "ALL" ? "All" : "GN verified"}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[140px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  placeholder="Search category, volunteer..."
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Volunteer Reports List */}
          {reportsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-44 w-full rounded-2xl" />
              ))}
            </div>
          ) : filteredReports.length === 0 ? (
            <Card className="p-8 text-center">
              <EmptyState
                icon={AlertTriangle}
                title="No volunteer reports found"
                description={
                  reportStatusTab !== "ALL" || reportSearch
                    ? "Try adjusting your filter or search query."
                    : "Reports appear here after verification by the Grama Niladhari responsible for the reported location."
                }
              />
            </Card>
          ) : (
            <div className="space-y-3.5">
              {filteredReports.map((report) => (
                <VolunteerReportCard
                  key={report.id}
                  report={report}
                  onDeclareEvent={() => handleDeclareFromReport(report)}
                  onViewImage={(url) => setViewImageModal(url)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ================= RIGHT SIDE: Declared Disaster Events ================= */}
        <div className="flex flex-col space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-surface p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-xs">
                  <Radio className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Declared Disaster Events
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Active response operations broadcasting volunteer assignments
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleOpenDeclareManual}>
                  <Plus className="h-3.5 w-3.5" />
                  Declare Event
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetchEvents()}
                  title="Refresh events"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <div className="inline-flex rounded-lg bg-slate-50 p-1 shadow-xs ring-1 ring-border">
                {(["ALL", "ACTIVE", "CLOSED"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setEventStatusTab(tab)}
                    className={
                      "rounded-md px-2.5 py-1 text-xs font-medium transition " +
                      (eventStatusTab === tab
                        ? "bg-brand-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900")
                    }
                  >
                    {tab === "ALL" ? "All Events" : tab === "ACTIVE" ? "Active" : "Closed"}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[160px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  placeholder="Search declared events..."
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Declared Events List */}
          {eventsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-44 w-full rounded-2xl" />
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <Card className="p-8 text-center">
              <EmptyState
                icon={Radio}
                title="No declared events"
                description={
                  eventStatusTab !== "ALL" || eventSearch
                    ? "No events match your current filter."
                    : "No disaster response events have been declared yet. Click 'Declare Event' or use a GN-verified volunteer report on the left to initiate a broadcast."
                }
                action={
                  <Button onClick={handleOpenDeclareManual}>
                    <Plus className="h-4 w-4" />
                    Declare an event
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="space-y-3.5">
              {filteredEvents.map((e) => (
                <DeclaredEventCard key={e.id} event={e} mapsApiKey={mapsApiKey} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Declare Disaster Event */}
      {declareOpen && (
        <DeclareEventModal
          initialData={preFillData}
          onClose={() => {
            setDeclareOpen(false);
            setPreFillData(null);
          }}
        />
      )}

      {/* Modal: View Full-Size Image */}
      {viewImageModal && (
        <Modal
          open
          onClose={() => setViewImageModal(null)}
          size="lg"
          title="Field Photo Attachment"
          description="High-resolution ground photo submitted by volunteer."
          footer={
            <Button variant="outline" onClick={() => setViewImageModal(null)}>
              Close
            </Button>
          }
        >
          <div className="flex flex-col items-center justify-center overflow-hidden rounded-xl bg-slate-950 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewImageModal}
              alt="Volunteer field photo"
              className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

// =========================================================================
// Volunteer Report Card (Left Column)
// =========================================================================
function VolunteerReportCard({
  report,
  onDeclareEvent,
  onViewImage,
}: {
  report: VolunteerReportRead;
  onDeclareEvent: () => void;
  onViewImage: (url: string) => void;
}) {
  const categoryLower = report.category.toLowerCase();
  const CategoryIcon =
    categoryLower.includes("flood") || categoryLower.includes("ජල")
      ? Waves
      : categoryLower.includes("fire") || categoryLower.includes("ගිනි")
      ? Flame
      : categoryLower.includes("landslide") || categoryLower.includes("නාය")
      ? ShieldAlert
      : AlertTriangle;

  const severityTone =
    report.severity.toUpperCase() === "CRITICAL"
      ? "danger"
      : report.severity.toUpperCase() === "HIGH"
      ? "warning"
      : report.severity.toUpperCase() === "MEDIUM"
      ? "brand"
      : "neutral";

  const statusTone =
    report.status === "VERIFIED"
      ? "success"
      : report.status === "PENDING"
      ? "warning"
      : "neutral";

  return (
    <Card className="p-4 transition hover:border-coral-300 hover:shadow-card">
      {/* Top Header: Category, Severity, Status */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-coral-100 text-coral-800">
            <CategoryIcon className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-semibold text-sm text-slate-900 leading-snug">
              {report.category}
            </h3>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 text-coral-600 shrink-0" />
              <span className="font-medium text-slate-700">GPS: {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Badge tone={severityTone}>{report.severity}</Badge>
          <Badge tone={statusTone} dot>
            {report.status === "PENDING"
              ? "Pending"
              : report.status === "VERIFIED"
              ? "Verified"
              : "Rejected"}
          </Badge>
        </div>
      </div>

      {/* Description */}
      <div className="mt-3 rounded-lg bg-slate-50/70 p-2.5 text-xs text-slate-700 leading-relaxed border border-slate-100">
        <p className="line-clamp-3 whitespace-pre-line">
          {report.description || "No written description provided."}
        </p>
      </div>

      {/* Image Thumbnail (if available) */}
      {report.image_url && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => onViewImage(report.image_url!)}
            className="group relative flex items-center gap-2 overflow-hidden rounded-lg border border-border bg-slate-50 p-1.5 transition hover:border-coral-400"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={report.image_url}
              alt="Report thumbnail"
              className="h-14 w-14 rounded-md object-cover"
            />
            <div className="min-w-0 text-left">
              <p className="flex items-center gap-1 text-xs font-semibold text-slate-800 group-hover:text-coral-600">
                <ImageIcon className="h-3.5 w-3.5" /> View Photo Evidence
              </p>
              <p className="text-[11px] text-muted-foreground">
                Click to inspect full-size image
              </p>
            </div>
            <Maximize2 className="ml-auto mr-1 h-3.5 w-3.5 text-slate-400 group-hover:text-coral-600" />
          </button>
        </div>
      )}

      {/* Volunteer Metadata & Timestamp */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <User className="h-3 w-3 text-slate-400" />
          <span className="font-medium text-slate-800">
            {report.volunteer_name || "Volunteer"}
          </span>
          {report.volunteer_phone && (
            <span className="flex items-center gap-0.5 text-slate-500">
              <Phone className="h-2.5 w-2.5" /> {report.volunteer_phone}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-slate-400" />
          <span>{formatDateTime(report.created_at)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-2.5">

        <Button
          size="sm"
          onClick={onDeclareEvent}
          className="h-7 text-xs gap-1"
        >
          <Radio className="h-3 w-3" />
          Declare Response Event
        </Button>
      </div>
    </Card>
  );
}

// =========================================================================
// Declared Event Card (Right Column)
// =========================================================================
function DeclaredEventCard({
  event: e,
  mapsApiKey,
}: {
  event: DisasterEventRead;
  mapsApiKey: string;
}) {
  const filled = e.requirements.reduce((a, r) => a + r.filled_count, 0);
  const needed = e.requirements.reduce((a, r) => a + r.required_count, 0);
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
    <Link href={`/events/${e.id}`}>
      <Card className="group p-3.5 transition hover:border-brand-300 hover:shadow-card">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-slate-900 group-hover:text-brand-700">
              {e.title}
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 text-brand-600 shrink-0" />
              <span className="font-medium text-slate-700">{e.source_district}</span>
              <span className="text-slate-300">·</span>
              {formatDateTime(e.created_at)}
              {coordinates && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-[11px] text-slate-400">
                    {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
                  </span>
                </>
              )}
            </p>
          </div>
          <EventStatusBadge status={e.status} />
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          <BroadcastBadge type={e.broadcast_type} />
          {e.requirements.slice(0, 3).map((r) => (
            <Badge key={r.id} tone="neutral">
              {humanizeSkill(r.skill)} {r.filled_count}/{r.required_count}
            </Badge>
          ))}
          {e.requirements.length > 3 && (
            <Badge tone="neutral">+{e.requirements.length - 3} more</Badge>
          )}
        </div>

        <div className="mt-2">
          <div className="mb-0.5 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-3 w-3" />
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

        <div className="mt-2 flex items-center justify-end text-xs font-semibold text-brand-600 opacity-90 transition group-hover:opacity-100 group-hover:translate-x-0.5">
          Manage Assignments <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </div>
      </Card>
    </Link>
  );
}

// =========================================================================
// Declare Event Modal (with Pre-fill Support)
// =========================================================================
function DeclareEventModal({
  initialData,
  onClose,
}: {
  initialData?: PreFillEventData | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const declare = useDeclareEvent();
  const districtsQuery = useDistricts();

  const districts = useMemo(() => {
    const keys = districtsQuery.data
      ? Object.keys(districtsQuery.data).sort()
      : SRI_LANKA_DISTRICTS;
    return keys;
  }, [districtsQuery.data]);

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [sourceDistrict, setSourceDistrict] = useState(
    initialData?.sourceDistrict && districts.includes(initialData.sourceDistrict)
      ? initialData.sourceDistrict
      : "Colombo",
  );
  const [latitude, setLatitude] = useState(String(COLOMBO_COORDS.lat));
  const [longitude, setLongitude] = useState(String(COLOMBO_COORDS.lng));
  const [broadcastType, setBroadcastType] =
    useState<BroadcastType>("RADIUS_L1");
  const [targetDistricts, setTargetDistricts] = useState<string[]>([]);
  const [requirements, setRequirements] = useState<RequirementCreate[]>([
    { skill: "first_aid", required_count: 2 },
    { skill: "boat_driver", required_count: 1 },
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
      toast.error(
        "Add at least one requirement",
        "Each event needs a skill bucket.",
      );
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
        target_districts: broadcastType === "TARGETED" ? targetDistricts : null,
        requirements: cleanedReqs,
      });
      toast.success(
        "Event declared & broadcasted",
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
          <Button
            loading={declare.isPending}
            disabled={!valid}
            onClick={submit}
          >
            <Radio className="h-4 w-4" />
            Declare & broadcast
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {initialData && (
          <div className="rounded-xl border border-coral-200 bg-coral-50/70 p-3 text-xs text-coral-900">
            <span className="font-semibold">Pre-filled from Volunteer Field Report:</span> Details below were automatically imported from the ground report. You can review and adjust them before broadcasting.
          </div>
        )}

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
            className="min-h-[90px]"
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
                  placeholder="Skill (e.g. first_aid, boat_driver)"
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

// =========================================================================
// Leaflet Location Picker
// =========================================================================
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

  const reverseGeocodeDistrict = useCallback(
    async (nextLat: number, nextLng: number) => {
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
          data.address?.county ??
          data.address?.state_district ??
          data.address?.state;
        if (detectedDistrict) onDistrictDetectedRef.current(detectedDistrict);
      } catch {
        /* district lookup is optional */
      }
    },
    [],
  );

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
