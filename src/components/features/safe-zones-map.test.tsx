import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SafeZonesMap from "./safe-zones-map";

const state = vi.hoisted(() => ({
  pick: null as null | ((event: { latlng: { lat: number; lng: number } }) => void),
  save: vi.fn(),
  fitBounds: vi.fn(),
}));
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: any) => <div>{children}</div>,
  TileLayer: () => null,
  ZoomControl: () => null,
  CircleMarker: ({ children }: any) => <div>{children}</div>,
  Popup: ({ children }: any) => <div>{children}</div>,
  useMap: () => ({ fitBounds: state.fitBounds }),
  useMapEvents: ({ click }: any) => { state.pick = click; },
}));
vi.mock("@/lib/safe-zones", () => ({
  useSafeZones: () => ({ data: [{ id: "one", name: "Existing camp", lat: 7, lng: 80, type: "camp" }] }),
  useCreateSafeZone: () => ({ mutateAsync: state.save, reset: vi.fn(), isPending: false }),
}));

describe("Safe zones map", () => {
  beforeEach(() => vi.clearAllMocks());
  it("saves the selected map coordinates and clears the draft after success", async () => {
    state.save.mockResolvedValue({});
    render(<SafeZonesMap />);
    expect(screen.getByText("Existing camp")).toBeInTheDocument();
    act(() => state.pick?.({ latlng: { lat: 6.93, lng: 79.85 } }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: " School " } });
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "medical" } });
    fireEvent.click(screen.getByText("Save safe zone"));
    await waitFor(() => expect(state.save).toHaveBeenCalledWith({ name: "School", lat: 6.93, lng: 79.85, type: "medical" }));
    await waitFor(() => expect(screen.queryByText("Add safe zone")).not.toBeInTheDocument());
  });
  it("keeps the selected location and name when saving fails", async () => {
    state.save.mockRejectedValue(new Error("Offline"));
    render(<SafeZonesMap />);
    act(() => state.pick?.({ latlng: { lat: 7, lng: 80 } }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "School" } });
    fireEvent.click(screen.getByText("Save safe zone"));
    await waitFor(() => expect(state.save).toHaveBeenCalled());
    expect(screen.getByLabelText("Name")).toHaveValue("School");
    expect(screen.getByText(/7.00000, 80.00000/)).toBeInTheDocument();
  });
});
