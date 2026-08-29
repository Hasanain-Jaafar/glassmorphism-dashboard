"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Lock, Search, UserPlus, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Reveal } from "@/components/motion/reveal";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CustomersTable } from "@/components/tables/customers-table";
import { CustomerDetailSheet } from "@/components/customers/customer-detail-sheet";
import {
  CustomerForm,
  type CustomerFormValues,
} from "@/components/customers/customer-form";
import { customerStatusLabels } from "@/components/customers/customer-styles";
import { fetchTeamMembers, type TeamMember } from "@/lib/supabase/team";
import {
  fetchCustomers,
  createCustomer,
  updateCustomer,
  subscribeToCustomers,
} from "@/lib/supabase/customers";
import {
  computeCustomerStats,
  dateRangeOptions,
  dateRangeStart,
  type Customer,
  type DateRangeFilter,
} from "@/lib/customers-data";
import { formatUSD } from "@/lib/format";

const ALL = "all";

const quickActionMessages: Record<"appointment" | "quotation" | "invoices", string> = {
  appointment: "Appointments aren't built yet — coming soon.",
  quotation: "Quotations aren't built yet — coming soon.",
  invoices: "Invoices aren't built yet — coming soon.",
};

export default function CustomersPage() {
  const { isAdmin } = useAuth();
  const [customersList, setCustomersList] = useState<Customer[] | null>(null);
  const [salespeople, setSalespeople] = useState<TeamMember[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchCustomers()
      .then(setCustomersList)
      .catch((err) => {
        toast.error(err.message ?? "Couldn't load customers");
        setCustomersList([]);
      });
    fetchTeamMembers()
      .then((team) => setSalespeople(team.filter((m) => m.role === "sales_rep")))
      .catch((err) =>
        toast.error(err.message ?? "Couldn't load salespeople")
      );
  }, [isAdmin]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [salespersonFilter, setSalespersonFilter] = useState<string>(ALL);
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();
  const [detailOpen, setDetailOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>();

  // Live sync across admin sessions: another admin's add/edit/delete shows
  // up here without a manual refresh (requires migration 12 — Realtime
  // enabled on the customers table).
  useEffect(() => {
    if (!isAdmin) return;
    return subscribeToCustomers({
      onInsert: (customer) => {
        setCustomersList((prev) => {
          if (!prev || prev.some((c) => c.id === customer.id)) return prev;
          return [customer, ...prev];
        });
      },
      onUpdate: (customer) => {
        setCustomersList((prev) =>
          prev ? prev.map((c) => (c.id === customer.id ? customer : c)) : prev
        );
        setSelectedCustomer((prev) =>
          prev && prev.id === customer.id ? customer : prev
        );
      },
      onDelete: (id) => {
        setCustomersList((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
        setSelectedCustomer((prev) => (prev && prev.id === id ? undefined : prev));
      },
    });
  }, [isAdmin]);

  const stats = useMemo(
    () => computeCustomerStats(customersList ?? []),
    [customersList]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rangeStart = dateRangeStart(dateRange);
    return (customersList ?? []).filter((c) => {
      const matchesSearch =
        !query ||
        c.company.toLowerCase().includes(query) ||
        c.contactPerson.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.phone.toLowerCase().includes(query);
      const matchesStatus = statusFilter === ALL || c.status === statusFilter;
      const matchesSalesperson =
        salespersonFilter === ALL || c.assignedSalespersonId === salespersonFilter;
      const matchesDate = !rangeStart || new Date(c.createdAt) >= rangeStart;
      return matchesSearch && matchesStatus && matchesSalesperson && matchesDate;
    });
  }, [customersList, search, statusFilter, salespersonFilter, dateRange]);

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== ALL ||
    salespersonFilter !== ALL ||
    dateRange !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter(ALL);
    setSalespersonFilter(ALL);
    setDateRange("all");
  }

  function openAddForm() {
    setEditingCustomer(undefined);
    setFormOpen(true);
  }

  function openEditForm(customer: Customer) {
    setEditingCustomer(customer);
    setDetailOpen(false);
    setFormOpen(true);
  }

  function openDetails(customer: Customer) {
    setSelectedCustomer(customer);
    setDetailOpen(true);
  }

  function handleQuickAction(
    _customer: Customer,
    action: "appointment" | "quotation" | "invoices"
  ) {
    toast(quickActionMessages[action]);
  }

  async function handleFormSubmit(values: CustomerFormValues) {
    try {
      if (editingCustomer) {
        const updated = await updateCustomer(editingCustomer.id, values);
        setCustomersList((prev) =>
          (prev ?? []).map((c) => (c.id === editingCustomer.id ? updated : c))
        );
        setSelectedCustomer((prev) =>
          prev && prev.id === editingCustomer.id ? updated : prev
        );
        toast.success(`${updated.company} was updated`);
      } else {
        const created = await createCustomer(values);
        setCustomersList((prev) => [created, ...(prev ?? [])]);
        toast.success(`${created.company} was added`);
      }
      setFormOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't save the customer"
      );
    }
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Reveal>
          <PageHeader title="Customers" />
        </Reveal>
        <Reveal delay={0.05}>
          <div className="glass-panel flex flex-col items-center rounded-2xl p-10 text-center">
            <Lock className="size-6 text-text-tertiary" />
            <p className="mt-3 text-sm font-medium text-foreground">
              Admins only
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-text-tertiary">
              Customer accounts are managed by admins and aren&apos;t visible
              to sales representatives.
            </p>
          </div>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Reveal>
        <PageHeader
          title="Customers"
          description="Who your customers are, who owns them, and what they owe"
          actions={
            <Button onClick={openAddForm}>
              <UserPlus className="size-4" />
              Add Customer
            </Button>
          }
        />
      </Reveal>

      <Reveal delay={0.05}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <MetricCard
            label="Total Customers"
            value={String(stats.total)}
            footnote="All accounts"
          />
          <MetricCard
            label="New Customers"
            value={String(stats.newThisMonth)}
            footnote="Added this month"
          />
          <MetricCard
            label="Active Customers"
            value={String(stats.active)}
            footnote="Currently active"
          />
          <MetricCard
            label="Total Customer Revenue"
            value={formatUSD(stats.totalRevenue)}
            footnote="Lifetime, all customers"
          />
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <InputGroup className="glass-panel sm:max-w-xs">
            <InputGroupAddon>
              <Search className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search by name, company, email, phone..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </InputGroup>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(value) => value && setStatusFilter(value)}
            >
              <SelectTrigger className="glass-panel h-8 gap-1.5 rounded-lg px-2.5 text-xs">
                <SelectValue>
                  {(value: string) =>
                    value === ALL
                      ? "All Statuses"
                      : (customerStatusLabels[value as Customer["status"]] ?? value)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={ALL}>All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={salespersonFilter}
              onValueChange={(value) => value && setSalespersonFilter(value)}
            >
              <SelectTrigger className="glass-panel h-8 gap-1.5 rounded-lg px-2.5 text-xs">
                <SelectValue>
                  {(value: string) =>
                    value === ALL
                      ? "All Salespeople"
                      : (salespeople.find((p) => p.id === value)?.name ?? value)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={ALL}>All Salespeople</SelectItem>
                {salespeople.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs text-text-tertiary">
                    No sales representatives yet
                  </p>
                ) : (
                  salespeople.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Select
              value={dateRange}
              onValueChange={(value) => value && setDateRange(value as DateRangeFilter)}
            >
              <SelectTrigger className="glass-panel h-8 gap-1.5 rounded-lg px-2.5 text-xs">
                <SelectValue>
                  {(value: string) =>
                    dateRangeOptions.find((o) => o.value === value)?.label ?? value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                {dateRangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        {customersList === null ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : filtered.length === 0 ? (
          <div className="glass-panel flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-foreground/[0.06] text-text-tertiary">
              <UsersRound className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                No customers found
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                {hasActiveFilters
                  ? "Try adjusting your search or filters."
                  : "Add your first customer to start tracking sales."}
              </p>
            </div>
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button size="sm" onClick={openAddForm}>
                <UserPlus className="size-3.5" />
                Add Customer
              </Button>
            )}
          </div>
        ) : (
          <CustomersTable
            data={filtered}
            salespeople={salespeople}
            onView={openDetails}
            onEdit={openEditForm}
            onQuickAction={handleQuickAction}
          />
        )}
      </Reveal>

      <CustomerDetailSheet
        customer={selectedCustomer}
        salespeople={salespeople}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={() => selectedCustomer && openEditForm(selectedCustomer)}
        onQuickAction={(action) =>
          selectedCustomer && handleQuickAction(selectedCustomer, action)
        }
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Edit Customer" : "Add Customer"}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer
                ? "Update this customer's details and assignment."
                : "New customers start as a Prospect until their first deal closes."}
            </DialogDescription>
          </DialogHeader>
          <CustomerForm
            customer={editingCustomer}
            salespeople={salespeople}
            onSubmit={handleFormSubmit}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
