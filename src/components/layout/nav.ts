import {
  Boxes,
  LayoutDashboard,
  LifeBuoy,
  type LucideIcon,
  Radio,
  Tags,
  Users,
  UsersRound,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "KPIs & activity",
  },
  {
    label: "Help Requests",
    href: "/requests",
    icon: LifeBuoy,
    description: "Intake & triage",
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: Boxes,
    description: "Stock & reservations",
  },
  {
    label: "Categories",
    href: "/categories",
    icon: Tags,
    description: "Resource types",
  },
  {
    label: "Disaster Events",
    href: "/events",
    icon: Radio,
    description: "Declare & broadcast",
  },
  {
    label: "Volunteers",
    href: "/volunteers",
    icon: UsersRound,
    description: "Find & dispatch",
  },
  {
    label: "Team",
    href: "/team",
    icon: Users,
    description: "Coordinators",
  },
];
