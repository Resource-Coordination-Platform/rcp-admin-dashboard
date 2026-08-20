"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, Phone, RotateCcw, Search, UsersRound } from "lucide-react";
import {
  useDistricts,
  useVolunteerDirectory,
  useVolunteerSkills,
} from "@/lib/hooks";
import { colorFromString, humanizeSkill, initials, relativeTime } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { VolunteerDirectoryEntry } from "@/lib/types";
import { PageHeader } from "@/components/ui/page-header";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  Skeleton,
} from "@/components/ui/primitives";

const PAGE_SIZE = 24;

export default function VolunteersPage() {
  // Draft filter state (what the inputs show) is debounced into the query
  // below, so typing searches without a round-trip per keystroke.
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [skill, setSkill] = useState("");
  const [district, setDistrict] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [page, setPage] = useState(0);

  const [debounced, setDebounced] = useState({ q: "", city: "" });
  useEffect(() => {
    const t = setTimeout(() => setDebounced({ q, city }), 300);
    return () => clearTimeout(t);
  }, [q, city]);

  // Any filter change starts back at the first page.
  useEffect(() => {
    setPage(0);
  }, [debounced.q, debounced.city, skill, district, availableOnly]);

  const districts = useDistricts();
  const skills = useVolunteerSkills();

  const query = useMemo(
    () => ({
      q: debounced.q.trim() || undefined,
      city: debounced.city.trim() || undefined,
      skill: skill || undefined,
      district: district || undefined,
      available_only: availableOnly,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [debounced, skill, district, availableOnly, page],
  );

  const { data, isLoading, isFetching, error, refetch } =
    useVolunteerDirectory(query);

  const volunteers = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasFilters =
    !!query.q || !!query.city || !!skill || !!district || availableOnly;

  function reset() {
    setQ("");
    setCity("");
    setSkill("");
    setDistrict("");
    setAvailableOnly(false);
  }

  return (
    <div>
      <PageHeader
        title="Volunteers"
        description="Search the volunteer pool by skill, district and availability — the same rows a disaster broadcast will reach."
      />

      <Card className="mb-6 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Name or phone">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search volunteers…"
                className="pl-9"
              />
            </div>
          </Field>

          <Field label="Skill">
            <Select value={skill} onChange={(e) => setSkill(e.target.value)}>
              <option value="">Any skill</option>
              {(skills.data ?? []).map((s) => (
                <option key={s} value={s}>
                  {humanizeSkill(s)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="District">
            <Select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
            >
              <option value="">All districts</option>
              {Object.keys(districts.data ?? {}).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="City">
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Dehiwala"
            />
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
            />
            Available now only
          </label>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={reset}>
                <RotateCcw className="h-3.5 w-3.5" />
                Clear filters
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              loading={isFetching}
              onClick={() => refetch()}
            >
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {error ? (
        <Card>
          <EmptyState
            icon={UsersRound}
            title="Could not load volunteers"
            description={
              error instanceof ApiError
                ? error.detail
                : "The volunteer service is unreachable."
            }
            action={<Button onClick={() => refetch()}>Try again</Button>}
          />
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : volunteers.length === 0 ? (
        <Card>
          <EmptyState
            icon={UsersRound}
            title={hasFilters ? "No volunteers match these filters" : "No volunteers yet"}
            description={
              hasFilters
                ? "Try widening the district or clearing the skill filter."
                : "Volunteers appear here once they register on the mobile app and complete their profile."
            }
            action={
              hasFilters ? (
                <Button variant="outline" onClick={reset}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            Showing {volunteers.length} of {total} volunteer
            {total === 1 ? "" : "s"}
            {skill ? ` · skill “${humanizeSkill(skill)}”` : ""}
            {district ? ` · ${district}` : ""}
            {availableOnly ? " · available now" : ""}
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {volunteers.map((v) => (
              <VolunteerCard key={v.id} volunteer={v} />
            ))}
          </div>

          {total > PAGE_SIZE && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * PAGE_SIZE >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function VolunteerCard({ volunteer: v }: { volunteer: VolunteerDirectoryEntry }) {
  const location = [v.city, v.base_district].filter(Boolean).join(", ");
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
          style={{ backgroundColor: colorFromString(v.full_name) }}
        >
          {initials(v.full_name)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{v.full_name}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {location || "No district set"}
          </p>
        </div>
      </div>

      {v.phone && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
          <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <a href={`tel:${v.phone}`} className="hover:text-brand-700">
            {v.phone}
          </a>
        </p>
      )}

      {v.skills.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {v.skills.map((s) => (
            <Badge key={s} tone="brand">
              {humanizeSkill(s)}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-xs italic text-muted-foreground">
          No skills listed yet
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3 text-xs">
        {v.available_status ? (
          <span className="flex items-center gap-1.5 text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Available now
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
            Unavailable
          </span>
        )}
        <span className="text-muted-foreground">
          Joined {relativeTime(v.created_at)}
        </span>
      </div>
    </Card>
  );
}
