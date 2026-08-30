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
  CalendarClock,
  FileText,
  Handshake,
  Receipt,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  enabled: boolean;
  adminOnly?: boolean;
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
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Sales Team", href: "/team", icon: Users, enabled: true },
      { label: "Customers", href: "/customers", icon: Contact, enabled: true, adminOnly: true },
      { label: "Appointments", href: "/appointments", icon: CalendarClock, enabled: true },
      { label: "Quotations", href: "/quotations", icon: FileText, enabled: true },
      { label: "Deals", href: "/deals", icon: Handshake, enabled: true },
      { label: "Invoices", href: "/invoices", icon: Receipt, enabled: true },
      { label: "Coaching", href: "/coaching", icon: NotebookPen, enabled: true, adminOnly: true },
      { label: "Targets", href: "/targets", icon: Target, enabled: true },
      { label: "Planning", href: "/planning", icon: PenTool, enabled: true, adminOnly: true },
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

/** Filters out admin-only nav items (and any groups left empty) for non-admin users. */
export function getVisibleNavGroups(isAdmin: boolean): NavGroup[] {
  if (isAdmin) return navGroups;
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.adminOnly),
    }))
    .filter((group) => group.items.length > 0);
}
