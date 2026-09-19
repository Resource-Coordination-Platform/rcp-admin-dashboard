"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CircleCheck,
  Lock,
  MapPin,
  Package,
  Plus,
  Search,
  User,
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
  Badge,
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
  const [locationFilter, setLocationFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [reserveItem, setReserveItem] = useState<InventoryItemRead | null>(
    null,
  );

  const categoryName = useMemo(() => {
    const map = new Map((categories.data ?? []).map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? "—";
  }, [categories.data]);

  const items = data ?? [];

  // Extract unique locations for location tagging filter
  const locations = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.storage_location) set.add(i.storage_location);
    });
    return Array.from(set);
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchLoc =
        locationFilter === "all" || item.storage_location === locationFilter;
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.storage_location &&
          item.storage_location.toLowerCase().includes(q)) ||
        categoryName(item.category_id).toLowerCase().includes(q);
      return matchLoc && matchSearch;
    });
  }, [items, locationFilter, search, categoryName]);

  const totalAvailable = items.reduce((a, i) => a + i.quantity_available, 0);
  const totalReserved = items.reduce((a, i) => a + i.quantity_reserved, 0);
  const lowOrExpired = items.filter(
    (i) =>
      i.status === "depleted" ||
      i.status === "expired" ||
      i.quantity_available <= 10,
  ).length;

  const noCategories = (categories.data ?? []).length === 0;

  return (
    <div>
      <PageHeader
        title="Inventory Tracking & Stock Management"
        description="Warehouse level location tagging, low-stock threshold monitoring, and inbound donor supply intake."
        actions={
          <Button onClick={() => setAddOpen(true)} disabled={noCategories}>
            <Plus className="h-4 w-4" />
            Inbound Donor Supply Intake
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
          label="Low stock / expired"
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
            Create a resource category first; inventory items must belong to a
            category.
          </span>
        </div>
      )}

      <Card>
        {/* Toolbar with Location Tagging Filter */}
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-48 text-xs"
            >
              <option value="all">All Warehouses / Locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  🏢 {loc}
                </option>
              ))}
            </Select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search inventory items…"
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No inventory items found"
            description="Add donated or procured stock to start tracking warehouse availability."
            action={
              !noCategories && (
                <Button onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Inbound Donor Supply Intake
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <THead>
              <TH>Item & Warehouse Location</TH>
              <TH>Category</TH>
              <TH className="w-56">Stock & Thresholds</TH>
              <TH>Status</TH>
              <TH>Expiry</TH>
              <TH className="text-right">Actions</TH>
            </THead>
            <TBody>
              {filteredItems.map((item) => {
                const isLowStock =
                  item.quantity_available <= 10 && item.quantity_available > 0;
                return (
                  <TR key={item.id}>
                    <TD>
                      <p className="font-semibold text-slate-900">
                        {item.name}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="h-3 w-3 text-brand-600" />
                        {item.storage_location ?? "Central Warehouse"}
                      </p>
                    </TD>
                    <TD className="text-slate-600">
                      {categoryName(item.category_id)}
                    </TD>
                    <TD>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">
                          {item.quantity_available} avail.
                        </span>
                        <span className="text-muted-foreground">
                          {item.quantity_reserved}/{item.quantity_total} reserved
                        </span>
                      </div>
                      <Progress
                        className="mt-1.5"
                        value={pct(
                          item.quantity_reserved,
                          item.quantity_total,
                        )}
                        tone={
                          item.quantity_available === 0
                            ? "danger"
                            : isLowStock
                              ? "warning"
                              : "brand"
                        }
                      />
                      {isLowStock && (
                        <div className="mt-1">
                          <Badge tone="warning" className="text-[10px]">
                            ⚠️ Low Stock (≤10)
                          </Badge>
                        </div>
                      )}
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
                );
              })}
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
        <ReserveModal item={reserveItem} onClose={() => setReserveItem(null)} />
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
      title="Inbound Donor Supply Intake"
      description="Register incoming donor stock or procured supplies with warehouse location tagging."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={add.isPending} disabled={!valid} onClick={submit}>
            Record Inbound Intake
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
          <Button
            loading={reserve.isPending}
            disabled={!valid}
            onClick={submit}
          >
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
