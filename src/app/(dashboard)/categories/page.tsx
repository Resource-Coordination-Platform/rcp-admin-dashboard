"use client";

import { useState } from "react";
import {
  Pencil,
  Plus,
  RotateCcw,
  Tags,
  Trash2,
} from "lucide-react";
import {
  useCategories,
  useCreateCategory,
  useDeactivateCategory,
  useUpdateCategory,
} from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import type { ResourceCategoryRead } from "@/lib/types";
import { ApiError } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Skeleton,
  Textarea,
} from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/format";

export default function CategoriesPage() {
  const [showInactive, setShowInactive] = useState(false);
  const { data, isLoading } = useCategories(showInactive);
  const [editing, setEditing] = useState<ResourceCategoryRead | null>(null);
  const [creating, setCreating] = useState(false);
  const { profile } = useAuth();
  const isAdmin = profile?.user_type === "TENANT_ADMIN";

  const categories = data ?? [];

  return (
    <div>
      <PageHeader
        title="Resource Categories"
        description="Categories group inventory items and emergency requests with standard units."
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
            {isAdmin && (
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" />
                New category
              </Button>
            )}
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
            description="Categories group inventory and requests - e.g. Water, Medical, Emergency Shelter, Food Bank."
            action={
              isAdmin ? (
                <Button onClick={() => setCreating(true)}>
                  <Plus className="h-4 w-4" />
                  Create your first category
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <CategoryCard
              key={c.id}
              category={c}
              onEdit={() => setEditing(c)}
              isAdmin={isAdmin}
            />
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
  isAdmin,
}: {
  category: ResourceCategoryRead;
  onEdit: () => void;
  isAdmin: boolean;
}) {
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
          {isAdmin && (
            <button
              onClick={onEdit}
              aria-label={`Edit ${c.name}`}
              className="focus-ring rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 focus:opacity-100 group-hover:opacity-100"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <h3 className="mt-3 text-base font-semibold text-slate-900">{c.name}</h3>
      <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">
        {c.description || "No description provided."}
      </p>

      <div className="mt-4 border-t border-border pt-3">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-slate-700">Unit:</span> {c.unit}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Create / edit
// ---------------------------------------------------------------------------

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

  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [unit, setUnit] = useState(category?.unit ?? "unit");

  const canSave = !!name.trim();
  const pending = create.isPending || update.isPending;

  async function submit() {
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      unit: unit.trim() || "unit",
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

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={isEdit ? `Edit “${category!.name}”` : "New resource category"}
      description="Define resource category details."
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
    </Modal>
  );
}
