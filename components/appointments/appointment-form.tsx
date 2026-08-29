"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
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
import { appointmentStatusLabels } from "@/components/appointments/appointment-styles";

const appointmentSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  salesRepId: z.string().min(1, "Select a sales rep"),
  title: z.string().trim().min(2, "Enter a title"),
  scheduledAt: z.string().min(1, "Pick a date and time"),
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]),
  notes: z.string().trim().max(2000, "Keep it under 2,000 characters"),
});

type FormInput = z.input<typeof appointmentSchema>;
type FormOutput = z.output<typeof appointmentSchema>;

export type AppointmentFormValues = FormOutput;

/** Converts a stored ISO datetime to the local value an <input type="datetime-local"> expects. */
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultsFor(
  appointment: Appointment | undefined,
  currentUserId: string,
  isAdmin: boolean,
  initialCustomerId?: string
): FormInput {
  return {
    customerId: appointment?.customerId ?? initialCustomerId ?? "",
    salesRepId: appointment?.salesRepId ?? (isAdmin ? "" : currentUserId),
    title: appointment?.title ?? "",
    scheduledAt: appointment ? toLocalInputValue(appointment.scheduledAt) : "",
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
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(appointmentSchema),
    values: defaultsFor(appointment, currentUserId, isAdmin, initialCustomerId),
  });

  async function submit(values: FormOutput) {
    await onSubmit({
      ...values,
      scheduledAt: new Date(values.scheduledAt).toISOString(),
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

      <div className="space-y-1.5">
        <Label htmlFor="a-scheduled">Scheduled At</Label>
        <Input id="a-scheduled" type="datetime-local" {...register("scheduledAt")} />
        {errors.scheduledAt && (
          <p className="text-xs text-danger">{errors.scheduledAt.message}</p>
        )}
      </div>

      <Controller
        control={control}
        name="status"
        render={({ field }) => (
          <div className="space-y-1.5">
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
        )}
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
        <Button type="submit" disabled={isSubmitting}>
          {appointment ? "Save Changes" : "Create Appointment"}
        </Button>
      </DialogFooter>
    </form>
  );
}
