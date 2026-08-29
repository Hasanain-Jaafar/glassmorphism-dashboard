"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Handshake, HandshakeIcon } from "lucide-react";
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
import { DealsTable } from "@/components/tables/deals-table";
import { DealForm, type DealFormValues } from "@/components/deals/deal-form";
import { dealStatusLabels } from "@/components/deals/deal-styles";
import { fetchTeamMembers, type TeamMember } from "@/lib/supabase/team";
import { fetchCustomers } from "@/lib/supabase/customers";
import { fetchQuotations, type Quotation } from "@/lib/supabase/quotations";
import { createInvoice } from "@/lib/supabase/invoices";
import {
  fetchDeals,
  createDeal,
  updateDeal,
  updateDealStatus,
  type Deal,
  type DealStatus,
} from "@/lib/supabase/deals";
import type { Customer } from "@/lib/customers-data";
import { formatUSD } from "@/lib/format";

const ALL = "all";

export default function DealsPage() {
  return (
    <Suspense>
      <DealsPageContent />
    </Suspense>
  );
}

function DealsPageContent() {
  const { isAdmin, profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salespeople, setSalespeople] = useState<TeamMember[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);

  useEffect(() => {
    fetchDeals()
      .then(setDeals)
      .catch((err) => {
        toast.error(err.message ?? "Couldn't load deals");
        setDeals([]);
      });
    fetchCustomers()
      .then(setCustomers)
      .catch(() => {});
    fetchTeamMembers()
      .then((team) => setSalespeople(team.filter((m) => m.role === "sales_rep")))
      .catch(() => {});
    fetchQuotations()
      .then(setQuotations)
      .catch(() => {});
  }, []);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);

  const [formOpen, setFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | undefined>();

  // Deep link from a "Deal won" notification: /deals?id=<id> scrolls to and
  // briefly flashes that row. Any active status filter could otherwise hide
  // it, so drop it the moment a new id link arrives.
  const highlightedId = searchParams.get("id");
  const [flashId, setFlashId] = useState<string | null>(null);
  const [prevHighlightedId, setPrevHighlightedId] = useState(highlightedId);
  if (highlightedId !== prevHighlightedId) {
    setPrevHighlightedId(highlightedId);
    if (highlightedId) {
      setStatusFilter(ALL);
      setSearch("");
      setFlashId(highlightedId);
    }
  }

  useEffect(() => {
    if (!highlightedId) return;
    const el = document.getElementById(`deal-${highlightedId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timeout = setTimeout(() => setFlashId(null), 2400);
    return () => clearTimeout(timeout);
  }, [highlightedId, deals]);

  const customersById = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers]
  );

  const stats = useMemo(() => {
    const list = deals ?? [];
    const open = list.filter((d) => d.status === "open");
    const won = list.filter((d) => d.status === "won");
    const lost = list.filter((d) => d.status === "lost");
    const closed = won.length + lost.length;
    return {
      openValue: open.reduce((sum, d) => sum + d.amount, 0),
      wonValue: won.reduce((sum, d) => sum + d.amount, 0),
      wonCount: won.length,
      winRate: closed ? Math.round((won.length / closed) * 100) : 0,
    };
  }, [deals]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (deals ?? []).filter((d) => {
      const customer = customersById.get(d.customerId ?? "");
      const matchesSearch = !query || customer?.company.toLowerCase().includes(query);
      const matchesStatus = statusFilter === ALL || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [deals, search, statusFilter, customersById]);

  const hasActiveFilters = search.trim() !== "" || statusFilter !== ALL;

  function clearFilters() {
    setSearch("");
    setStatusFilter(ALL);
  }

  function openAddForm() {
    setEditingDeal(undefined);
    setFormOpen(true);
  }

  function openEditForm(deal: Deal) {
    setEditingDeal(deal);
    setFormOpen(true);
  }

  async function handleFormSubmit(values: DealFormValues) {
    try {
      if (editingDeal) {
        const updated = await updateDeal(editingDeal.id, values);
        setDeals((prev) =>
          (prev ?? []).map((d) => (d.id === editingDeal.id ? updated : d))
        );
        toast.success("Deal was updated");
      } else {
        const created = await createDeal(values);
        setDeals((prev) => [created, ...(prev ?? [])]);
        toast.success("Deal was created");
      }
      setFormOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save the deal");
    }
  }

  async function handleStatusChange(deal: Deal, status: DealStatus) {
    try {
      const updated = await updateDealStatus(deal.id, status);
      setDeals((prev) => (prev ?? []).map((d) => (d.id === deal.id ? updated : d)));
      toast.success(`Marked ${dealStatusLabels[status].toLowerCase()}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update the deal");
    }
  }

  async function handleCreateInvoice(deal: Deal) {
    try {
      await createInvoice({
        salesRepId: deal.salesRepId,
        customerId: deal.customerId,
        dealId: deal.id,
        status: "draft",
        amount: deal.amount,
        dueDate: null,
      });
      toast.success(`Invoice created for ${formatUSD(deal.amount)} — opening Invoices…`);
      router.push("/invoices");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't create the invoice"
      );
    }
  }

  return (
    <div className="space-y-6">
      <Reveal>
        <PageHeader
          title="Deals"
          description="What's open, what's won, and what's lost"
          actions={
            <Button onClick={openAddForm}>
              <Handshake className="size-4" />
              Add Deal
            </Button>
          }
        />
      </Reveal>

      <Reveal delay={0.05}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <MetricCard
            label="Open Value"
            value={formatUSD(stats.openValue)}
            footnote="Still in play"
          />
          <MetricCard
            label="Won Value"
            value={formatUSD(stats.wonValue)}
            footnote={`${stats.wonCount} deals`}
          />
          <MetricCard
            label="Win Rate"
            value={`${stats.winRate}%`}
            footnote="Of closed deals"
          />
          <MetricCard
            label="Won Deals"
            value={String(stats.wonCount)}
            footnote="All time"
          />
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <InputGroup className="glass-panel sm:max-w-xs">
            <InputGroupAddon>
              <HandshakeIcon className="size-4" />
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
            <SelectTrigger className="glass-panel h-8 gap-1.5 rounded-lg px-2.5 text-xs">
              <SelectValue>
                {(value: string) =>
                  value === ALL
                    ? "All Statuses"
                    : (dealStatusLabels[value as DealStatus] ?? value)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value={ALL}>All Statuses</SelectItem>
              {(Object.keys(dealStatusLabels) as DealStatus[]).map((status) => (
                <SelectItem key={status} value={status}>
                  {dealStatusLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        {deals === null ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : filtered.length === 0 ? (
          <div className="glass-panel flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-foreground/[0.06] text-text-tertiary">
              <HandshakeIcon className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">No deals found</p>
              <p className="mt-1 text-xs text-text-tertiary">
                {hasActiveFilters
                  ? "Try adjusting your search or filters."
                  : "Convert an accepted quotation, or add a deal directly."}
              </p>
            </div>
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button size="sm" onClick={openAddForm}>
                <Handshake className="size-3.5" />
                Add Deal
              </Button>
            )}
          </div>
        ) : (
          <DealsTable
            data={filtered}
            customers={customers}
            salespeople={salespeople}
            onEdit={openEditForm}
            onStatusChange={handleStatusChange}
            onCreateInvoice={handleCreateInvoice}
            highlightedId={flashId}
          />
        )}
      </Reveal>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDeal ? "Edit Deal" : "Add Deal"}</DialogTitle>
            <DialogDescription>
              {editingDeal
                ? "Update this deal's details."
                : "Create a new deal for a customer."}
            </DialogDescription>
          </DialogHeader>
          <DealForm
            deal={editingDeal}
            customers={customers}
            salespeople={salespeople}
            quotations={quotations}
            currentUserId={profile?.id ?? ""}
            isAdmin={isAdmin}
            onSubmit={handleFormSubmit}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
