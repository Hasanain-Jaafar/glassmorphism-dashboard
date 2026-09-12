"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  DialogClose,
} from "@/components/ui/dialog";
import type { TeamMember } from "@/lib/supabase/team";
import { LEAVE_TYPE_LABELS, type LeaveType, type LeaveStatus } from "@/lib/supabase/leave";
import { countWorkingDaysInclusive } from "@/lib/working-days";

const leaveRequestSchema = z
  .object({
    salespersonId: z.string().min(1, "Select a team member"),
    leaveType: z.enum(["vacation", "sick", "unpaid", "other"]),
    startDate: z.string().min(1, "Pick a start date"),
    endDate: z.string().min(1, "Pick an end date"),
    reason: z.string().trim().max(500, "Keep it under 500 characters"),
    approveImmediately: z.boolean(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "Must be on or after the start date",
    path: ["endDate"],
  });

type FormInput = z.input<typeof leaveRequestSchema>;
type FormOutput = z.output<typeof leaveRequestSchema>;

export type RequestLeaveValues = {
  salespersonId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
  status?: LeaveStatus;
};

function defaultValues(currentUserId: string): FormInput {
  return {
    salespersonId: currentUserId,
    leaveType: "vacation",
    startDate: "",
    endDate: "",
    reason: "",
    approveImmediately: false,
  };
}

export function RequestLeaveDialog({
  teamMembers,
  currentUserId,
  isAdmin,
  onSubmit,
}: {
  teamMembers: TeamMember[];
  currentUserId: string;
  isAdmin: boolean;
  onSubmit: (values: RequestLeaveValues) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: defaultValues(currentUserId),
  });

  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const daysPreview =
    startDate && endDate && endDate >= startDate
      ? countWorkingDaysInclusive(new Date(`${startDate}T00:00:00`), new Date(`${endDate}T00:00:00`))
      : null;

  async function submit(values: FormOutput) {
    try {
      await onSubmit({
        salespersonId: values.salespersonId,
        leaveType: values.leaveType,
        startDate: values.startDate,
        endDate: values.endDate,
        reason: values.reason || undefined,
        status: values.approveImmediately ? "approved" : "pending",
      });
      setOpen(false);
      toast.success(
        values.approveImmediately ? "Leave logged" : "Request submitted"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save that request");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset(defaultValues(currentUserId));
      }}
    >
      <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
        <Plus className="size-3.5" />
        {isAdmin ? "Log Time Off" : "Request Time Off"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isAdmin ? "Log Time Off" : "Request Time Off"}</DialogTitle>
          <DialogDescription>
            {isAdmin
              ? "Record leave for yourself or any team member."
              : "Submit a request — your manager will approve or reject it."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(submit)}
          className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2"
        >
          {isAdmin && (
            <Controller
              control={control}
              name="salespersonId"
              render={({ field }) => (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Team Member</Label>
                  <Select
                    value={field.value}
                    onValueChange={(value) => value && field.onChange(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(value: string) =>
                          teamMembers.find((p) => p.id === value)?.name ??
                          "Select a team member"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.salespersonId && (
                    <p className="text-xs text-danger">{errors.salespersonId.message}</p>
                  )}
                </div>
              )}
            />
          )}

          <Controller
            control={control}
            name="leaveType"
            render={({ field }) => (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Type</Label>
                <Select
                  value={field.value}
                  onValueChange={(value) => value && field.onChange(value as LeaveType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string) => LEAVE_TYPE_LABELS[value as LeaveType] ?? value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map((type) => (
                      <SelectItem key={type} value={type}>
                        {LEAVE_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          />

          <Controller
            control={control}
            name="startDate"
            render={({ field }) => (
              <div className="space-y-1.5">
                <Label htmlFor="leave-start-date">Start Date</Label>
                <DatePicker
                  id="leave-start-date"
                  value={field.value}
                  onChange={field.onChange}
                />
                {errors.startDate && (
                  <p className="text-xs text-danger">{errors.startDate.message}</p>
                )}
              </div>
            )}
          />

          <Controller
            control={control}
            name="endDate"
            render={({ field }) => (
              <div className="space-y-1.5">
                <Label htmlFor="leave-end-date">End Date</Label>
                <DatePicker
                  id="leave-end-date"
                  value={field.value}
                  onChange={field.onChange}
                  min={startDate || undefined}
                />
                {errors.endDate && (
                  <p className="text-xs text-danger">{errors.endDate.message}</p>
                )}
              </div>
            )}
          />

          {daysPreview !== null && (
            <p className="text-xs text-text-tertiary sm:col-span-2">
              {daysPreview} working day{daysPreview === 1 ? "" : "s"} (weekends excluded)
            </p>
          )}

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="leave-reason">Reason (optional)</Label>
            <Textarea id="leave-reason" rows={3} {...register("reason")} />
            {errors.reason && (
              <p className="text-xs text-danger">{errors.reason.message}</p>
            )}
          </div>

          {isAdmin && (
            <Controller
              control={control}
              name="approveImmediately"
              render={({ field }) => (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-glass-border/60 bg-foreground/[0.02] p-3 sm:col-span-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Mark as already approved
                    </p>
                    <p className="text-xs text-text-tertiary">
                      Use for leave that&apos;s already confirmed or already happened.
                    </p>
                  </div>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </div>
              )}
            />
          )}

          <DialogFooter className="sm:col-span-2">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isAdmin ? "Save" : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
