import type { InventoryItemRead } from "./types";

// Date-only expiry uses the same Sri Lankan business day as the backend.
export function inventoryToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function isExpiredStock(
  item: InventoryItemRead,
  today = inventoryToday(),
) {
  return (
    item.status === "expired" ||
    (!!item.expiry_date && item.expiry_date <= today)
  );
}

export function availableStock(
  item: InventoryItemRead,
  today = inventoryToday(),
) {
  return isExpiredStock(item, today) ? 0 : item.quantity_available;
}

export function isLowStock(item: InventoryItemRead, today = inventoryToday()) {
  return (
    !isExpiredStock(item, today) &&
    item.quantity_available > 0 &&
    item.quantity_available <= 10
  );
}
