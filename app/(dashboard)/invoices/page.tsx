"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Receipt } from "lucide-react";
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
import { InvoicesTable } from "@/components/tables/invoices-table";
import {
  InvoiceForm,
  type InvoiceFormValues,
} from "@/components/invoices/invoice-form";
import { invoiceStatusLabels } from "@/components/invoices/invoice-styles";
import { fetchTeamMembers, type TeamMember } from "@/lib/supabase/team";
import { fetchCustomers } from "@/lib/supabase/customers";
import { fetchDeals, type Deal } from "@/lib/supabase/deals";
import {
  fetchInvoices,
  createInvoice,
  updateInvoice,
  updateInvoiceStatus,
  type Invoice,
  type InvoiceStatus,
} from "@/lib/supabase/invoices";
import type { Customer } from "@/lib/customers-data";
import { formatUSD } from "@/lib/format";

const ALL = "all";

export default function InvoicesPage() {
  const { isAdmin, profile } = useAuth();

  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salespeople, setSalespeople] = useState<TeamMember[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);

  useEffect(() => {
    fetchInvoices()
      .then(setInvoices)
      .catch((err) => {
        toast.error(err.message ?? "Couldn't load invoices");
        setInvoices([]);
      });
    fetchCustomers()
      .then(setCustomers)
      .catch(() => {});
    fetchTeamMembers()
      .then((team) => setSalespeople(team.filter((m) => m.role === "sales_rep")))
      .catch(() => {});
    fetchDeals()
      .then(setDeals)
      .catch(() => {});
  }, []);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);

  const [formOpen, setFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>();

  const customersById = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers]
  );

  const stats = useMemo(() => {
    const list = invoices ?? [];
    const paid = list.filter((i) => i.status === "paid");
    const outstanding = list.filter(
      (i) => i.status === "sent" || i.status === "overdue"
    );
    const overdue = list.filter((i) => i.status === "overdue");
    return {
      paidTotal: paid.reduce((sum, i) => sum + i.amount, 0),
      outstandingTotal: outstanding.reduce((sum, i) => sum + i.amount, 0),
      overdueCount: overdue.length,
      paidCount: paid.length,
    };
  }, [invoices]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (invoices ?? []).filter((i) => {
      const customer = customersById.get(i.customerId ?? "");
      const matchesSearch = !query || customer?.company.toLowerCase().includes(query);
      const matchesStatus = statusFilter === ALL || i.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, statusFilter, customersById]);

  const hasActiveFilters = search.trim() !== "" || statusFilter !== ALL;

  function clearFilters() {
    setSearch("");
    setStatusFilter(ALL);
  }

  function openAddForm() {
    setEditingInvoice(undefined);
    setFormOpen(true);
  }

  function openEditForm(invoice: Invoice) {
    setEditingInvoice(invoice);
    setFormOpen(true);
  }

  async function handleFormSubmit(values: InvoiceFormValues) {
    try {
      if (editingInvoice) {
        const updated = await updateInvoice(editingInvoice.id, values);
        setInvoices((prev) =>
          (prev ?? []).map((i) => (i.id === editingInvoice.id ? updated : i))
        );
        toast.success("Invoice was updated");
      } else {
        const created = await createInvoice(values);
        setInvoices((prev) => [created, ...(prev ?? [])]);
        toast.success("Invoice was created");
      }
      setFormOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't save the invoice"
      );
    }
  }

  async function handleStatusChange(invoice: Invoice, status: InvoiceStatus) {
    try {
      const updated = await updateInvoiceStatus(invoice.id, status);
      setInvoices((prev) =>
        (prev ?? []).map((i) => (i.id === invoice.id ? updated : i))
      );
      toast.success(`Marked ${invoiceStatusLabels[status].toLowerCase()}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't update the invoice"
      );
    }
  }

  return (
    <div className="space-y-6">
      <Reveal>
        <PageHeader
          title="Invoices"
          description="What's paid, and what's still owed"
          actions={
            <Button onClick={openAddForm}>
              <Receipt className="size-4" />
              Add Invoice
            </Button>
          }
        />
      </Reveal>

      <Reveal delay={0.05}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <MetricCard
            label="Paid"
            value={formatUSD(stats.paidTotal)}
            footnote={`${stats.paidCount} invoices`}
          />
          <MetricCard
            label="Outstanding"
            value={formatUSD(stats.outstandingTotal)}
            footnote="Sent or overdue"
          />
          <MetricCard
            label="Overdue"
            value={String(stats.overdueCount)}
            footnote="Needs follow-up"
          />
          <MetricCard
            label="Total Invoices"
            value={String((invoices ?? []).length)}
            footnote="All time"
          />
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <InputGroup className="glass-panel filter-control sm:max-w-xs">
            <InputGroupAddon>
              <Receipt className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search by customer..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </InputGroup>

          <Select
            value={statusFilter}
            onValueChange={(value) => value && setStatusFilter(value)}
          >
            <SelectTrigger className="glass-panel filter-control h-8 gap-1.5 px-2.5 text-xs">
              <SelectValue>
                {(value: string) =>
                  value === ALL
                    ? "All Statuses"
                    : (invoiceStatusLabels[value as InvoiceStatus] ?? value)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value={ALL}>All Statuses</SelectItem>
              {(Object.keys(invoiceStatusLabels) as InvoiceStatus[]).map((status) => (
                <SelectItem key={status} value={status}>
                  {invoiceStatusLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        {invoices === null ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : filtered.length === 0 ? (
          <div className="glass-panel flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-foreground/[0.06] text-text-tertiary">
              <Receipt className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                No invoices found
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                {hasActiveFilters
                  ? "Try adjusting your search or filters."
                  : "Create an invoice from a won deal, or add one directly."}
              </p>
            </div>
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button size="sm" onClick={openAddForm}>
                <Receipt className="size-3.5" />
                Add Invoice
              </Button>
            )}
          </div>
        ) : (
          <InvoicesTable
            data={filtered}
            customers={customers}
            salespeople={salespeople}
            onEdit={openEditForm}
            onStatusChange={handleStatusChange}
          />
        )}
      </Reveal>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingInvoice ? "Edit Invoice" : "Add Invoice"}</DialogTitle>
            <DialogDescription>
              {editingInvoice
                ? "Update this invoice's details."
                : "Create a new invoice for a customer."}
            </DialogDescription>
          </DialogHeader>
          <InvoiceForm
            invoice={editingInvoice}
            customers={customers}
            salespeople={salespeople}
            deals={deals}
            currentUserId={profile?.id ?? ""}
            isAdmin={isAdmin}
            onSubmit={handleFormSubmit}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
