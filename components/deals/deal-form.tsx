"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import type { Deal, DealStatus } from "@/lib/supabase/deals";
import type { Quotation } from "@/lib/supabase/quotations";
import type { Customer } from "@/lib/customers-data";
import type { TeamMember } from "@/lib/supabase/team";
import { dealStatusLabels } from "@/components/deals/deal-styles";

const NONE = "none";

const dealSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  salesRepId: z.string().min(1, "Select a sales rep"),
  quotationId: z.string(),
  status: z.enum(["open", "won", "lost"]),
  amount: z.coerce.number().min(0, "Must be 0 or more"),
});

type FormInput = z.input<typeof dealSchema>;
type FormOutput = z.output<typeof dealSchema>;

export type DealFormValues = {
  customerId: string;
  salesRepId: string;
  quotationId: string | null;
  status: DealStatus;
  amount: number;
};

function defaultsFor(
  deal: Deal | undefined,
  currentUserId: string,
  isAdmin: boolean,
  prefill?: { customerId?: string; quotationId?: string; amount?: number }
): FormInput {
  return {
    customerId: deal?.customerId ?? prefill?.customerId ?? "",
    salesRepId: deal?.salesRepId ?? (isAdmin ? "" : currentUserId),
    quotationId: deal?.quotationId ?? prefill?.quotationId ?? NONE,
    status: deal?.status ?? "open",
    amount: deal?.amount ?? prefill?.amount ?? 0,
  };
}

export function DealForm({
  deal,
  customers,
  salespeople,
  quotations,
  currentUserId,
  isAdmin,
  prefill,
  onSubmit,
}: {
  deal?: Deal;
  customers: Customer[];
  salespeople: TeamMember[];
  quotations: Quotation[];
  currentUserId: string;
  isAdmin: boolean;
  prefill?: { customerId?: string; quotationId?: string; amount?: number };
  onSubmit: (values: DealFormValues) => void | Promise<void>;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(dealSchema),
    values: defaultsFor(deal, currentUserId, isAdmin, prefill),
  });

  async function submit(values: FormOutput) {
    await onSubmit({
      ...values,
      quotationId: values.quotationId === NONE ? null : values.quotationId,
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
        name="quotationId"
        render={({ field }) => (
          <div className="space-y-1.5">
            <Label>Quotation (optional)</Label>
            <Select
              value={field.value}
              onValueChange={(value) => value && field.onChange(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) => (value === NONE ? "None" : "Linked quotation")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {quotations.map((quotation) => (
                  <SelectItem key={quotation.id} value={quotation.id}>
                    {customers.find((c) => c.id === quotation.customerId)?.company ??
                      "Quotation"}{" "}
                    · {quotation.total}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      />

      <div className="space-y-1.5">
        <Label htmlFor="d-amount">Amount</Label>
        <Input id="d-amount" type="number" min={0} {...register("amount")} />
        {errors.amount && (
          <p className="text-xs text-danger">{errors.amount.message}</p>
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
              onValueChange={(value) => value && field.onChange(value as DealStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) => dealStatusLabels[value as DealStatus] ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(dealStatusLabels) as DealStatus[]).map((status) => (
                  <SelectItem key={status} value={status}>
                    {dealStatusLabels[status]}
                  </SelectItem>
                ))}
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

      <DialogFooter className="sm:col-span-2">
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {deal ? "Save Changes" : "Create Deal"}
        </Button>
      </DialogFooter>
    </form>
  );
}
