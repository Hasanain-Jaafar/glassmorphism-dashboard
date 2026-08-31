"use client";

import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import type {
  Quotation,
  QuotationRejectionReason,
  QuotationStatus,
} from "@/lib/supabase/quotations";
import type { Appointment } from "@/lib/supabase/appointments";
import type { Deal } from "@/lib/supabase/deals";
import type { Customer } from "@/lib/customers-data";
import type { TeamMember } from "@/lib/supabase/team";
import type { Product } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  quotationRejectionReasonLabels,
  quotationStatusLabels,
  quotationStatusStyles,
} from "@/components/quotations/quotation-styles";
import { formatUSD } from "@/lib/format";

const quotationItemSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  quantity: z.coerce.number().int().min(1, "Must be at least 1"),
  unitPrice: z.coerce.number().min(0, "Must be 0 or more"),
});

const quotationSchema = z.object({
  appointmentId: z.string().min(1, "Select an appointment"),
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]),
  validUntil: z.string(),
  rejectionReason: z.string(),
  items: z.array(quotationItemSchema).min(1, "Add at least one line item"),
});

type FormInput = z.input<typeof quotationSchema>;
type FormOutput = z.output<typeof quotationSchema>;

export type QuotationFormValues = {
  appointmentId: string;
  status: QuotationStatus;
  validUntil: string | null;
  rejectionReason: QuotationRejectionReason | null;
  items: { productId: string | null; quantity: number; unitPrice: number }[];
};

function defaultsFor(
  quotation: Quotation | undefined,
  initialCustomerId: string | undefined,
  appointments: Appointment[]
): FormInput {
  const defaultAppointmentId =
    quotation?.appointmentId ??
    (initialCustomerId
      ? (appointments.find((a) => a.customerId === initialCustomerId)?.id ?? "")
      : "");
  return {
    appointmentId: defaultAppointmentId,
    status: quotation?.status ?? "draft",
    validUntil: quotation?.validUntil ?? "",
    rejectionReason: quotation?.rejectionReason ?? "",
    items: quotation?.items.length
      ? quotation.items.map((item) => ({
          productId: item.productId ?? "",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }))
      : [{ productId: "", quantity: 1, unitPrice: 0 }],
  };
}

