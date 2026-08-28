import {
  CalendarClock,
  FileText,
  Handshake,
  Receipt,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { CustomerActivityType, CustomerStatus } from "@/lib/customers-data";

export const customerStatusStyles: Record<CustomerStatus, string> = {
  active: "bg-success/10 text-success",
  prospect: "bg-warning/10 text-warning",
  inactive: "bg-foreground/[0.06] text-text-tertiary",
};

export const customerStatusLabels: Record<CustomerStatus, string> = {
  active: "Active",
  prospect: "Prospect",
  inactive: "Inactive",
};

export const activityTypeIcons: Record<CustomerActivityType, LucideIcon> = {
  appointment: CalendarClock,
  quotation: FileText,
  deal: Handshake,
  invoice: Receipt,
  payment: Wallet,
};

export const activityTypeStyles: Record<CustomerActivityType, string> = {
  appointment: "bg-chart-4/10 text-chart-4",
  quotation: "bg-chart-2/10 text-chart-2",
  deal: "bg-primary/10 text-primary",
  invoice: "bg-chart-3/10 text-chart-3",
  payment: "bg-success/10 text-success",
};

export const activityTypeLabels: Record<CustomerActivityType, string> = {
  appointment: "Appointment",
  quotation: "Quotation",
  deal: "Closed Deal",
  invoice: "Invoice",
  payment: "Payment",
};
