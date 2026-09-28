import { describe, expect, it } from "vitest";
import {
  availableStock,
  inventoryToday,
  isExpiredStock,
  isLowStock,
} from "./inventory";
import type { InventoryItemRead } from "./types";
const item = (expiry: string | null, quantity = 7) =>
  ({
    expiry_date: expiry,
    quantity_available: quantity,
    status: "available",
  }) as InventoryItemRead;
describe("inventory expiry", () => {
  it("uses the Sri Lankan date even before UTC midnight", () => {
    expect(inventoryToday(new Date("2026-09-26T18:30:00Z"))).toBe("2026-09-27");
  });
  it.each(["2026-09-26", "2026-09-27"])(
    "excludes expired stock %s from available and low stock",
    (expiry) => {
      expect(isExpiredStock(item(expiry), "2026-09-27")).toBe(true);
      expect(availableStock(item(expiry), "2026-09-27")).toBe(0);
      expect(isLowStock(item(expiry), "2026-09-27")).toBe(false);
    },
  );
  it("counts only usable low-stock records", () => {
    expect(isLowStock(item("2026-09-28"), "2026-09-27")).toBe(true);
    expect(isLowStock(item(null, 0), "2026-09-27")).toBe(false);
    expect(isLowStock(item(null, 11), "2026-09-27")).toBe(false);
    expect(isLowStock(item(null, 10), "2026-09-27")).toBe(true);
    expect(availableStock(item(null, 20), "2026-09-27")).toBe(20);
    expect(
      availableStock({ ...item(null), status: "expired" }, "2026-09-27"),
    ).toBe(0);
  });
});
