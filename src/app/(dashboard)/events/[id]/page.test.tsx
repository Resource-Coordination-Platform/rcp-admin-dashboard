import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EventDetailPage from "./page";
import { useEvent, useEventAssignments } from "@/lib/hooks";
import { ApiError } from "@/lib/api";

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "event-123" }) }));
vi.mock("@/lib/hooks", () => ({
  useEvent: vi.fn(), useEventAssignments: vi.fn(),
  useCloseEvent: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRebroadcastEvent: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

const event = {
  id: "event-123", title: "Flood relief", status: "BROADCASTING", source_district: "Galle",
  latitude: null, longitude: null, description: null, broadcast_type: "RADIUS_L1",
  target_districts: [], created_at: "2026-09-26T00:00:00Z",
  requirements: [{ id: "skill-1", skill: "first_aid", filled_count: 3, required_count: 5, status: "OPEN" }],
};

function mockEvent(data: unknown, error: unknown = null) {
  vi.mocked(useEvent).mockReturnValue({ data, error, isLoading: false, refetch: vi.fn() } as unknown as ReturnType<typeof useEvent>);
}

beforeEach(() => {
  mockEvent(event);
  vi.mocked(useEventAssignments).mockReturnValue({
    data: ["ACCEPTED", "EN_ROUTE", "COMPLETED"].map((status, index) => ({
      id: String(index), status, requirement: event.requirements[0],
      volunteer: { full_name: `Volunteer ${index}`, phone: null, base_district: "Galle" },
      updated_at: "2026-09-26T01:00:00Z",
    })), isLoading: false, error: null, refetch: vi.fn(),
  } as unknown as ReturnType<typeof useEventAssignments>);
});
afterEach(cleanup);

describe("event detail", () => {
  it("reads the route ID and displays volunteer progress separately from fill", () => {
    render(<EventDetailPage />);
    expect(useEvent).toHaveBeenCalledWith("event-123");
    expect(useEventAssignments).toHaveBeenCalledWith("event-123");
    expect(screen.getByText("Flood relief")).toBeInTheDocument();
    expect(screen.getByText(/Task completion: 1 \/ 3/)).toBeInTheDocument();
    expect(screen.getByText("Volunteer 2")).toBeInTheDocument();
    expect(screen.getAllByText("En route")).toHaveLength(2);
    expect(screen.queryByText("Event not found.")).not.toBeInTheDocument();
  });

  it("does not label a server failure as a missing event", () => {
    mockEvent(undefined, new ApiError(500, "Unavailable"));
    render(<EventDetailPage />);
    expect(screen.getByText("Unable to load this event. Please try again.")).toBeInTheDocument();
  });

  it("shows not found only for a 404", () => {
    mockEvent(undefined, new ApiError(404, "Event not found"));
    render(<EventDetailPage />);
    expect(screen.getByText("Event not found.")).toBeInTheDocument();
  });
});
