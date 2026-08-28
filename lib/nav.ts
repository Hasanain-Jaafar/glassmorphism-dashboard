import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Contact,
  NotebookPen,
  Target,
  Package,
  PenTool,
  Settings,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  enabled: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, enabled: true },
      { label: "Planning", href: "/planning", icon: PenTool, enabled: true },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Sales Team", href: "/team", icon: Users, enabled: true },
      { label: "Customers", href: "/customers", icon: Contact, enabled: true },
      { label: "Coaching", href: "/coaching", icon: NotebookPen, enabled: true },
      { label: "Targets", href: "/targets", icon: Target, enabled: true },
    ],
  },
  {
    label: "Catalog",
    items: [
      { label: "Products", href: "/products", icon: Package, enabled: true },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings", href: "/settings", icon: Settings, enabled: true },
    ],
  },
];

export const primaryMobileNavItems: NavItem[] = navGroups[0].items;
