import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, requireAdmin } from "@/lib/supabase/admin";

const updateSchema = z.object({
  fullName: z.string().min(2, "Enter a full name").optional(),
  email: z.string().email("Enter a valid email").optional(),
  phone: z.string().nullable().optional(),
  role: z.enum(["admin", "sales_rep"]).optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional(),
  hasCar: z.boolean().optional(),
  startDate: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin.user) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { fullName, email, phone, role, password, hasCar, startDate } =
    parsed.data;

  if (role && id === admin.user.id && role !== "admin") {
    return NextResponse.json(
      { error: "You cannot change your own role" },
      { status: 400 }
    );
  }

  const supabaseAdmin = createAdminClient();

  if (email || password) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      ...(email ? { email } : {}),
      ...(password ? { password } : {}),
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  const profileUpdates: Record<string, unknown> = {};
  if (fullName !== undefined) profileUpdates.full_name = fullName;
  if (email !== undefined) profileUpdates.email = email;
  if (phone !== undefined) profileUpdates.phone = phone || null;
  if (role !== undefined) profileUpdates.role = role;
  if (hasCar !== undefined) profileUpdates.has_car = hasCar;
  if (startDate !== undefined) profileUpdates.start_date = startDate || null;

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdates)
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin.user) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  if (id === admin.user.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 }
    );
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
