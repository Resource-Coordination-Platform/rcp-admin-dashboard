import {
  Boxes,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  type LucideIcon,
  MapPin,
  Megaphone,
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
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "KPIs & activity",
  },
  {
    label: "Safe zones",
    href: "/map",
    icon: MapPin,
    description: "Relief camps & medical centres",
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
    label: "Emergency Alerts",
    href: "/alerts",
    adminOnly: true,
    icon: Megaphone,
    description: "Broadcast warnings",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: FileText,
    description: "Need vs fulfillment",
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
    description: "Find available",
  },
  {
    label: "Team",
    href: "/team",
    adminOnly: true,
    icon: Users,
    description: "Admins & coordinators",
  },
];
