"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  XCircle,
} from "lucide-react";
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
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AppointmentsTable } from "@/components/tables/appointments-table";
import {
  AppointmentForm,
  type AppointmentFormValues,
} from "@/components/appointments/appointment-form";
import { appointmentStatusLabels } from "@/components/appointments/appointment-styles";
import { fetchTeamMembers, type TeamMember } from "@/lib/supabase/team";
import { fetchCustomers } from "@/lib/supabase/customers";
import {
  fetchAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  computeAppointmentStats,
  type Appointment,
  type AppointmentStatus,
} from "@/lib/supabase/appointments";
import { fetchQuotations, type Quotation } from "@/lib/supabase/quotations";
import type { Customer } from "@/lib/customers-data";

const ALL = "all";

export default function AppointmentsPage() {
  return (
    <Suspense>
      <AppointmentsPageContent />
    </Suspense>
  );
}

function AppointmentsPageContent() {
  const { isAdmin, profile } = useAuth();
  const searchParams = useSearchParams();

  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salespeople, setSalespeople] = useState<TeamMember[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);

  useEffect(() => {
    fetchAppointments()
      .then(setAppointments)
      .catch((err) => {
        toast.error(err.message ?? "Couldn't load appointments");
        setAppointments([]);
      });
    fetchCustomers()
      .then(setCustomers)
      .catch(() => {
        // Customer picker just degrades to empty.
      });
    fetchTeamMembers()
      .then((team) => setSalespeople(team.filter((m) => m.role === "sales_rep")))
      .catch(() => {
        // Sales Rep picker just degrades to empty.
      });
    // Only needed to detect whether an appointment already has a quotation,
    // to know which rows are safe to delete.
    fetchQuotations()
      .then(setQuotations)
      .catch(() => {});
  }, []);

  const quotationAppointmentIds = useMemo(
    () => new Set(quotations.map((q) => q.appointmentId)),
    [quotations]
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);

  const [formOpen, setFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | undefined>();
  const [initialCustomerId, setInitialCustomerId] = useState<string | undefined>();

  // Deep link from a customer's "Create Appointment" quick action:
  // /appointments?customer=<id>&new=1 opens the Add dialog pre-filled.
  const requestedCustomerId = searchParams.get("customer");
  const requestedNew = searchParams.get("new");
  const [handledDeepLink, setHandledDeepLink] = useState(false);
  if (!handledDeepLink && requestedNew === "1") {
    setHandledDeepLink(true);
    setEditingAppointment(undefined);
    setInitialCustomerId(requestedCustomerId ?? undefined);
    setFormOpen(true);
  }

  // Deep link from a "New appointment" notification: /appointments?id=<id>
  // scrolls to and briefly flashes that row. Any active status filter could
  // otherwise hide it, so drop it the moment a new id link arrives.
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
    const el = document.getElementById(`appointment-${highlightedId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timeout = setTimeout(() => setFlashId(null), 2400);
    return () => clearTimeout(timeout);
  }, [highlightedId, appointments]);

  const stats = useMemo(
    () => computeAppointmentStats(appointments ?? []),
    [appointments]
  );

  const customersById = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (appointments ?? []).filter((a) => {
      const customer = customersById.get(a.customerId ?? "");
      const matchesSearch =
        !query ||
        a.title.toLowerCase().includes(query) ||
        customer?.company.toLowerCase().includes(query);
      const matchesStatus = statusFilter === ALL || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [appointments, search, statusFilter, customersById]);

  const hasActiveFilters = search.trim() !== "" || statusFilter !== ALL;

  function clearFilters() {
    setSearch("");
    setStatusFilter(ALL);
  }

  function openAddForm() {
    setEditingAppointment(undefined);
    setInitialCustomerId(undefined);
    setFormOpen(true);
  }

  const openEditForm = useCallback((appointment: Appointment) => {
    setEditingAppointment(appointment);
    setFormOpen(true);
  }, []);

  const [deleteTarget, setDeleteTarget] = useState<Appointment | undefined>();

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteAppointment(deleteTarget.id);
      setAppointments((prev) => (prev ?? []).filter((a) => a.id !== deleteTarget.id));
      toast.success(`${deleteTarget.title} was deleted`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't delete the appointment"
      );
    } finally {
      setDeleteTarget(undefined);
    }
  }

  async function handleFormSubmit(values: AppointmentFormValues) {
    try {
      if (editingAppointment) {
        const updated = await updateAppointment(editingAppointment.id, values);
        setAppointments((prev) =>
          (prev ?? []).map((a) => (a.id === editingAppointment.id ? updated : a))
        );
        toast.success(`${updated.title} was updated`);
      } else {
        const created = await createAppointment(values);
        setAppointments((prev) => [created, ...(prev ?? [])]);
        toast.success(`${created.title} was created`);
      }
      setFormOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't save the appointment"
      );
    }
  }

  return (
    <div className="space-y-6">
      <Reveal>
        <PageHeader
          title="Appointments"
          description="Who you're meeting, and when"
          actions={
            <Button onClick={openAddForm}>
              <CalendarPlus className="size-4" />
              Add Appointment
            </Button>
          }
        />
      </Reveal>

      <Reveal delay={0.05}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <MetricCard
            label="Total"
            value={String(stats.total)}
            footnote="All appointments"
            icon={CalendarDays}
            tone="neutral"
          />
          <MetricCard
            label="This Week"
            value={String(stats.thisWeek)}
            footnote="Scheduled, next 7 days"
            icon={CalendarClock}
            tone="primary"
          />
          <MetricCard
            label="Completed"
            value={String(stats.completed)}
            footnote="All time"
            icon={CheckCircle2}
            tone="success"
          />
          <MetricCard
            label="Cancelled / No Show"
            value={String(stats.cancelled)}
            footnote="All time"
            icon={XCircle}
            tone="danger"
          />
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <InputGroup className="glass-panel filter-control sm:max-w-xs">
            <InputGroupAddon>
              <CalendarClock className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search by title or customer..."
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
                    : (appointmentStatusLabels[value as AppointmentStatus] ?? value)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value={ALL}>All Statuses</SelectItem>
              {(Object.keys(appointmentStatusLabels) as AppointmentStatus[]).map(
                (status) => (
                  <SelectItem key={status} value={status}>
                    {appointmentStatusLabels[status]}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        {appointments === null ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : filtered.length === 0 ? (
          <div className="glass-panel flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-foreground/[0.06] text-text-tertiary">
              <CalendarClock className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                No appointments found
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                {hasActiveFilters
                  ? "Try adjusting your search or filters."
                  : "Schedule your first appointment to start the pipeline."}
              </p>
            </div>
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button size="sm" onClick={openAddForm}>
                <CalendarPlus className="size-3.5" />
                Add Appointment
              </Button>
            )}
          </div>
        ) : (
          <AppointmentsTable
            data={filtered}
            customers={customers}
            salespeople={salespeople}
            quotationAppointmentIds={quotationAppointmentIds}
            onEdit={openEditForm}
            onDelete={setDeleteTarget}
            highlightedId={flashId}
          />
        )}
      </Reveal>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAppointment ? "Edit Appointment" : "Add Appointment"}
            </DialogTitle>
            <DialogDescription>
              {editingAppointment
                ? "Update this appointment's details."
                : "Schedule a new appointment with a customer."}
            </DialogDescription>
          </DialogHeader>
          <AppointmentForm
            appointment={editingAppointment}
            customers={customers}
            salespeople={salespeople}
            currentUserId={profile?.id ?? ""}
            isAdmin={isAdmin}
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
            <DialogTitle>Delete appointment?</DialogTitle>
            <DialogDescription>
              {deleteTarget ? `"${deleteTarget.title}" ` : "This appointment "}
              will be permanently deleted. This can&apos;t be undone.
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
