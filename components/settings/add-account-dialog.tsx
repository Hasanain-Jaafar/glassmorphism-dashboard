"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Check, Copy, Dices, Eye, EyeOff, UserPlus } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import type { UserRole } from "@/components/providers/auth-provider";

const formSchema = z.object({
  fullName: z.string().min(2, "Enter a full name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
  phone: z.string().optional(),
  role: z.enum(["admin", "sales_rep"]),
  startDate: z.string().optional(),
  hasCar: z.boolean(),
});

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

const defaultValues: FormInput = {
  fullName: "",
  email: "",
  password: "",
  phone: "",
  role: "sales_rep",
  startDate: new Date().toISOString().slice(0, 10),
  hasCar: false,
};

function generatePassword() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  const bytes = new Uint32Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => chars[n % chars.length]).join("");
}

export function AddAccountDialog({
  onCreated,
}: {
  onCreated: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  function closeAndReset(next: boolean) {
    setOpen(next);
    if (!next) {
      reset(defaultValues);
      setCreated(null);
      setShowPassword(false);
      setCopied(false);
    }
  }

  async function onSubmit(values: FormOutput) {
    const res = await fetch("/api/admin/salespeople", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Couldn't create account");
      return;
    }

    setCreated({ email: values.email, password: values.password });
    await onCreated();
  }

  function copyCredentials() {
    if (!created) return;
    navigator.clipboard.writeText(
      `Email: ${created.email}\nPassword: ${created.password}`
    );
    setCopied(true);
    toast.success("Credentials copied");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={closeAndReset}>
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <UserPlus className="size-3.5" />
        Add Salesperson
      </DialogTrigger>
      <DialogContent>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Account Created</DialogTitle>
              <DialogDescription>
                Share these login details with {created.email} — this
                password won&apos;t be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 rounded-lg border border-glass-border bg-foreground/[0.03] p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-text-tertiary">Email</span>
                <span className="truncate font-medium text-foreground">
                  {created.email}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-text-tertiary">Password</span>
                <span className="truncate font-mono font-medium text-foreground">
                  {created.password}
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={copyCredentials}
                className="gap-1.5"
              >
                {copied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button onClick={() => closeAndReset(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add Salesperson</DialogTitle>
              <DialogDescription>
                Create a login for a new team member. They can sign in
                immediately with the email and password you set here.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="grid grid-cols-1 gap-4 py-1 sm:grid-cols-2"
            >
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="acc-name">Full Name</Label>
                <Input
                  id="acc-name"
                  placeholder="Anna Svensson"
                  {...register("fullName")}
                />
                {errors.fullName && (
                  <p className="text-xs text-danger">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="acc-email">Email</Label>
                <Input
                  id="acc-email"
                  type="email"
                  placeholder="name@company.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-danger">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="acc-password">Password</Label>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Input
                      id="acc-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 8 characters"
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
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Generate password"
                    onClick={() => {
                      setValue("password", generatePassword(), {
                        shouldValidate: true,
                      });
                      setShowPassword(true);
                    }}
                  >
                    <Dices className="size-3.5" />
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-xs text-danger">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="acc-phone">Phone (optional)</Label>
                <Input id="acc-phone" {...register("phone")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="acc-role">Role</Label>
                <Controller
                  control={control}
                  name="role"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) =>
                        value && field.onChange(value as UserRole)
                      }
                    >
                      <SelectTrigger id="acc-role">
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
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="acc-start-date">Start Date</Label>
                <Input id="acc-start-date" type="date" {...register("startDate")} />
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
                  Create Account
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
