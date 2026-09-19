import {
  Boxes,
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  type LucideIcon,
  MapPin,
  Radio,
  Tags,
  Users,
  UsersRound,
  UserCheck,
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
    label: "GIS Map View",
    href: "/map",
    icon: MapPin,
    description: "Spatial command center",
  },
  {
    label: "Tenants",
    href: "/tenants",
    icon: Building2,
    description: "Platform organizations",
  },
  {
    label: "Global Users",
    href: "/superadmin/users",
    icon: UserCheck,
    description: "Cross-tenant security",
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
    label: "Audit Logs",
    href: "/audit-logs",
    icon: ClipboardList,
    description: "Operational trail",
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
    description: "Find & dispatch",
  },
  {
    label: "Team",
    href: "/team",
    icon: Users,
    description: "Coordinators",
  },
];
