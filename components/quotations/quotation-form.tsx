"use client";

import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import type { Quotation, QuotationStatus } from "@/lib/supabase/quotations";
import type { Appointment } from "@/lib/supabase/appointments";
import type { Customer } from "@/lib/customers-data";
import type { TeamMember } from "@/lib/supabase/team";
import type { Product } from "@/lib/mock-data";
import { quotationStatusLabels } from "@/components/quotations/quotation-styles";
import { formatUSD } from "@/lib/format";

const NONE = "none";

const quotationItemSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  quantity: z.coerce.number().int().min(1, "Must be at least 1"),
  unitPrice: z.coerce.number().min(0, "Must be 0 or more"),
});

const quotationSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  salesRepId: z.string().min(1, "Select a sales rep"),
  appointmentId: z.string(),
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]),
  validUntil: z.string(),
  items: z.array(quotationItemSchema).min(1, "Add at least one line item"),
});

type FormInput = z.input<typeof quotationSchema>;
type FormOutput = z.output<typeof quotationSchema>;

export type QuotationFormValues = {
  customerId: string;
  salesRepId: string;
  appointmentId: string | null;
  status: QuotationStatus;
  validUntil: string | null;
  items: { productId: string | null; quantity: number; unitPrice: number }[];
};

function defaultsFor(
  quotation: Quotation | undefined,
  currentUserId: string,
  isAdmin: boolean,
  initialCustomerId?: string
): FormInput {
  return {
    customerId: quotation?.customerId ?? initialCustomerId ?? "",
    salesRepId: quotation?.salesRepId ?? (isAdmin ? "" : currentUserId),
    appointmentId: quotation?.appointmentId ?? NONE,
    status: quotation?.status ?? "draft",
    validUntil: quotation?.validUntil ?? "",
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
  products,
  currentUserId,
  isAdmin,
  initialCustomerId,
  onSubmit,
}: {
  quotation?: Quotation;
  customers: Customer[];
  salespeople: TeamMember[];
  appointments: Appointment[];
  products: Product[];
  currentUserId: string;
  isAdmin: boolean;
  initialCustomerId?: string;
  onSubmit: (values: QuotationFormValues) => void | Promise<void>;
}) {
  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(quotationSchema),
    values: defaultsFor(quotation, currentUserId, isAdmin, initialCustomerId),
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedCustomerId = watch("customerId");
  const watchedItems = watch("items");
  const total = watchedItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );

  const customerAppointments = appointments.filter(
    (a) => a.customerId === watchedCustomerId
  );

  async function submit(values: FormOutput) {
    await onSubmit({
      ...values,
      appointmentId: values.appointmentId === NONE ? null : values.appointmentId,
      validUntil: values.validUntil === "" ? null : values.validUntil,
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
        name="customerId"
        render={({ field }) => (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Customer</Label>
            <Select
              value={field.value}
              onValueChange={(value) => {
                if (!value) return;
                field.onChange(value);
                setValue("appointmentId", NONE);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) =>
                    customers.find((c) => c.id === value)?.company ??
                    "Select a customer"
                  }
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

      <Controller
        control={control}
        name="appointmentId"
        render={({ field }) => (
          <div className="space-y-1.5">
            <Label>Appointment (optional)</Label>
            <Select
              value={field.value}
              onValueChange={(value) => value && field.onChange(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) =>
                    value === NONE
                      ? "None"
                      : (customerAppointments.find((a) => a.id === value)?.title ??
                        "None")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {customerAppointments.map((appointment) => (
                  <SelectItem key={appointment.id} value={appointment.id}>
                    {appointment.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      />

      <Controller
        control={control}
        name="status"
        render={({ field }) => (
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
        )}
      />

      {isAdmin && (
        <Controller
          control={control}
          name="salesRepId"
          render={({ field }) => (
            <div className="space-y-1.5">
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

      <div className="space-y-1.5">
        <Label htmlFor="q-valid-until">Valid Until (optional)</Label>
        <Controller
          control={control}
          name="validUntil"
          render={({ field }) => (
            <Input id="q-valid-until" type="date" {...field} />
          )}
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <div className="flex items-center justify-between">
          <Label>Line Items</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ productId: "", quantity: 1, unitPrice: 0 })}
          >
            <Plus className="size-3.5" />
            Add Item
          </Button>
        </div>

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

        <div className="flex justify-end border-t border-glass-border pt-2">
          <p className="text-sm">
            <span className="text-text-tertiary">Total: </span>
            <span className="font-semibold text-foreground">{formatUSD(total)}</span>
          </p>
        </div>
      </div>

      <DialogFooter className="sm:col-span-2">
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {quotation ? "Save Changes" : "Create Quotation"}
        </Button>
      </DialogFooter>
    </form>
  );
}
