"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { AvatarCropDialog } from "@/components/settings/avatar-crop-dialog";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

const formSchema = z
  .object({
    name: z.string().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid email"),
    phone: z
      .string()
      .optional()
      .refine((value) => !value || /^[0-9+()\-.\s]{7,20}$/.test(value), {
        message: "Enter a valid phone number",
      }),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (values) => !values.newPassword || values.newPassword.length >= 8,
    { message: "Must be at least 8 characters", path: ["newPassword"] }
  )
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((values) => !values.newPassword || values.currentPassword, {
    message: "Enter your current password",
    path: ["currentPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

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

export function ProfileSection() {
  const { user, profile, loading, isAdmin: admin, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(
    null
  );
  const [cropOpen, setCropOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: {
      name: profile?.full_name ?? "",
      email: profile?.email ?? "",
      phone: profile?.phone ?? "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: FormValues) {
    const supabase = createClient();

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: values.name, phone: values.phone || null })
      .eq("id", user!.id);

    if (profileError) {
      toast.error(profileError.message);
      return;
    }

    if (values.email !== profile?.email) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: values.email,
      });
      if (emailError) {
        toast.error(emailError.message);
        return;
      }
      toast.success("Check your new email address to confirm the change");
    }

    if (values.newPassword) {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: profile!.email,
        password: values.currentPassword!,
      });
      if (reauthError) {
        toast.error("Current password is incorrect");
        return;
      }
      const { error: passwordError } = await supabase.auth.updateUser({
        password: values.newPassword,
      });
      if (passwordError) {
        toast.error(passwordError.message);
        return;
      }
    }

    await refreshProfile();
    reset({
      ...values,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    toast.success("Profile updated");
  }

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

    if (!user) return;
    setUploadingAvatar(true);

    try {
      const blob = await fetch(url).then((response) => response.blob());
      URL.revokeObjectURL(url);

      const supabase = createClient();
      const path = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });

      if (uploadError) {
        toast.error(uploadError.message);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-bust so the new photo shows immediately everywhere it's used.
      const versionedUrl = `${publicUrl}?v=${Date.now()}`;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: versionedUrl })
        .eq("id", user.id);

      if (profileError) {
        toast.error(profileError.message);
        return;
      }

      await refreshProfile();
      toast.success("Profile photo updated");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!user) return;
    const supabase = createClient();

    await supabase.storage.from("avatars").remove([`${user.id}/avatar.jpg`]);

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", user.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    await refreshProfile();
    toast.success("Profile photo removed");
  }

  if (loading || !profile) {
    return (
      <div className="glass-panel rounded-2xl p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="group relative shrink-0">
            <div className="flex size-14 items-center justify-center overflow-hidden rounded-full bg-accent text-lg font-semibold text-accent-foreground">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                initials(profile.full_name)
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Change profile photo"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Camera className="size-4" />
            </button>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {profile.full_name}
            </p>
            <p className="mt-0.5 text-xs text-text-tertiary">
              {admin ? "Administrator" : "Sales Representative"}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadingAvatar ? "Uploading…" : "Change Photo"}
            </Button>
            {profile.avatar_url && (
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
        <p className="mt-2 text-xs text-text-tertiary">
          JPG, PNG or GIF. Max 5MB.
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div className="space-y-1.5">
            <Label htmlFor="s-name">Full Name</Label>
            <Input id="s-name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-danger">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-email">Email</Label>
            <Input id="s-email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-danger">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s-phone">Phone Number</Label>
            <Input
              id="s-phone"
              type="tel"
              placeholder="+1 (555) 012-3456"
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-xs text-danger">{errors.phone.message}</p>
            )}
          </div>
          <div className="hidden sm:block" />

          <div className="sm:col-span-2">
            <Separator />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="s-current-password">Current Password</Label>
            <Input
              id="s-current-password"
              type="password"
              placeholder="••••••••"
              {...register("currentPassword")}
            />
            {errors.currentPassword && (
              <p className="text-xs text-danger">
                {errors.currentPassword.message}
              </p>
            )}
          </div>
          <div className="hidden sm:block" />
          <div className="space-y-1.5">
            <Label htmlFor="s-new-password">New Password</Label>
            <Input
              id="s-new-password"
              type="password"
              placeholder="••••••••"
              {...register("newPassword")}
            />
            {errors.newPassword && (
              <p className="text-xs text-danger">
                {errors.newPassword.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-confirm-password">Confirm Password</Label>
            <Input
              id="s-confirm-password"
              type="password"
              placeholder="••••••••"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-danger">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => reset()}>
              Reset
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      <AvatarCropDialog
        key={pendingPreviewUrl ?? "empty"}
        previewUrl={pendingPreviewUrl}
        open={cropOpen}
        onCancel={handleCropCancel}
        onCropped={handleCropSaved}
      />
    </div>
  );
}
