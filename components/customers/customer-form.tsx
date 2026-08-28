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
import { salespeople } from "@/lib/mock-data";
import type { Customer, CustomerStatus } from "@/lib/customers-data";
import { customerStatusLabels } from "@/components/customers/customer-styles";

const customerSchema = z.object({
  company: z.string().trim().min(2, "Enter a company name"),
  contactPerson: z.string().trim().min(2, "Enter a contact person"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().min(5, "Enter a phone number"),
  address: z.string().trim().min(2, "Enter an address"),
  status: z.enum(["active", "prospect", "inactive"]),
  assignedSalespersonId: z.string().min(1, "Assign a salesperson"),
});

type FormInput = z.input<typeof customerSchema>;
type FormOutput = z.output<typeof customerSchema>;

export type CustomerFormValues = FormOutput;

function defaultsFor(customer?: Customer): FormInput {
  return {
    company: customer?.company ?? "",
    contactPerson: customer?.contactPerson ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    address: customer?.address ?? "",
    status: customer?.status ?? "prospect",
    assignedSalespersonId: customer?.assignedSalespersonId ?? salespeople[0].id,
  };
}

export function CustomerForm({
  customer,
  onSubmit,
}: {
  customer?: Customer;
  onSubmit: (values: CustomerFormValues) => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(customerSchema),
    defaultValues: defaultsFor(customer),
  });

  function submit(values: FormOutput) {
    onSubmit(values);
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="c-company">Customer / Company</Label>
        <Input
          id="c-company"
          placeholder="Al-Fahad Construction Co."
          {...register("company")}
        />
        {errors.company && (
          <p className="text-xs text-danger">{errors.company.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="c-contact">Contact Person</Label>
        <Input
          id="c-contact"
          placeholder="Yousef Al-Fahad"
          {...register("contactPerson")}
        />
        {errors.contactPerson && (
          <p className="text-xs text-danger">{errors.contactPerson.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="c-email">Email</Label>
        <Input
          id="c-email"
          type="email"
          placeholder="name@company.com"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-danger">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="c-phone">Phone</Label>
        <Input id="c-phone" placeholder="+966 50 123 4567" {...register("phone")} />
        {errors.phone && (
          <p className="text-xs text-danger">{errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="c-address">Address</Label>
        <Input
          id="c-address"
          placeholder="King Fahd Rd, Riyadh, Saudi Arabia"
          {...register("address")}
        />
        {errors.address && (
          <p className="text-xs text-danger">{errors.address.message}</p>
        )}
      </div>

      <Controller
        control={control}
        name="assignedSalespersonId"
        render={({ field }) => (
          <div className="space-y-1.5">
            <Label>Assigned Salesperson</Label>
            <Select
              value={field.value}
              onValueChange={(value) => value && field.onChange(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) =>
                    salespeople.find((p) => p.id === value)?.name ?? value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {salespeople.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
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
                value && field.onChange(value as CustomerStatus)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) =>
                    customerStatusLabels[value as CustomerStatus] ?? value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      />

      <DialogFooter className="sm:col-span-2">
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {customer ? "Save Changes" : "Add Customer"}
        </Button>
      </DialogFooter>
    </form>
  );
}
