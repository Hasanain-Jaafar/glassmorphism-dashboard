import { createClient } from "@/lib/supabase/client";

export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export type Appointment = {
  id: string;
  salesRepId: string;
  customerId: string;
  title: string;
  /** ISO datetime */
  scheduledAt: string;
  status: AppointmentStatus;
  notes: string;
  createdAt: string;
};

type AppointmentRow = {
  id: string;
  sales_rep_id: string;
  customer_id: string;
  title: string;
  scheduled_at: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
};

const SELECT_COLUMNS =
  "id, sales_rep_id, customer_id, title, scheduled_at, status, notes, created_at";

function fromRow(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    salesRepId: row.sales_rep_id,
    customerId: row.customer_id,
    title: row.title,
    scheduledAt: row.scheduled_at,
    status: row.status,
    notes: row.notes ?? "",
    createdAt: row.created_at,
  };
}

export async function fetchAppointments(): Promise<Appointment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(SELECT_COLUMNS)
    .order("scheduled_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export type AppointmentInput = {
  salesRepId: string;
  customerId: string;
  title: string;
  scheduledAt: string;
  status: AppointmentStatus;
  notes: string;
};

function toRow(values: AppointmentInput) {
  return {
    sales_rep_id: values.salesRepId,
    customer_id: values.customerId,
    title: values.title,
    scheduled_at: values.scheduledAt,
    status: values.status,
    notes: values.notes,
  };
}

export async function createAppointment(
  values: AppointmentInput
): Promise<Appointment> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("appointments")
    .insert(toRow(values))
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateAppointment(
  id: string,
  values: AppointmentInput
): Promise<Appointment> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("appointments")
    .update(toRow(values))
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return fromRow(data);
}

/** Only succeeds while no quotation references this appointment (DB-enforced). */
export async function deleteAppointment(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "Can't delete — this appointment already has a quotation linked to it."
      );
    }
    throw error;
  }
}

export function computeAppointmentStats(appointments: Appointment[]) {
  const now = new Date();
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const total = appointments.length;
  const thisWeek = appointments.filter((a) => {
    const scheduled = new Date(a.scheduledAt);
    return (
      a.status === "scheduled" && scheduled >= now && scheduled <= weekFromNow
    );
  }).length;
  const completed = appointments.filter((a) => a.status === "completed").length;
  const cancelled = appointments.filter(
    (a) => a.status === "cancelled" || a.status === "no_show"
  ).length;

  return { total, thisWeek, completed, cancelled };
}
