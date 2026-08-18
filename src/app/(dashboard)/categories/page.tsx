"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Check, GitBranch, ListChecks, Pencil, Plus, RotateCcw, Tags, Trash2, X, } from "lucide-react";
import { useCategories, useCreateCategory, useDeactivateCategory, useUpdateCategory, } from "@/lib/hooks";
import type { FormFieldType, RequestStatus, ResourceCategoryRead, WorkflowDefinition, } from "@/lib/types";
import { FIELD_TYPES, FIELD_TYPE_META, REQUEST_STATUS_META, SOURCE_STATUSES, REQUEST_STATUSES, } from "@/lib/constants";
import { type FieldDraft, MAX_FIELDS, draftFromSpec, emptyDraft, isChoice, isNumeric, isTextual, MAX_LENGTH_CAP, normalizeField, slugifyKey, validateFormSchema, 
} from "@/lib/form-schema";
import { defaultWorkflow, flowOrder, normalizeWorkflow, reachableFrom, validateWorkflow, } from "@/lib/workflow";
import { ApiError } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Skeleton, Textarea, } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/format";

export default function CategoriesPage() {
  const [showInactive, setShowInactive] = useState(false);
  const { data, isLoading } = useCategories(showInactive);
  const [editing, setEditing] = useState<ResourceCategoryRead | null>(null);
  const [creating, setCreating] = useState(false);

  const categories = data ?? [];

  return (
    <div>
      <PageHeader
        title="Resource Categories"
        description="Each category defines its own intake form and approval flow the workflow engine. No code deploy required."
        actions={
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Show retired
            </label>
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              New category
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <EmptyState
            icon={Tags}
            title="No categories yet"
            description="Categories group inventory and requests - e.g. Water, Medical, Emergency Shelter, Food Bank - and each one carries its own intake form and approval steps."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" />
                Create your first category
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <CategoryCard key={c.id} category={c} onEdit={() => setEditing(c)} />
          ))}
        </div>
      )}

      {creating && <CategoryModal onClose={() => setCreating(false)} />}
      {editing && (
        <CategoryModal category={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function CategoryCard({
  category: c,
  onEdit,
}: {
  category: ResourceCategoryRead;
  onEdit: () => void;
}) {
  const fieldCount = c.form_schema?.length ?? 0;
  return (
    <Card
      className={cn(
        "group flex flex-col p-5 transition hover:border-brand-200 hover:shadow-elevated",
        !c.is_active && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Tags className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={c.is_active ? "success" : "neutral"} dot>
            {c.is_active ? "Active" : "Retired"}
          </Badge>
          <button
            onClick={onEdit}
            aria-label={`Edit ${c.name}`}
            className="focus-ring rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 focus:opacity-100 group-hover:opacity-100"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </div>

      <h3 className="mt-3 text-base font-semibold text-slate-900">{c.name}</h3>
      <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">
        {c.description || "No description provided."}
      </p>

      <div className="mt-4 space-y-2 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            <span className="font-medium text-slate-700">Unit:</span> {c.unit}
          </span>
          <span className="inline-flex items-center gap-1">
            <ListChecks className="h-3.5 w-3.5" />
            {fieldCount === 0
              ? "No custom fields"
              : `${fieldCount} custom field${fieldCount > 1 ? "s" : ""}`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <GitBranch className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <FlowSummary workflow={c.workflow} />
        </div>
      </div>
    </Card>
  );
}

/** Compact left-to-right read of the approval flow, initial state first. */
function FlowSummary({ workflow }: { workflow: WorkflowDefinition | null }) {
  const order = flowOrder(workflow).slice(0, 4);
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1 text-xs">
      {!workflow && (
        <span className="text-muted-foreground">Default flow ·</span>
      )}
      {order.map((s, i) => (
        <span key={s} className="inline-flex items-center gap-1">
          {i > 0 && <ArrowRight className="h-3 w-3 text-slate-300" />}
          <span className="text-slate-600">{REQUEST_STATUS_META[s].label}</span>
        </span>
      ))}
      {flowOrder(workflow).length > 4 && (
        <span className="text-slate-400">…</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create / edit
// ---------------------------------------------------------------------------

type Tab = "details" | "form" | "workflow";

function CategoryModal({
  category,
  onClose,
}: {
  category?: ResourceCategoryRead;
  onClose: () => void;
}) {
  const isEdit = !!category;
  const toast = useToast();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const deactivate = useDeactivateCategory();

  const [tab, setTab] = useState<Tab>("details");
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [unit, setUnit] = useState(category?.unit ?? "unit");
  const [fields, setFields] = useState<FieldDraft[]>(
    () => category?.form_schema?.map(draftFromSpec) ?? [],
  );
  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(
    category?.workflow ?? null,
  );

  const fieldErrors = useMemo(() => validateFormSchema(fields), [fields]);
  const workflowErrors = useMemo(
    () => (workflow ? validateWorkflow(workflow) : []),
    [workflow],
  );
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const canSave =
    !!name.trim() && !hasFieldErrors && workflowErrors.length === 0;

  const pending = create.isPending || update.isPending;

  async function submit() {
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      unit: unit.trim() || "unit",
      form_schema: fields.length ? fields.map(normalizeField) : null,
      workflow: workflow ? normalizeWorkflow(workflow) : null,
    };
    try {
      if (isEdit) {
        await update.mutateAsync({ id: category!.id, body });
        toast.success("Category updated", `${body.name} has been saved.`);
      } else {
        await create.mutateAsync(body);
        toast.success("Category created", `${body.name} is ready to use.`);
      }
      onClose();
    } catch (err) {
      toast.error(
        isEdit ? "Could not update category" : "Could not create category",
        err instanceof ApiError ? err.detail : "Unexpected error",
      );
    }
  }

  async function retire() {
    try {
      await deactivate.mutateAsync(category!.id);
      toast.success(
        "Category retired",
        "It no longer accepts new requests. Existing requests are unaffected.",
      );
      onClose();
    } catch (err) {
      toast.error(
        "Could not retire category",
        err instanceof ApiError ? err.detail : "Unexpected error",
      );
    }
  }

  async function reactivate() {
    try {
      await update.mutateAsync({
        id: category!.id,
        body: { is_active: true },
      });
      toast.success("Category reactivated", "It accepts new requests again.");
      onClose();
    } catch (err) {
      toast.error(
        "Could not reactivate category",
        err instanceof ApiError ? err.detail : "Unexpected error",
      );
    }
  }

  const tabs: { id: Tab; label: string; badge?: string; warn?: boolean }[] = [
    { id: "details", label: "Details" },
    {
      id: "form",
      label: "Intake form",
      badge: fields.length ? String(fields.length) : undefined,
      warn: hasFieldErrors,
    },
    {
      id: "workflow",
      label: "Approval flow",
      badge: workflow ? "Custom" : "Default",
      warn: workflowErrors.length > 0,
    },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={isEdit ? `Edit “${category!.name}”` : "New resource category"}
      description="Define what this category collects at intake and the steps a request moves through."
      footer={
        <>
          {isEdit &&
            (category!.is_active ? (
              <Button
                variant="outline"
                className="mr-auto text-red-600 hover:bg-red-50 hover:text-red-700"
                loading={deactivate.isPending}
                onClick={retire}
              >
                <Trash2 className="h-4 w-4" />
                Retire category
              </Button>
            ) : (
              <Button
                variant="outline"
                className="mr-auto"
                loading={update.isPending}
                onClick={reactivate}
              >
                <RotateCcw className="h-4 w-4" />
                Reactivate
              </Button>
            ))}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={pending} disabled={!canSave} onClick={submit}>
            {isEdit ? "Save changes" : "Create category"}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "focus-ring -mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                tab === t.id
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-800",
              )}
            >
              {t.label}
              {t.warn ? (
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              ) : t.badge ? (
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {tab === "details" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Field label="Name" required>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Emergency Shelter"
                  />
                </Field>
              </div>
              <Field label="Unit" hint="e.g. box, litre, bed">
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="unit"
                />
              </Field>
            </div>
            <Field label="Description">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What kinds of resources fall under this category?"
              />
            </Field>
          </div>
        )}

        {tab === "form" && (
          <FormBuilder
            fields={fields}
            errors={fieldErrors}
            onChange={setFields}
          />
        )}

        {tab === "workflow" && (
          <WorkflowBuilder
            workflow={workflow}
            errors={workflowErrors}
            onChange={setWorkflow}
          />
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Intake form builder
// ---------------------------------------------------------------------------

function FormBuilder({
  fields,
  errors,
  onChange,
}: {
  fields: FieldDraft[];
  errors: Record<number, string>;
  onChange: (fields: FieldDraft[]) => void;
}) {
  function patch(index: number, next: Partial<FieldDraft>) {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...next } : f)));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Extra questions asked when someone submits a request in this category.
          Answers are validated against these definitions server side, so a
          request can never carry a field you did not define.
        </p>
        <Button
          size="sm"
          variant="subtle"
          disabled={fields.length >= MAX_FIELDS}
          onClick={() => onChange([...fields, emptyDraft()])}
        >
          <Plus className="h-3.5 w-3.5" />
          Add field
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <ListChecks className="mx-auto h-6 w-6 text-slate-300" />
          <p className="mt-2 text-sm font-medium text-slate-700">
            No custom fields
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Requests in this category collect the standard details only.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, i) => (
            <FieldEditor
              key={i}
              index={i}
              field={field}
              error={errors[i]}
              onPatch={(next) => patch(i, next)}
              onRemove={() => onChange(fields.filter((_, idx) => idx !== i))}
            />
          ))}
        </div>
      )}
      {errors[MAX_FIELDS] && (
        <p className="text-xs text-red-600">{errors[MAX_FIELDS]}</p>
      )}
    </div>
  );
}

function FieldEditor({
  index,
  field,
  error,
  onPatch,
  onRemove,
}: {
  index: number;
  field: FieldDraft;
  error?: string;
  onPatch: (next: Partial<FieldDraft>) => void;
  onRemove: () => void;
}) {
  const cap = MAX_LENGTH_CAP[field.type];

  // While the admin has not touched the key, it tracks the label — the wire
  // contract is the key, but nobody should have to think about it.
  function setLabel(label: string) {
    onPatch(field.keyAuto ? { label, key: slugifyKey(label) } : { label });
  }

  function setType(type: FormFieldType) {
    onPatch({ type });
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-3",
        error ? "border-red-300 bg-red-50/40" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-medium text-slate-500">
          {index + 1}
        </span>
        <Input
          value={field.label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Field label — e.g. Household size"
          className="h-9 min-w-[10rem] flex-1"
          aria-label="Field label"
        />
        <Select
          value={field.type}
          onChange={(e) => setType(e.target.value as FormFieldType)}
          className="h-9 w-40"
          aria-label="Field type"
        >
          {FIELD_TYPES.map((t) => (
            <option key={t} value={t}>
              {FIELD_TYPE_META[t].label}
            </option>
          ))}
        </Select>
        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 px-1 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onPatch({ required: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Required
        </label>
        <button
          onClick={onRemove}
          className="focus-ring rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
          aria-label={`Remove field ${index + 1}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Field key
          </span>
          <Input
            value={field.key}
            onChange={(e) => onPatch({ key: e.target.value, keyAuto: false })}
            placeholder="household_size"
            className="h-8 font-mono text-xs"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Help text
          </span>
          <Input
            value={field.helpText}
            onChange={(e) => onPatch({ helpText: e.target.value })}
            placeholder="Shown under the input"
            className="h-8 text-xs"
          />
        </label>

        {isNumeric(field.type) && (
          <>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Minimum
              </span>
              <Input
                type="number"
                value={field.min}
                onChange={(e) => onPatch({ min: e.target.value })}
                placeholder="No minimum"
                className="h-8 text-xs"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Maximum
              </span>
              <Input
                type="number"
                value={field.max}
                onChange={(e) => onPatch({ max: e.target.value })}
                placeholder="No maximum"
                className="h-8 text-xs"
              />
            </label>
          </>
        )}

        {isTextual(field.type) && cap !== undefined && (
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Max length (up to {cap})
            </span>
            <Input
              type="number"
              value={field.maxLength}
              onChange={(e) => onPatch({ maxLength: e.target.value })}
              placeholder={String(cap)}
              className="h-8 text-xs"
            />
          </label>
        )}
      </div>

      {isChoice(field.type) && (
        <OptionsEditor
          options={field.options}
          onChange={(options) => onPatch({ options })}
        />
      )}

      <p
        className={cn(
          "mt-2 text-xs",
          error ? "text-red-600" : "text-muted-foreground",
        )}
      >
        {error ?? FIELD_TYPE_META[field.type].hint}
      </p>
    </div>
  );
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (options: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value || options.includes(value)) return;
    onChange([...options, value]);
    setDraft("");
  }

  return (
    <div className="mt-2.5 rounded-lg border border-border bg-slate-50/60 p-2.5">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Options
      </span>
      {options.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {options.map((option) => (
            <span
              key={option}
              className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs text-slate-700 ring-1 ring-inset ring-border"
            >
              {option}
              <button
                onClick={() => onChange(options.filter((o) => o !== option))}
                className="rounded-full p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                aria-label={`Remove option ${option}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add an option and press Enter"
          className="h-8 text-xs"
        />
        <Button size="sm" variant="outline" onClick={add} disabled={!draft.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Approval flow builder
// ---------------------------------------------------------------------------

function WorkflowBuilder({
  workflow,
  errors,
  onChange,
}: {
  workflow: WorkflowDefinition | null;
  errors: string[];
  onChange: (workflow: WorkflowDefinition | null) => void;
}) {
  const effective = workflow;
  const reachable = useMemo(
    () =>
      effective
        ? reachableFrom(effective.initial, effective.transitions)
        : new Set<RequestStatus>(),
    [effective],
  );

  function toggle(source: RequestStatus, target: RequestStatus) {
    if (!effective) return;
    const current = effective.transitions[source] ?? [];
    const next = current.includes(target)
      ? current.filter((s) => s !== target)
      : [...current, target];
    onChange({
      ...effective,
      transitions: { ...effective.transitions, [source]: next },
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Which steps a request in this category moves through. States come from
        the platform so reporting stays comparable across categories you
        choose which ones you use and how they connect.
      </p>

      {/* default vs custom */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <ModeCard
          active={!workflow}
          title="Platform default"
          description="Pending → Verified → Approved → In progress → Fulfilled, with reject and cancel available throughout."
          onSelect={() => onChange(null)}
        />
        <ModeCard
          active={!!workflow}
          title="Custom flow"
          description="Define your own steps — e.g. a food bank hand-out that goes straight from Pending to Approved."
          onSelect={() => onChange(workflow ?? defaultWorkflow())}
        />
      </div>

      {effective && (
        <div className="space-y-4 rounded-xl border border-border bg-slate-50/60 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="w-56">
              <Field
                label="Requests start as"
                hint="The state a new request is created in."
              >
                <Select
                  value={effective.initial}
                  onChange={(e) =>
                    onChange({
                      ...effective,
                      initial: e.target.value as RequestStatus,
                    })
                  }
                  className="h-9"
                >
                  {SOURCE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {REQUEST_STATUS_META[s].label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onChange(defaultWorkflow())}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to default steps
            </Button>
          </div>

          <div className="space-y-2">
            {SOURCE_STATUSES.map((source) => {
              const targets = effective.transitions[source] ?? [];
              const isInitial = source === effective.initial;
              const orphaned = targets.length > 0 && !reachable.has(source);
              return (
                <div
                  key={source}
                  className={cn(
                    "rounded-lg border bg-white p-3",
                    orphaned ? "border-red-300" : "border-border",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      From {REQUEST_STATUS_META[source].label}
                    </span>
                    {isInitial && <Badge tone="brand">Start</Badge>}
                    {orphaned && (
                      <Badge tone="danger">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Unreachable
                      </Badge>
                    )}
                    {targets.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        not used in this flow
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {REQUEST_STATUSES.filter((s) => s !== source).map(
                      (target) => (
                        <StatusToggle
                          key={target}
                          status={target}
                          active={targets.includes(target)}
                          onClick={() => toggle(source, target)}
                        />
                      ),
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-red-800">
                <AlertTriangle className="h-4 w-4" />
                This flow cannot be saved yet
              </p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs text-red-700">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModeCard({
  active,
  title,
  description,
  onSelect,
}: {
  active: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "focus-ring rounded-xl border p-3 text-left transition",
        active
          ? "border-brand-400 bg-brand-50/60 ring-1 ring-brand-200"
          : "border-border bg-white hover:border-brand-200",
      )}
    >
      <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        {active && <Check className="h-4 w-4 text-brand-600" />}
        {title}
      </span>
      <span className="mt-1 block text-xs text-muted-foreground">
        {description}
      </span>
    </button>
  );
}

function StatusToggle({
  status,
  active,
  onClick,
}: {
  status: RequestStatus;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "focus-ring inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition",
        active
          ? "bg-brand-600 text-white ring-brand-600"
          : "bg-white text-slate-600 ring-border hover:bg-slate-50",
      )}
    >
      {active ? (
        <Check className="h-3 w-3" />
      ) : (
        <Plus className="h-3 w-3 opacity-50" />
      )}
      {REQUEST_STATUS_META[status].label}
    </button>
  );
}
