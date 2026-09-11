import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import OverviewPage from "./page";

// get fack rechart vlaues
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: () => <div data-testid="bar-chart" />,
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
  useNeedVsFulfillment: () => ({ data: [], isLoading: false }),
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
      "A live snapshot of your organization's relief operations.",
    );
    expect(descElement).toBeInTheDocument();
  });
});
