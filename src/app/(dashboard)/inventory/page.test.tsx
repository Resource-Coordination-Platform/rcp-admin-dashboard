import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import InventoryPage from "./page";

const state = vi.hoisted(() => ({ expiry: null as string | null }));
vi.mock("@/lib/hooks", () => ({
  useCategories: () => ({
    data: [
      { id: "water", name: "Water", unit: "bottles", is_active: true },
      { id: "food", name: "Food", unit: "kg", is_active: true },
    ],
    isLoading: false,
  }),
  useInventory: () => ({
    data: [
      {
        id: "1",
        category_id: "water",
        name: "Drinking water",
        quantity_total: 100,
        quantity_available: 80,
        quantity_reserved: 20,
        status: "available",
        storage_location: "North",
        expiry_date: null,
      },
      {
        id: "2",
        category_id: "food",
        name: "Rice",
        quantity_total: 12,
        quantity_available: 7,
        quantity_reserved: 5,
        status: "available",
        storage_location: "South",
        expiry_date: state.expiry,
      },
      {
        id: "3",
        category_id: "food",
        name: "Beans",
        quantity_total: 30,
        quantity_available: 25,
        quantity_reserved: 5,
        status: "available",
        storage_location: "North",
        expiry_date: null,
      },
    ],
    isLoading: false,
  }),
}));
afterEach(() => { cleanup(); state.expiry = null; });

describe("category inventory", () => {
  it("separates units and totals and sorts items within categories", () => {
    render(<InventoryPage />);
    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((node) => node.textContent),
    ).toEqual(["Food", "Water"]);
    const food = within(screen.getByRole("region", { name: "Food" }));
    expect(food.getByText("32")).toBeInTheDocument();
    expect(food.getByText("10")).toBeInTheDocument();
    expect(food.queryByText("bottles")).not.toBeInTheDocument();
    expect(
      food
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.textContent?.split("North")[0].split("South")[0]),
    ).toEqual(["Beans", "Rice"]);
    expect(food.getByText("Low stock")).toBeInTheDocument();
  });
  it("updates category summaries to match location and search filters", () => {
    render(<InventoryPage />);
    fireEvent.change(
      screen.getByRole("combobox", { name: "Warehouse / location" }),
      { target: { value: "North" } },
    );
    const food = within(screen.getByRole("region", { name: "Food" }));
    expect(food.queryByText("Rice")).not.toBeInTheDocument();
    expect(food.getAllByText("25")).toHaveLength(2);
    expect(food.queryByText("32")).not.toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Search inventory" }),
      { target: { value: "water" } },
    );
    expect(
      screen.queryByRole("region", { name: "Food" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Water" })).toBeInTheDocument();
  });
  it("filters by category", () => {
    render(<InventoryPage />);
    fireEvent.change(screen.getByRole("combobox", { name: "Category" }), {
      target: { value: "food" },
    });
    expect(
      screen.queryByRole("region", { name: "Water" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Rice")).toBeInTheDocument();
    expect(screen.getByText("Beans")).toBeInTheDocument();
  });
});

it("keeps expired items in a red row but excludes them from available and low stock", () => {
  state.expiry = "2000-01-01";
  render(<InventoryPage />);
  const food = within(screen.getByRole("region", { name: "Food" }));
  expect(food.getAllByText("25")).toHaveLength(2);
  expect(food.queryByText("32")).not.toBeInTheDocument();
  const row = screen.getByText("Rice").closest("tr")!;
  expect(row).toHaveClass("bg-red-50");
  expect(within(row).getByText("Expired")).toBeInTheDocument();
  expect(within(row).getByRole("button", { name: "Reserve" })).toBeDisabled();
  expect(food.queryByText("Low stock")).not.toBeInTheDocument();
  expect(food.getByText("Low stock items")).toBeInTheDocument();
});
