"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Ban, Eye, EyeOff, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
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
import { AvatarCropDialog } from "@/components/settings/avatar-crop-dialog";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import type {
  EducationLevel,
  Profile,
  UserRole,
} from "@/components/providers/auth-provider";

const roleLabels: Record<UserRole, string> = {
  admin: "Administrator",
  sales_rep: "Sales Representative",
};

const educationLabels: Record<EducationLevel, string> = {
  primary_school: "Primary School",
  high_school: "High School",
  college: "College",
};

const UNSET_EDUCATION = "unset";
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

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
  education: z.enum(["primary_school", "high_school", "college", ""]).optional(),
});

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

export function EditAccountDialog({
  account,
  isSelf,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
}: {
  account: Profile;
  isSelf: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
  onDeleted: () => void | Promise<void>;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [isActive, setIsActive] = useState(account.is_active);
  const [togglingActive, setTogglingActive] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(
    null
  );
  const [cropOpen, setCropOpen] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(
    account.avatar_url
  );
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);

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
      education: account.education ?? "",
    },
  });

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setPendingPreviewUrl(URL.createObjectURL(file));
    setCropOpen(true);
  }

  function handleCropCancel() {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingPreviewUrl(null);
    setCropOpen(false);
  }

  async function handleCropSaved(url: string) {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingPreviewUrl(null);
    setCropOpen(false);

    const blob = await fetch(url).then((response) => response.blob());
    setAvatarPreviewUrl(url);
    setAvatarDataUrl(await blobToDataUrl(blob));
    setRemoveAvatar(false);
  }

  function handleRemoveAvatar() {
    setAvatarPreviewUrl(null);
    setAvatarDataUrl(null);
    setRemoveAvatar(true);
  }

  async function handleToggleActive() {
    setTogglingActive(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !isActive })
      .eq("id", account.id);
    setTogglingActive(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    setIsActive((v) => !v);
    toast.success(isActive ? "Access revoked" : "Access restored");
    await onSaved();
  }

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
        education: values.education || null,
        ...(values.password ? { password: values.password } : {}),
        ...(avatarDataUrl ? { avatarDataUrl } : {}),
        ...(removeAvatar ? { removeAvatar: true } : {}),
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
    <>
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
              Update their details, photo, role, or access.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid grid-cols-1 gap-4 py-1 sm:grid-cols-2"
          >
            <div className="flex items-center gap-4 sm:col-span-2">
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-lg font-semibold text-accent-foreground">
                {avatarPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreviewUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  initials(account.full_name)
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarPreviewUrl ? "Change Photo" : "Add Photo"}
                </Button>
                {avatarPreviewUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveAvatar}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>

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
                      <SelectValue>
                        {(value: UserRole) => roleLabels[value]}
                      </SelectValue>
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

            <div className="space-y-1.5">
              <Label htmlFor="edit-acc-education">Education</Label>
              <Controller
                control={control}
                name="education"
                render={({ field }) => (
                  <Select
                    value={field.value || UNSET_EDUCATION}
                    onValueChange={(value) =>
                      field.onChange(
                        value === UNSET_EDUCATION ? "" : (value as EducationLevel)
                      )
                    }
                  >
                    <SelectTrigger id="edit-acc-education" className="w-full">
                      <SelectValue>
                        {(value: string) =>
                          value === UNSET_EDUCATION
                            ? "Not set"
                            : educationLabels[value as EducationLevel]
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNSET_EDUCATION}>Not set</SelectItem>
                      <SelectItem value="primary_school">
                        Primary School
                      </SelectItem>
                      <SelectItem value="high_school">High School</SelectItem>
                      <SelectItem value="college">College</SelectItem>
                    </SelectContent>
                  </Select>
                )}
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

            <DialogFooter className="flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={isSelf || togglingActive}
                  onClick={handleToggleActive}
                >
                  {isActive ? (
                    <Ban className="size-3.5" />
                  ) : (
                    <RotateCcw className="size-3.5" />
                  )}
                  {isActive ? "Revoke Access" : "Restore Access"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-danger hover:bg-danger/10 hover:text-danger"
                  disabled={isSelf}
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  Save Changes
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AvatarCropDialog
        previewUrl={pendingPreviewUrl}
        open={cropOpen}
        onCancel={handleCropCancel}
        onCropped={handleCropSaved}
      />

      <DeleteAccountDialog
        account={account}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={async () => {
          onOpenChange(false);
          await onDeleted();
        }}
      />
    </>
  );
}
