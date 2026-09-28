import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import OverviewPage from "./page";

// get fack rechart vlaues
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ data }: any) => (
    <div data-testid="bar-chart">{JSON.stringify(data)}</div>
  ),
  Legend: () => <div />,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  PieChart: () => <div data-testid="pie-chart" />,
  Pie: () => <div />,
  Cell: () => <div />,
}));

// get fake hooks
vi.mock("@/lib/hooks", () => ({
  useRequestSummary: () => ({ data: {}, isLoading: false }),
  useNeedVsStock: () => ({
    data: [
      {
        category_id: "rice",
        category: "Rice",
        unit: "kg",
        quantity_needed: 15,
        stock_available: 40,
      },
      {
        category_id: "water",
        category: "Water",
        unit: "litres",
        quantity_needed: 0,
        stock_available: 0,
      },
    ],
    isLoading: false,
  }),
  useCategories: () => ({ data: [], isLoading: false }),
  useEvents: () => ({ data: [], isLoading: false }),
  useInventory: () => ({ data: [], isLoading: false }),
  useRequests: () => ({ data: [], isLoading: false }),
}));

describe("OverviewPage", () => {
  it("renders the overview page with correct title", () => {
    render(<OverviewPage />);

    // check overview title stay on pge
    const titleElement = screen.getByText("Overview");
    expect(titleElement).toBeInTheDocument();

    // check description
    const descElement = screen.getByText(
      "The live snapshot of the organization's relief operations.",
    );
    expect(descElement).toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId("bar-chart").textContent!)).toEqual([
      { name: "Rice", Needs: 15, "Available stock": 40, unit: "kg" },
      { name: "Water", Needs: 0, "Available stock": 0, unit: "litres" },
    ]);
  });
});