export function QuotationForm({
  quotation,
  customers,
  salespeople,
  appointments,
  deals,
  products,
  initialCustomerId,
  onSubmit,
}: {
  quotation?: Quotation;
  customers: Customer[];
  salespeople: TeamMember[];
  appointments: Appointment[];
  /** Used only to detect whether this quotation already has a deal, locking its status. */
  deals: Deal[];
  products: Product[];
  initialCustomerId?: string;
  onSubmit: (values: QuotationFormValues) => void | Promise<void>;
}) {
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(quotationSchema),
    values: defaultsFor(quotation, initialCustomerId, appointments),
  });

  // "Today" floor is only enforced when creating a new quotation — an
  // existing one may legitimately already be expired. Computed once, as of
  // when this dialog opened, via a lazy initializer rather than reading
  // Date.now() during render.
  const [minCreateDate] = useState<string | null>(() =>
    quotation ? null : format(new Date(), "yyyy-MM-dd")
  );

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedAppointmentId = watch("appointmentId");
  const watchedStatus = watch("status");
  const watchedValidUntil = watch("validUntil");
  const watchedItems = watch("items");
  const total = watchedItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );

  const customersById = new Map(customers.map((c) => [c.id, c]));
  const salespeopleById = new Map(salespeople.map((p) => [p.id, p]));
  const selectedAppointment = appointments.find((a) => a.id === watchedAppointmentId);
  const selectedCustomer = selectedAppointment
    ? customersById.get(selectedAppointment.customerId)
    : undefined;
  const selectedRep = selectedAppointment
    ? salespeopleById.get(selectedAppointment.salesRepId)
    : undefined;
  const hasLinkedDeal = quotation
    ? deals.some((d) => d.quotationId === quotation.id)
    : false;

  // Unlike the "today" floor, this always applies (create and edit) — the
  // appointment's date is a fixed historical fact, not a moving target.
  const appointmentMinDate = selectedAppointment
    ? format(new Date(selectedAppointment.scheduledAt), "yyyy-MM-dd")
    : null;
  const dateFloors = [minCreateDate, appointmentMinDate].filter(
    (d): d is string => d !== null
  );
  const minValidUntil =
    dateFloors.length > 0 ? dateFloors.reduce((a, b) => (a > b ? a : b)) : null;

  async function submit(values: FormOutput) {
    if (values.validUntil) {
      if (appointmentMinDate && values.validUntil < appointmentMinDate) {
        setError("validUntil", {
          message: "Can't be before the appointment's date.",
        });
        return;
      }
      if (minCreateDate && values.validUntil < minCreateDate) {
        setError("validUntil", { message: "Can't be in the past." });
        return;
      }
    }
    if (values.status === "rejected" && !values.rejectionReason) {
      setError("rejectionReason", { message: "Select a reason" });
      return;
    }
    await onSubmit({
      ...values,
      validUntil: values.validUntil === "" ? null : values.validUntil,
      rejectionReason:
        values.status === "rejected"
          ? (values.rejectionReason as QuotationRejectionReason)
          : null,
      items: values.items.map((item) => ({
        productId: item.productId || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <Controller
        control={control}
        name="appointmentId"
        render={({ field }) =>
          hasLinkedDeal ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Appointment</Label>
              <p className="flex h-8 items-center rounded-lg border border-input bg-foreground/[0.02] px-2.5 text-sm text-foreground">
                {selectedAppointment
                  ? `${selectedCustomer?.company ?? "Unknown customer"} — ${selectedAppointment.title}`
                  : "—"}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Appointment</Label>
              <Select
                value={field.value}
                onValueChange={(value) => value && field.onChange(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string) => {
                      const appointment = appointments.find((a) => a.id === value);
                      if (!appointment) return "Select an appointment";
                      const customer = customersById.get(appointment.customerId);
                      return `${customer?.company ?? "Unknown customer"} — ${appointment.title}`;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {appointments.length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-text-tertiary">
                      No appointments yet — create one first.
                    </p>
                  ) : (
                    appointments.map((appointment) => (
                      <SelectItem key={appointment.id} value={appointment.id}>
                        {(customersById.get(appointment.customerId)?.company ??
                          "Unknown customer") + " — " + appointment.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.appointmentId && (
                <p className="text-xs text-danger">{errors.appointmentId.message}</p>
              )}
            </div>
          )
        }
      />

      <div className="space-y-1.5">
        <Label>Customer</Label>
        <p className="flex h-8 items-center rounded-lg border border-input bg-foreground/[0.02] px-2.5 text-sm text-foreground">
          {selectedCustomer?.company ?? "—"}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Sales Rep</Label>
        <p className="flex h-8 items-center rounded-lg border border-input bg-foreground/[0.02] px-2.5 text-sm text-foreground">
          {selectedRep?.name ?? "—"}
        </p>
      </div>

      <Controller
        control={control}
        name="status"
        render={({ field }) =>
          hasLinkedDeal ? (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <span
                className={cn(
                  "flex h-8 w-fit items-center rounded-full px-2.5 text-xs font-medium",
                  quotationStatusStyles[field.value as QuotationStatus]
                )}
              >
                {quotationStatusLabels[field.value as QuotationStatus]}
              </span>
              <p className="text-xs text-text-tertiary">
                Locked — this quotation already has a deal.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={field.value}
                onValueChange={(value) =>
                  value && field.onChange(value as QuotationStatus)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string) =>
                      quotationStatusLabels[value as QuotationStatus] ?? value
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
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
          )
        }
      />

      {watchedStatus === "rejected" && !hasLinkedDeal && (
        <Controller
          control={control}
          name="rejectionReason"
          render={({ field }) => (
            <div className="space-y-1.5">
              <Label>Rejection Reason</Label>
              <Select
                value={field.value}
                onValueChange={(value) => value && field.onChange(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string) =>
                      quotationRejectionReasonLabels[
                        value as QuotationRejectionReason
                      ] ?? "Select a reason"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(
                      quotationRejectionReasonLabels
                    ) as QuotationRejectionReason[]
                  ).map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {quotationRejectionReasonLabels[reason]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.rejectionReason && (
                <p className="text-xs text-danger">
                  {errors.rejectionReason.message}
                </p>
              )}
            </div>
          )}
        />
      )}

      {hasLinkedDeal ? (
        <div className="space-y-1.5">
          <Label>Valid Until</Label>
          <p className="flex h-8 items-center rounded-lg border border-input bg-foreground/[0.02] px-2.5 text-sm text-foreground">
            {watchedValidUntil
              ? format(new Date(watchedValidUntil), "MMM d, yyyy")
              : "No expiration"}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="q-valid-until">Valid Until (optional)</Label>
          <Controller
            control={control}
            name="validUntil"
            render={({ field }) => (
              <Input
                id="q-valid-until"
                type="date"
                min={minValidUntil ?? undefined}
                {...field}
              />
            )}
          />
          {errors.validUntil ? (
            <p className="text-xs text-danger">{errors.validUntil.message}</p>
          ) : (
            appointmentMinDate && (
              <p className="text-xs text-text-tertiary">
                Can&apos;t be before the appointment&apos;s date ({appointmentMinDate}).
              </p>
            )
          )}
        </div>
      )}

      <div className="space-y-2 sm:col-span-2">
        <div className="flex items-center justify-between">
          <Label>Line Items</Label>
          {!hasLinkedDeal && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ productId: "", quantity: 1, unitPrice: 0 })}
            >
              <Plus className="size-3.5" />
              Add Item
            </Button>
          )}
        </div>

        {hasLinkedDeal ? (
          <div className="space-y-2">
            {watchedItems.map((item, index) => {
              const product = products.find((p) => p.id === item.productId);
              return (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-xl border border-glass-border/60 bg-foreground/[0.02] p-2.5 text-sm"
                >
                  <span className="text-foreground">
                    {product?.name ?? "Unknown product"}
                  </span>
                  <span className="tabular-nums text-text-secondary">
                    {Number(item.quantity)} × {formatUSD(Number(item.unitPrice))}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-[1fr_72px_96px_auto] items-start gap-2 rounded-xl border border-glass-border/60 bg-foreground/[0.02] p-2.5"
                >
                  <Controller
                    control={control}
                    name={`items.${index}.productId`}
                    render={({ field: productField }) => (
                      <Select
                        value={productField.value}
                        onValueChange={(value) => {
                          if (!value) return;
                          productField.onChange(value);
                          const product = products.find((p) => p.id === value);
                          if (product) {
                            setValue(`items.${index}.unitPrice`, product.price);
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {(value: string) =>
                              products.find((p) => p.id === value)?.name ??
                              "Select a product"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />

                  <Input
                    type="number"
                    min={1}
                    placeholder="Qty"
                    {...register(`items.${index}.quantity`)}
                  />

                  <Input
                    type="number"
                    min={0}
                    placeholder="Price"
                    {...register(`items.${index}.unitPrice`)}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove item"
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            {errors.items && !Array.isArray(errors.items) && (
              <p className="text-xs text-danger">{errors.items.message}</p>
            )}
            {Array.isArray(errors.items) && errors.items.some(Boolean) && (
              <p className="text-xs text-danger">
                One or more line items are incomplete — check the product and
                quantity above.
              </p>
            )}
          </>
        )}

        <div className="flex justify-end border-t border-glass-border pt-2">
          <p className="text-sm">
            <span className="text-text-tertiary">Total: </span>
            <span className="font-semibold text-foreground">{formatUSD(total)}</span>
          </p>
        </div>
      </div>

      <DialogFooter className="sm:col-span-2">
        <DialogClose render={<Button type="button" variant="outline" />}>
          {hasLinkedDeal ? "Close" : "Cancel"}
        </DialogClose>
        {!hasLinkedDeal && (
          <Button type="submit" disabled={isSubmitting}>
            {quotation ? "Save Changes" : "Create Quotation"}
          </Button>
        )}
      </DialogFooter>
    </form>
  );
}
