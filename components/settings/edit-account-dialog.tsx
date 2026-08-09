"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Profile, UserRole } from "@/components/providers/auth-provider";

const formSchema = z.object({
  fullName: z.string().min(2, "Enter a full name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  role: z.enum(["admin", "sales_rep"]),
  password: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 8, {
      message: "At least 8 characters, or leave blank to keep the current one",
    }),
  startDate: z.string().optional(),
  hasCar: z.boolean(),
});

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

export function EditAccountDialog({
  account,
  isSelf,
  open,
  onOpenChange,
  onSaved,
}: {
  account: Profile;
  isSelf: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    values: {
      fullName: account.full_name,
      email: account.email,
      phone: account.phone ?? "",
      role: account.role,
      password: "",
      startDate: account.start_date ?? "",
      hasCar: account.has_car ?? false,
    },
  });

  async function onSubmit(values: FormOutput) {
    const res = await fetch(`/api/admin/salespeople/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone || null,
        role: values.role,
        startDate: values.startDate || null,
        hasCar: values.hasCar,
        ...(values.password ? { password: values.password } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Couldn't save changes");
      return;
    }

    toast.success("Account updated");
    onOpenChange(false);
    await onSaved();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          reset();
          setShowPassword(false);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {account.full_name}</DialogTitle>
          <DialogDescription>
            Update their details, role, or reset their password.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-4 py-1 sm:grid-cols-2"
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="edit-acc-name">Full Name</Label>
            <Input id="edit-acc-name" {...register("fullName")} />
            {errors.fullName && (
              <p className="text-xs text-danger">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="edit-acc-email">Email</Label>
            <Input id="edit-acc-email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-danger">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="edit-acc-password">New Password</Label>
            <div className="relative">
              <Input
                id="edit-acc-password"
                type={showPassword ? "text" : "password"}
                placeholder="Leave blank to keep the current password"
                className="pr-8"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-2 flex items-center text-text-tertiary transition-colors hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-danger">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-acc-phone">Phone</Label>
            <Input id="edit-acc-phone" {...register("phone")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-acc-role">Role</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) =>
                    value && field.onChange(value as UserRole)
                  }
                  disabled={isSelf}
                >
                  <SelectTrigger id="edit-acc-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales_rep">
                      Sales Representative
                    </SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {isSelf && (
              <p className="text-xs text-text-tertiary">
                You can&apos;t change your own role.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-acc-start-date">Start Date</Label>
            <Input
              id="edit-acc-start-date"
              type="date"
              {...register("startDate")}
            />
          </div>

          <Controller
            control={control}
            name="hasCar"
            render={({ field }) => (
              <label className="flex items-center gap-2 self-end pb-1.5 text-sm text-text-secondary">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                Has access to a car
              </label>
            )}
          />

          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={isSubmitting}>
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
