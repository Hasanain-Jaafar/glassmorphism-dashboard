"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const targetFormSchema = z.object({
  monthlyTarget: z.coerce.number().min(0, "Must be 0 or more"),
  yearlyTarget: z.coerce.number().min(0, "Must be 0 or more"),
  monthlyAppointmentsTarget: z.coerce.number().min(0, "Must be 0 or more").optional(),
  yearlyAppointmentsTarget: z.coerce.number().min(0, "Must be 0 or more").optional(),
  monthlyDealsTarget: z.coerce.number().min(0, "Must be 0 or more").optional(),
  yearlyDealsTarget: z.coerce.number().min(0, "Must be 0 or more").optional(),
});

type FormInput = z.input<typeof targetFormSchema>;
type FormOutput = z.output<typeof targetFormSchema>;

export function EditTargetDialog({
  title,
  description,
  monthlyTarget,
  yearlyTarget,
  monthlyAppointmentsTarget,
  yearlyAppointmentsTarget,
  monthlyDealsTarget,
  yearlyDealsTarget,
  onSave,
  triggerLabel = "Edit",
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  title: string;
  description: string;
  monthlyTarget: number;
  yearlyTarget: number;
  /** Individual-only — omit all 4 to keep the Company tab's dialog revenue-only. */
  monthlyAppointmentsTarget?: number;
  yearlyAppointmentsTarget?: number;
  monthlyDealsTarget?: number;
  yearlyDealsTarget?: number;
  onSave: (values: FormOutput) => void | Promise<void>;
  triggerLabel?: string;
  /**
   * Externally controlled mode — when provided, no internal trigger button
   * is rendered; the caller owns open state (e.g. a click on a table row's
   * name cell) and this becomes a plain controlled Dialog.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isControlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? openProp : internalOpen;
  const setOpen = isControlled ? (onOpenChangeProp ?? (() => {})) : setInternalOpen;
  const hasActivityTargets = monthlyAppointmentsTarget !== undefined;

  const defaultValues = {
    monthlyTarget,
    yearlyTarget,
    monthlyAppointmentsTarget: monthlyAppointmentsTarget ?? 0,
    yearlyAppointmentsTarget: yearlyAppointmentsTarget ?? 0,
    monthlyDealsTarget: monthlyDealsTarget ?? 0,
    yearlyDealsTarget: yearlyDealsTarget ?? 0,
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(targetFormSchema),
    values: defaultValues,
  });

  async function onSubmit(values: FormOutput) {
    try {
      await onSave(values);
      setOpen(false);
      toast.success("Target updated");
    } catch {
      // onSave already surfaced its own error toast; keep the dialog open
      // so the user doesn't lose what they typed.
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset(defaultValues);
      }}
    >
      {!isControlled && (
        <DialogTrigger
          render={<Button variant="outline" size="sm" className="gap-1.5" />}
        >
          <Pencil className="size-3.5" />
          {triggerLabel}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2"
        >
          <div className="space-y-1.5">
            <Label htmlFor="target-monthly">Monthly Target</Label>
            <Input
              id="target-monthly"
              type="number"
              {...register("monthlyTarget")}
            />
            {errors.monthlyTarget && (
              <p className="text-xs text-danger">
                {errors.monthlyTarget.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="target-yearly">Yearly Target</Label>
            <Input
              id="target-yearly"
              type="number"
              {...register("yearlyTarget")}
            />
            {errors.yearlyTarget && (
              <p className="text-xs text-danger">
                {errors.yearlyTarget.message}
              </p>
            )}
          </div>

          {hasActivityTargets && (
            <>
              <div className="sm:col-span-2">
                <Separator />
                <p className="mt-4 text-xs font-medium tracking-wide text-text-tertiary uppercase">
                  Activity Targets
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="target-appointments-monthly">
                  Monthly Appointments Target
                </Label>
                <Input
                  id="target-appointments-monthly"
                  type="number"
                  {...register("monthlyAppointmentsTarget")}
                />
                {errors.monthlyAppointmentsTarget && (
                  <p className="text-xs text-danger">
                    {errors.monthlyAppointmentsTarget.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="target-appointments-yearly">
                  Yearly Appointments Target
                </Label>
                <Input
                  id="target-appointments-yearly"
                  type="number"
                  {...register("yearlyAppointmentsTarget")}
                />
                {errors.yearlyAppointmentsTarget && (
                  <p className="text-xs text-danger">
                    {errors.yearlyAppointmentsTarget.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="target-deals-monthly">
                  Monthly Deals Target
                </Label>
                <Input
                  id="target-deals-monthly"
                  type="number"
                  {...register("monthlyDealsTarget")}
                />
                {errors.monthlyDealsTarget && (
                  <p className="text-xs text-danger">
                    {errors.monthlyDealsTarget.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="target-deals-yearly">
                  Yearly Deals Target
                </Label>
                <Input
                  id="target-deals-yearly"
                  type="number"
                  {...register("yearlyDealsTarget")}
                />
                {errors.yearlyDealsTarget && (
                  <p className="text-xs text-danger">
                    {errors.yearlyDealsTarget.message}
                  </p>
                )}
              </div>
            </>
          )}

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
