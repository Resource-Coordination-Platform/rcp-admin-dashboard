"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CircleCheck,
  Lock,
  Package,
  Plus,
} from "lucide-react";
import {
  useAddInventoryItem,
  useCategories,
  useInventory,
  useReserveStock,
} from "@/lib/hooks";
import type { InventoryItemRead } from "@/lib/types";
import { ApiError } from "@/lib/api";
import { formatDate, pct } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Progress,
  Select,
  Skeleton,
} from "@/components/ui/primitives";
import { InventoryStatusBadge } from "@/components/ui/badges";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

export default function InventoryPage() {
  const { data, isLoading } = useInventory();
  const categories = useCategories();
  const [addOpen, setAddOpen] = useState(false);
  const [reserveItem, setReserveItem] = useState<InventoryItemRead | null>(null);

  const categoryName = useMemo(() => {
    const map = new Map((categories.data ?? []).map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? "—";
  }, [categories.data]);

  const items = data ?? [];
  const totalAvailable = items.reduce((a, i) => a + i.quantity_available, 0);
  const totalReserved = items.reduce((a, i) => a + i.quantity_reserved, 0);
  const lowOrExpired = items.filter(
    (i) => i.status === "depleted" || i.status === "expired",
  ).length;

  const noCategories = (categories.data ?? []).length === 0;

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Track on-hand stock, reservations and expiries across resource categories."
        actions={
          <Button onClick={() => setAddOpen(true)} disabled={noCategories}>
            <Plus className="h-4 w-4" />
            Add item
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Items tracked"
          value={items.length}
          icon={Boxes}
          accent="brand"
          loading={isLoading}
        />
        <StatCard
          label="Available"
          value={totalAvailable}
          icon={CircleCheck}
          accent="emerald"
          loading={isLoading}
        />
        <StatCard
          label="Reserved"
          value={totalReserved}
          icon={Lock}
          accent="amber"
          loading={isLoading}
        />
        <StatCard
          label="Depleted / expired"
          value={lowOrExpired}
          icon={AlertTriangle}
          accent="red"
          loading={isLoading}
        />
      </div>

      {noCategories && !categories.isLoading && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>
            Create a resource category first inventory items must belong to a
            category.
          </span>
        </div>
      )}

      <Card>
        {isLoading ? (
          <div className="space-y-3 p-5">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No inventory items yet"
            description="Add donated or procured stock to start tracking availability."
            action={
              !noCategories && (
                <Button onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add item
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <THead>
              <TH>Item</TH>
              <TH>Category</TH>
              <TH className="w-56">Stock</TH>
              <TH>Status</TH>
              <TH>Expiry</TH>
              <TH className="text-right">Actions</TH>
            </THead>
            <TBody>
              {items.map((item) => (
                <TR key={item.id}>
                  <TD>
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.storage_location ?? "No location"}
                    </p>
                  </TD>
                  <TD className="text-slate-600">
                    {categoryName(item.category_id)}
                  </TD>
                  <TD>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-900">
                        {item.quantity_available} avail.
                      </span>
                      <span className="text-muted-foreground">
                        {item.quantity_reserved}/{item.quantity_total} reserved
                      </span>
                    </div>
                    <Progress
                      className="mt-1.5"
                      value={pct(item.quantity_reserved, item.quantity_total)}
                      tone={
                        item.quantity_available === 0 ? "danger" : "brand"
                      }
                    />
                  </TD>
                  <TD>
                    <InventoryStatusBadge status={item.status} />
                  </TD>
                  <TD className="text-slate-600">
                    {formatDate(item.expiry_date)}
                  </TD>
                  <TD className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={item.quantity_available === 0}
                      onClick={() => setReserveItem(item)}
                    >
                      Reserve
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {addOpen && (
        <AddItemModal
          categories={categories.data ?? []}
          onClose={() => setAddOpen(false)}
        />
      )}
      {reserveItem && (
        <ReserveModal
          item={reserveItem}
          onClose={() => setReserveItem(null)}
        />
      )}
    </div>
  );
}

function AddItemModal({
  categories,
  onClose,
}: {
  categories: { id: string; name: string; unit: string }[];
  onClose: () => void;
}) {
  const toast = useToast();
  const add = useAddInventoryItem();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [expiry, setExpiry] = useState("");
  const [location, setLocation] = useState("");
  const [donor, setDonor] = useState("");

  async function submit() {
    try {
      await add.mutateAsync({
        category_id: categoryId,
        name: name.trim(),
        quantity_total: Number(quantity) || 0,
        expiry_date: expiry || null,
        storage_location: location.trim() || null,
        donor_name: donor.trim() || null,
      });
      toast.success("Item added", `${name} is now in inventory.`);
      onClose();
    } catch (err) {
      toast.error(
        "Could not add item",
        err instanceof ApiError ? err.detail : "Unexpected error",
      );
    }
  }

  const valid = categoryId && name.trim() && Number(quantity) >= 0;

  return (
    <Modal
      open
      onClose={onClose}
      title="Add inventory item"
      description="Register donated or procured stock."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={add.isPending} disabled={!valid} onClick={submit}>
            Add item
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Category" required>
          <Select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Item name" required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bottled water (1.5L)"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantity" required>
            <Input
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Field>
          <Field label="Expiry date">
            <Input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Storage location">
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Warehouse A"
            />
          </Field>
          <Field label="Donor name">
            <Input
              value={donor}
              onChange={(e) => setDonor(e.target.value)}
              placeholder="Optional"
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function ReserveModal({
  item,
  onClose,
}: {
  item: InventoryItemRead;
  onClose: () => void;
}) {
  const toast = useToast();
  const reserve = useReserveStock();
  const [quantity, setQuantity] = useState("1");

  async function submit() {
    const qty = Number(quantity);
    try {
      await reserve.mutateAsync({ id: item.id, quantity: qty });
      toast.success("Stock reserved", `${qty} × ${item.name} reserved.`);
      onClose();
    } catch (err) {
      toast.error(
        "Could not reserve",
        err instanceof ApiError ? err.detail : "Unexpected error",
      );
    }
  }

  const qty = Number(quantity);
  const valid = qty > 0 && qty <= item.quantity_available;

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Reserve stock"
      description={item.name}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={reserve.isPending} disabled={!valid} onClick={submit}>
            Reserve
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Available</span>
            <span className="font-semibold text-slate-900">
              {item.quantity_available}
            </span>
          </div>
        </div>
        <Field
          label="Quantity to reserve"
          required
          error={
            qty > item.quantity_available
              ? "Exceeds available stock"
              : undefined
          }
        >
          <Input
            type="number"
            min={1}
            max={item.quantity_available}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
