"use client";

import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import type { Appointment, AppointmentStatus } from "@/lib/supabase/appointments";
import type { Customer } from "@/lib/customers-data";
import type { TeamMember } from "@/lib/supabase/team";
import { cn } from "@/lib/utils";
import {
  appointmentStatusLabels,
  appointmentStatusStyles,
} from "@/components/appointments/appointment-styles";
import { InactiveCustomerBanner } from "@/components/customers/inactive-customer-banner";

// Working-hours slots, 30 minutes apart. The last slot is 3:30 PM, not
// 4:00 PM — 4:00 PM is the end of the business day, not a bookable start
// time.
const TIME_SLOTS = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
] as const;

function formatSlotLabel(slot: string): string {
  const [hours, minutes] = slot.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

const appointmentSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  salesRepId: z.string().min(1, "Select a sales rep"),
  title: z.string().trim().min(2, "Enter a title"),
  scheduledDate: z.string().min(1, "Pick a date"),
  // Deliberately a plain string, not z.enum(TIME_SLOTS) — the Select below
  // only ever offers working-hours slots, so every *new* pick is already
  // constrained. A plain string lets an existing appointment booked before
  // this constraint existed (or outside 8–4) keep displaying and saving its
  // original time instead of failing validation the moment the dialog opens.
  scheduledTime: z.string().min(1, "Pick a time"),
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]),
  notes: z.string().trim().max(2000, "Keep it under 2,000 characters"),
});

type FormInput = z.input<typeof appointmentSchema>;
type FormOutput = z.output<typeof appointmentSchema>;

