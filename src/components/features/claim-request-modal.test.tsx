import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ClaimRequestModal } from "./claim-request-modal";
import type { HelpRequestRead } from "@/lib/types";
import { inventoryToday } from "@/lib/inventory";
vi.mock("@/lib/hooks", () => ({
  useInventory: () => ({ data: [
    { id: "expired", name: "Old rice", category_id: "food", expiry_date: "2000-01-01", status: "available", quantity_available: 30 },
    { id: "today", name: "Expires today", category_id: "food", expiry_date: inventoryToday(), status: "available", quantity_available: 30 },
    { id: "fresh", name: "Fresh rice", category_id: "food", expiry_date: null, status: "available", quantity_available: 30 },
  ], isLoading: false }),
  useCategories: () => ({ data: [{ id: "food", name: "Food", unit: "kg" }] }),
  useDistricts: () => ({ data: { Galle: {} } }),
}));
vi.mock("@/lib/deliveries", () => ({ useCreateGoodsDelivery: () => ({ mutateAsync: vi.fn() }) }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
afterEach(cleanup);
it("hides expired and expiry-today stock from help-request allocation", () => {
  render(<ClaimRequestModal request={{ id: "request-1", status: "VERIFIED", requested_items: [] } as unknown as HelpRequestRead} isOpen onClose={() => {}} />);
  expect(screen.queryByRole("spinbutton", { name: "Allocate Old rice" })).not.toBeInTheDocument();
  expect(screen.queryByRole("spinbutton", { name: "Allocate Expires today" })).not.toBeInTheDocument();
  expect(screen.getByRole("spinbutton", { name: "Allocate Fresh rice" })).toBeInTheDocument();
});
