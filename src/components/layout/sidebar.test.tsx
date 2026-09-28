import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "./sidebar";

const session = vi.hoisted(() => ({ admin: false }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ hasRole: () => session.admin }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));
afterEach(cleanup);

describe("tenant navigation permissions", () => {
  it("hides team and emergency alerts from coordinators", () => {
    session.admin = false;
    render(<Sidebar mobileOpen onClose={() => {}} />);
    expect(screen.queryByRole("link", { name: "Team" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Emergency Alerts" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Help Requests" })).toBeInTheDocument();
  });
  it("shows team and emergency alerts to tenant admins", () => {
    session.admin = true;
    render(<Sidebar mobileOpen onClose={() => {}} />);
    expect(screen.getByRole("link", { name: "Team" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Emergency Alerts" })).toBeInTheDocument();
  });
});
