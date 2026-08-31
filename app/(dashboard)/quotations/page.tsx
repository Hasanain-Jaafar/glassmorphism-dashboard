"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  FilePenLine,
  FilePlus2,
  FileText,
  Send,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Reveal } from "@/components/motion/reveal";
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
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { QuotationsTable } from "@/components/tables/quotations-table";
import {
  QuotationForm,
  type QuotationFormValues,
} from "@/components/quotations/quotation-form";
import { quotationStatusLabels } from "@/components/quotations/quotation-styles";
import { fetchTeamMembers, type TeamMember } from "@/lib/supabase/team";
import { fetchCustomers } from "@/lib/supabase/customers";
import { fetchAppointments, type Appointment } from "@/lib/supabase/appointments";
import { createDeal, fetchDeals, type Deal } from "@/lib/supabase/deals";
import { fetchProducts } from "@/lib/supabase/products";
import {
  fetchQuotations,
  createQuotation,
  updateQuotation,
  updateQuotationStatus,
  deleteQuotation,
  type Quotation,
  type QuotationStatus,
} from "@/lib/supabase/quotations";
import type { Customer } from "@/lib/customers-data";
import type { Product } from "@/lib/mock-data";
import { formatUSD } from "@/lib/format";

const ALL = "all";

export default function QuotationsPage() {
  return (
    <Suspense>
      <QuotationsPageContent />
    </Suspense>
  );
}

function QuotationsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [quotations, setQuotations] = useState<Quotation[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salespeople, setSalespeople] = useState<TeamMember[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);

  useEffect(() => {
    fetchQuotations()
      .then(setQuotations)
      .catch((err) => {
        toast.error(err.message ?? "Couldn't load quotations");
        setQuotations([]);
      });
    fetchCustomers()
      .then(setCustomers)
      .catch(() => {});
    fetchTeamMembers()
      .then((team) => setSalespeople(team.filter((m) => m.role === "sales_rep")))
      .catch(() => {});
    fetchAppointments()
      .then(setAppointments)
      .catch(() => {});
    fetchProducts()
      .then(setProducts)
      .catch(() => {});
    // Only needed to detect whether a quotation already has a deal, to lock
    // its status field in the edit form.
    fetchDeals()
      .then(setDeals)
      .catch(() => {});
  }, []);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);

  const [formOpen, setFormOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | undefined>();
  const [initialCustomerId, setInitialCustomerId] = useState<string | undefined>();

  const requestedCustomerId = searchParams.get("customer");
  const requestedNew = searchParams.get("new");
  const [handledDeepLink, setHandledDeepLink] = useState(false);
  if (!handledDeepLink && requestedNew === "1") {
    setHandledDeepLink(true);
    setEditingQuotation(undefined);
    setInitialCustomerId(requestedCustomerId ?? undefined);
    setFormOpen(true);
  }

  const customersById = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers]
  );

  const dealQuotationIds = useMemo(
    () => new Set(deals.map((d) => d.quotationId)),
    [deals]
  );

  const stats = useMemo(() => {
    const list = quotations ?? [];
    return {
      total: list.length,
      draft: list.filter((q) => q.status === "draft").length,
      sent: list.filter((q) => q.status === "sent").length,
      acceptedValue: list
        .filter((q) => q.status === "accepted")
        .reduce((sum, q) => sum + q.total, 0),
    };
  }, [quotations]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (quotations ?? []).filter((q) => {
      const customer = customersById.get(q.customerId ?? "");
      const matchesSearch = !query || customer?.company.toLowerCase().includes(query);
      const matchesStatus = statusFilter === ALL || q.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotations, search, statusFilter, customersById]);

  const hasActiveFilters = search.trim() !== "" || statusFilter !== ALL;

  function clearFilters() {
    setSearch("");
    setStatusFilter(ALL);
  }

  function openAddForm() {
    setEditingQuotation(undefined);
    setInitialCustomerId(undefined);
    setFormOpen(true);
  }

  const openEditForm = useCallback((quotation: Quotation) => {
    setEditingQuotation(quotation);
    setFormOpen(true);
  }, []);

  const [deleteTarget, setDeleteTarget] = useState<Quotation | undefined>();

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteQuotation(deleteTarget.id);
      setQuotations((prev) => (prev ?? []).filter((q) => q.id !== deleteTarget.id));
      toast.success("Quotation was deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't delete the quotation"
      );
    } finally {
      setDeleteTarget(undefined);
    }
  }

  async function handleFormSubmit(values: QuotationFormValues) {
    try {
      if (editingQuotation) {
        const updated = await updateQuotation(editingQuotation.id, values);
        setQuotations((prev) =>
          (prev ?? []).map((q) => (q.id === editingQuotation.id ? updated : q))
        );
        toast.success("Quotation was updated");
      } else {
        const created = await createQuotation(values);
        setQuotations((prev) => [created, ...(prev ?? [])]);
        toast.success("Quotation was created");
      }
      setFormOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't save the quotation"
      );
    }
  }

  const handleStatusChange = useCallback(
    async (quotation: Quotation, status: QuotationStatus) => {
      try {
        const updated = await updateQuotationStatus(quotation.id, status);
        setQuotations((prev) =>
          (prev ?? []).map((q) => (q.id === quotation.id ? updated : q))
        );
        toast.success(`Marked ${quotationStatusLabels[status].toLowerCase()}`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Couldn't update the quotation"
        );
      }
    },
    []
  );

  const handleConvertToDeal = useCallback(async (quotation: Quotation) => {
    try {
      await createDeal({
        quotationId: quotation.id,
        status: "open",
        amount: quotation.total,
      });
      toast.success(
        `Deal created for ${formatUSD(quotation.total)} — opening Deals…`
      );
      router.push("/deals");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't convert to a deal"
      );
    }
  }, [router]);

  return (
    <div className="space-y-6">
      <Reveal>
        <PageHeader
          title="Quotations"
          description="What we've quoted, and where it stands"
          actions={
            <Button onClick={openAddForm}>
              <FilePlus2 className="size-4" />
              Add Quotation
            </Button>
          }
        />
      </Reveal>

      <Reveal delay={0.05}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <MetricCard
            label="Total"
            value={String(stats.total)}
            footnote="All quotations"
            icon={FileText}
            tone="neutral"
          />
          <MetricCard
            label="Draft"
            value={String(stats.draft)}
            footnote="Not sent yet"
            icon={FilePenLine}
            tone="neutral"
          />
          <MetricCard
            label="Sent"
            value={String(stats.sent)}
            footnote="Awaiting response"
            icon={Send}
            tone="cyan"
          />
          <MetricCard
            label="Accepted Value"
            value={formatUSD(stats.acceptedValue)}
            footnote="Ready to convert"
            icon={CheckCircle2}
            tone="success"
          />
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <InputGroup className="glass-panel filter-control sm:max-w-xs">
            <InputGroupAddon>
              <FileText className="size-4" />
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
                    : (quotationStatusLabels[value as QuotationStatus] ?? value)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value={ALL}>All Statuses</SelectItem>
              {(Object.keys(quotationStatusLabels) as QuotationStatus[]).map(
                (status) => (
                  <SelectItem key={status} value={status}>
                    {quotationStatusLabels[status]}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        {quotations === null ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : filtered.length === 0 ? (
          <div className="glass-panel flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-foreground/[0.06] text-text-tertiary">
              <FileText className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                No quotations found
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                {hasActiveFilters
                  ? "Try adjusting your search or filters."
                  : "Create your first quotation to move a customer forward."}
              </p>
            </div>
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button size="sm" onClick={openAddForm}>
                <FilePlus2 className="size-3.5" />
                Add Quotation
              </Button>
            )}
          </div>
        ) : (
          <QuotationsTable
            data={filtered}
            customers={customers}
            salespeople={salespeople}
            dealQuotationIds={dealQuotationIds}
            onEdit={openEditForm}
            onStatusChange={handleStatusChange}
            onConvertToDeal={handleConvertToDeal}
            onDelete={setDeleteTarget}
          />
        )}
      </Reveal>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingQuotation ? "Edit Quotation" : "Add Quotation"}
            </DialogTitle>
            <DialogDescription>
              {editingQuotation
                ? "Update this quotation's details and line items."
                : "Build a new quotation for a customer."}
            </DialogDescription>
          </DialogHeader>
          <QuotationForm
            quotation={editingQuotation}
            customers={customers}
            salespeople={salespeople}
            appointments={appointments}
            deals={deals}
            products={products}
            initialCustomerId={initialCustomerId}
            onSubmit={handleFormSubmit}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(undefined)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete quotation?</DialogTitle>
            <DialogDescription>
              This quotation will be permanently deleted. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