export type AppointmentFormValues = {
  customerId: string;
  salesRepId: string;
  title: string;
  scheduledAt: string;
  status: AppointmentStatus;
  notes: string;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** "yyyy-MM-dd" for an <input type="date">. */
function toDateValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "HH:mm" (24h) matching the TIME_SLOTS format. */
function toTimeValue(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function combineDateTime(dateValue: string, timeValue: string): Date {
  return new Date(`${dateValue}T${timeValue}:00`);
}

const MIN_LEAD_TIME_MS = 60 * 60 * 1000;

function defaultsFor(
  appointment: Appointment | undefined,
  currentUserId: string,
  isAdmin: boolean,
  initialCustomerId?: string
): FormInput {
  const scheduled = appointment ? new Date(appointment.scheduledAt) : null;
  return {
    customerId: appointment?.customerId ?? initialCustomerId ?? "",
    salesRepId: appointment?.salesRepId ?? (isAdmin ? "" : currentUserId),
    title: appointment?.title ?? "",
    scheduledDate: scheduled ? toDateValue(scheduled) : "",
    scheduledTime: scheduled ? toTimeValue(scheduled) : "",
    status: appointment?.status ?? "scheduled",
    notes: appointment?.notes ?? "",
  };
}

export function AppointmentForm({
  appointment,
  customers,
  salespeople,
  currentUserId,
  isAdmin,
  initialCustomerId,
  onSubmit,
}: {
  appointment?: Appointment;
  customers: Customer[];
  salespeople: TeamMember[];
  currentUserId: string;
  isAdmin: boolean;
  initialCustomerId?: string;
  onSubmit: (values: AppointmentFormValues) => void | Promise<void>;
}) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(appointmentSchema),
    values: defaultsFor(appointment, currentUserId, isAdmin, initialCustomerId),
  });

  // Only enforced when scheduling a new appointment — editing an existing
  // one (e.g. correcting details, logging a walk-in as completed) shouldn't
  // retroactively reject a time that's already in the past. Computed once,
  // as of when this dialog opened (component mount), via a lazy initializer
  // rather than reading Date.now() during render.
  const [minScheduledAtDate] = useState<Date | null>(() =>
    appointment ? null : new Date(Date.now() + MIN_LEAD_TIME_MS)
  );
  const minDateValue = minScheduledAtDate ? toDateValue(minScheduledAtDate) : undefined;

  const watchedDate = watch("scheduledDate");
  const watchedTime = watch("scheduledTime");
  const watchedCustomerId = watch("customerId");

  // Only blocks *creating* a new appointment — editing/closing out one that
  // already exists against a customer who went inactive since shouldn't get
  // locked out too.
  const selectedCustomerInactive =
    customers.find((c) => c.id === watchedCustomerId)?.status === "inactive";
  const blockedByInactiveCustomer = !appointment && selectedCustomerInactive;

  // On the same day a new appointment is being booked, drop slots inside
  // the 1-hour lead time. Any other day (or when editing), every
  // working-hours slot is offered. If the current value isn't one of them
  // (a legacy time from before this constraint, or outside 8–4), it's kept
  // as an extra option so opening the dialog never silently blanks it.
  const timeOptions = useMemo(() => {
    let slots: string[] = [...TIME_SLOTS];
    if (minScheduledAtDate && watchedDate === toDateValue(minScheduledAtDate)) {
      slots = slots.filter(
        (slot) => combineDateTime(watchedDate, slot).getTime() >= minScheduledAtDate.getTime()
      );
    }
    if (watchedTime && !slots.includes(watchedTime)) {
      slots = [watchedTime, ...slots].sort();
    }
    return slots;
  }, [minScheduledAtDate, watchedDate, watchedTime]);

  // Completed is a terminal fact — the meeting definitively happened, so
  // nothing about that appointment's status is still up for debate. Locked
  // entirely rather than just excluded from the list, matching how a
  // quotation/deal locks once it has a child record.
  const isCompletedLocked = appointment?.status === "completed";

  // Cancelled/No Show already recorded that the meeting didn't happen —
  // that's historical fact too, so status can't jump straight to Completed
  // after the fact. Reclassifying between Cancelled <-> No Show, or moving
  // back to Scheduled to reschedule, are still fine — neither contradicts
  // "didn't happen (yet)". Based on the appointment's original status, not
  // the live form value, so an intermediate pick within the same dialog
  // session doesn't work around this either.
  const wasNeverAttended =
    appointment?.status === "cancelled" || appointment?.status === "no_show";
  const selectableStatuses = (
    Object.keys(appointmentStatusLabels) as AppointmentStatus[]
  ).filter((status) => !(wasNeverAttended && status === "completed"));

  async function submit(values: FormOutput) {
    const scheduled = combineDateTime(values.scheduledDate, values.scheduledTime);
    if (minScheduledAtDate && scheduled.getTime() < minScheduledAtDate.getTime()) {
      setError("scheduledTime", {
        message: "Must be at least 1 hour from now.",
      });
      return;
    }
    await onSubmit({
      customerId: values.customerId,
      salesRepId: values.salesRepId,
      title: values.title,
      status: values.status,
      notes: values.notes,
      scheduledAt: scheduled.toISOString(),
    });
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <Controller
        control={control}
        name="customerId"
        render={({ field }) => (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Customer</Label>
            <Select
              value={field.value}
              onValueChange={(value) => value && field.onChange(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) => {
                    const customer = customers.find((c) => c.id === value);
                    return customer ? customer.company : "Select a customer";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {customers.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs text-text-tertiary">
                    No customers yet
                  </p>
                ) : (
                  customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.company}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.customerId && (
              <p className="text-xs text-danger">{errors.customerId.message}</p>
            )}
            {selectedCustomerInactive && (
              <InactiveCustomerBanner blocksSubmit={blockedByInactiveCustomer} />
            )}
          </div>
        )}
      />

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="a-title">Title</Label>
        <Input
          id="a-title"
          placeholder="Site visit — new warehouse project"
          {...register("title")}
        />
        {errors.title && (
          <p className="text-xs text-danger">{errors.title.message}</p>
        )}
      </div>

      <Controller
        control={control}
        name="scheduledDate"
        render={({ field }) => (
          <div className="space-y-1.5">
            <Label htmlFor="a-scheduled-date">Date</Label>
            <DatePicker
              id="a-scheduled-date"
              value={field.value}
              onChange={field.onChange}
              min={minDateValue}
            />
            {errors.scheduledDate && (
              <p className="text-xs text-danger">{errors.scheduledDate.message}</p>
            )}
          </div>
        )}
      />

      <Controller
        control={control}
        name="scheduledTime"
        render={({ field }) => (
          <div className="space-y-1.5">
            <Label>Time</Label>
            <Select
              value={field.value}
              onValueChange={(value) => value && field.onChange(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) => (value ? formatSlotLabel(value) : "Pick a time")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {timeOptions.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs text-text-tertiary">
                    No slots left today — pick a different date.
                  </p>
                ) : (
                  timeOptions.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {formatSlotLabel(slot)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.scheduledTime ? (
              <p className="text-xs text-danger">{errors.scheduledTime.message}</p>
            ) : (
              <p className="text-xs text-text-tertiary">Working hours: 8:00 AM – 4:00 PM</p>
            )}
          </div>
        )}
      />

      <Controller
        control={control}
        name="status"
        render={({ field }) =>
          isCompletedLocked ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Status</Label>
              <span
                className={cn(
                  "flex h-8 w-fit items-center rounded-full px-2.5 text-xs font-medium",
                  appointmentStatusStyles.completed
                )}
              >
                {appointmentStatusLabels.completed}
              </span>
              <p className="text-xs text-text-tertiary">
                Locked — a completed appointment can&apos;t change status.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Status</Label>
              <Select
                value={field.value}
                onValueChange={(value) =>
                  value && field.onChange(value as AppointmentStatus)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string) =>
                      appointmentStatusLabels[value as AppointmentStatus] ?? value
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {selectableStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {appointmentStatusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {wasNeverAttended && (
                <p className="text-xs text-text-tertiary">
                  Recorded as {appointmentStatusLabels[appointment!.status]} — the
                  meeting never happened, so it can&apos;t become Completed.
                </p>
              )}
            </div>
          )
        }
      />

      {isAdmin && (
        <Controller
          control={control}
          name="salesRepId"
          render={({ field }) => (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Sales Rep</Label>
              <Select
                value={field.value}
                onValueChange={(value) => value && field.onChange(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string) =>
                      salespeople.find((p) => p.id === value)?.name ??
                      "Select a sales rep"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
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
              {errors.salesRepId && (
                <p className="text-xs text-danger">{errors.salesRepId.message}</p>
              )}
            </div>
          )}
        />
      )}

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="a-notes">Notes</Label>
        <Textarea id="a-notes" rows={3} {...register("notes")} />
        {errors.notes && (
          <p className="text-xs text-danger">{errors.notes.message}</p>
        )}
      </div>

      <DialogFooter className="sm:col-span-2">
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={isSubmitting || blockedByInactiveCustomer}>
          {appointment ? "Save Changes" : "Create Appointment"}
        </Button>
      </DialogFooter>
    </form>
  );
}
