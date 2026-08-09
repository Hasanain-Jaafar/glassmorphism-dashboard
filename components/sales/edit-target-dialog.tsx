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
});

type FormInput = z.input<typeof targetFormSchema>;
type FormOutput = z.output<typeof targetFormSchema>;

export function EditTargetDialog({
  title,
  description,
  monthlyTarget,
  yearlyTarget,
  onSave,
}: {
  title: string;
  description: string;
  monthlyTarget: number;
  yearlyTarget: number;
  onSave: (values: FormOutput) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(targetFormSchema),
    values: { monthlyTarget, yearlyTarget },
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
        if (!next) reset({ monthlyTarget, yearlyTarget });
      }}
    >
      <DialogTrigger
        render={<Button variant="outline" size="sm" className="gap-1.5" />}
      >
        <Pencil className="size-3.5" />
        Edit
      </DialogTrigger>
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
