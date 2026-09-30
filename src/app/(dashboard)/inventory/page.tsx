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
} from "lucide-react";
import {
  useAddInventoryItem,
  useCategories,
  useInventory,
  useReserveStock,
} from "@/lib/hooks";
import type { InventoryItemRead } from "@/lib/types";
import {
  availableStock,
  inventoryToday,
  isExpiredStock,
  isLowStock,
} from "@/lib/inventory";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
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
import { InventoryStatusBadge } from "@/components/ui/badges";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

export default function InventoryPage() {
  const { data, isLoading, isError, refetch } = useInventory();
  const categories = useCategories(true);
  const today = inventoryToday();
  const [categoryFilter, setCategoryFilter] = useState("all");
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
      return (
        matchLoc &&
        matchSearch &&
        (categoryFilter === "all" || item.category_id === categoryFilter)
      );
    });
  }, [items, locationFilter, search, categoryName, categoryFilter]);

  const groups = useMemo(() => {
    const grouped = new Map<string, InventoryItemRead[]>();
    for (const item of filteredItems) {
      const members = grouped.get(item.category_id) ?? [];
      members.push(item);
      grouped.set(item.category_id, members);
    }
    return [...grouped]
      .map(([id, members]) => ({
        id,
        name: categoryName(id),
        unit:
          categories.data?.find((category) => category.id === id)?.unit ?? "",
        items: [...members].sort(
          (a, b) => {
            // Expired items first, then low stock, then normal
            const aExpired = isExpiredStock(a, today) ? 0 : 1;
            const bExpired = isExpiredStock(b, today) ? 0 : 1;
            if (aExpired !== bExpired) return aExpired - bExpired;
            const aLow = isLowStock(a, today) ? 0 : 1;
            const bLow = isLowStock(b, today) ? 0 : 1;
            if (aLow !== bLow) return aLow - bLow;
            return (
              a.name.localeCompare(b.name) ||
              (a.storage_location ?? "").localeCompare(
                b.storage_location ?? "",
              ) ||
              a.id.localeCompare(b.id)
            );
          },
        ),
        available: members.reduce(
          (sum, item) => sum + availableStock(item, today),
          0,
        ),
        reserved: members.reduce(
          (sum, item) => sum + item.quantity_reserved,
          0,
        ),
        attention: members.filter((item) => isLowStock(item, today)).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  }, [filteredItems, categories.data, categoryName, today]);
  const activeCategories = (categories.data ?? []).filter(
    (category) => category.is_active,
  );
  const noCategories = activeCategories.length === 0;

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Browse stock by category, with availability and reservations for every item."
        actions={
          <Button onClick={() => setAddOpen(true)} disabled={noCategories}>
            <Plus className="h-4 w-4" />
            Inbound Donor Supply Intake
          </Button>
        }
      />

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
        <div className="flex flex-col gap-3 border-b border-border p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-48 text-xs"
            >
              <option value="all">All categories</option>
              {[...(categories.data ?? [])]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </Select>
            <Select
              aria-label="Warehouse / location"
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
              aria-label="Search inventory"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search inventory items…"
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {isLoading || categories.isLoading ? (
          <div className="space-y-3 p-5">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : isError || categories.isError ? (
          <EmptyState
            icon={AlertTriangle}
            title="Could not load inventory"
            description="Please try again."
            action={
              <Button
                onClick={() => {
                  void refetch();
                  void categories.refetch();
                }}
              >
                Retry
              </Button>
            }
          />
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
          <div className="space-y-6 bg-slate-50/50 p-4">
            <p className="text-xs text-muted-foreground">
              Showing {filteredItems.length} stock records in {groups.length}{" "}
              categories. Summaries follow your filters. Low stock: 1 to 10 available units per record. Expired stock is excluded.
            </p>
            {groups.map((group) => (
              <section
                key={group.id}
                aria-labelledby={`inventory-${group.id}`}
                className="overflow-hidden rounded-xl border border-coral-200/80 bg-white shadow-sm"
              >
                <div className="border-b border-coral-200/70 bg-gradient-to-r from-coral-50/90 to-coral-50/40 p-4">
                  <h2
                    id={`inventory-${group.id}`}
                    className="text-lg font-semibold text-slate-900"
                  >
                    {group.name}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {group.unit
                      ? `Stock measured in ${group.unit}`
                      : "Unit not specified"}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <StatCard
                      label="Items tracked"
                      value={group.items.length}
                      hint="Stock records"
                      icon={Boxes}
                      accent="brand"
                    />
                    <StatCard
                      label="Available"
                      value={group.available.toLocaleString()}
                      hint={group.unit}
                      icon={CircleCheck}
                      accent="emerald"
                    />
                    <StatCard
                      label="Reserved"
                      value={group.reserved.toLocaleString()}
                      hint={group.unit}
                      icon={Lock}
                      accent="amber"
                    />
                    <StatCard
                      label="Low stock items"
                      value={group.attention}
                      hint="Stock records"
                      icon={AlertTriangle}
                      accent="red"
                    />
                  </div>
                </div>
                <Table>
                  <THead>
                    <TH>Item & Warehouse Location</TH>
                    <TH className="text-right">Available</TH>
                    <TH className="text-right">Reserved</TH>
                    <TH className="text-right">Total</TH>
                    <TH>Status / alerts</TH>
                    <TH>Expiry</TH>
                    <TH className="text-right">Actions</TH>
                  </THead>
                  <TBody>
                    {group.items.map((item) => {
                      const expired = isExpiredStock(item, today);
                      const lowStock = isLowStock(item, today);
                      return (
                        <TR
                          key={item.id}
                          className={
                            expired
                              ? "bg-red-50/80 border-l-4 border-l-red-500 !bg-red-50"
                              : lowStock
                              ? "bg-amber-50/40 border-l-4 border-l-amber-400"
                              : undefined
                          }
                        >
                          <TD>
                            <p className={`font-semibold ${expired ? "text-red-700" : "text-slate-900"}`}>
                              {item.name}
                              {expired && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-inset ring-red-300">
                                  EXPIRED
                                </span>
                              )}
                            </p>
                            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <MapPin className="h-3 w-3 text-brand-600" />
                              {item.storage_location ?? "Central Warehouse"}
                            </p>
                          </TD>
                          <TD className="text-right">
                            <span className={`font-semibold tabular-nums ${expired ? "text-red-600 line-through" : "text-emerald-700"}`}>
                              {availableStock(item, today).toLocaleString()}
                            </span>
                            <span className="ml-1 text-xs text-muted-foreground">
                              {group.unit}
                            </span>
                          </TD>
                          <TD className="text-right">
                            <span className="font-semibold tabular-nums text-amber-700">
                              {item.quantity_reserved.toLocaleString()}
                            </span>
                            <span className="ml-1 text-xs text-muted-foreground">
                              {group.unit}
                            </span>
                          </TD>
                          <TD className="text-right">
                            <span className="tabular-nums">
                              {item.quantity_total.toLocaleString()}
                            </span>
                            <span className="ml-1 text-xs text-muted-foreground">
                              {group.unit}
                            </span>
                          </TD>
                          <TD>
                            <div className="flex flex-wrap gap-1.5">
                              <InventoryStatusBadge
                                status={expired ? "expired" : item.status}
                              />
                              {lowStock && (
                                <Badge tone="warning">Low stock</Badge>
                              )}
                              {item.quantity_available <= 0 &&
                                item.status !== "depleted" &&
                                !expired && (
                                  <Badge tone="warning">Out of stock</Badge>
                                )}
                            </div>
                          </TD>
                          <TD className={expired ? "font-semibold text-red-600" : "text-slate-600"}>
                            {formatDate(item.expiry_date)}
                          </TD>
                          <TD className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                item.quantity_available <= 0 ||
                                expired ||
                                item.status === "depleted"
                              }
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
              </section>
            ))}
          </div>
        )}
      </Card>

      {addOpen && (
        <AddItemModal
          categories={activeCategories}
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
  const valid = !isExpiredStock(item) && qty > 0 && qty <= availableStock(item);

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
