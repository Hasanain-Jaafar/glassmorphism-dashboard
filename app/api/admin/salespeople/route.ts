import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, requireAdmin } from "@/lib/supabase/admin";

const createSchema = z.object({
  fullName: z.string().min(2, "Enter a full name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
  role: z.enum(["admin", "sales_rep"]).default("sales_rep"),
  hasCar: z.boolean().default(false),
  startDate: z.string().optional(),
});

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.user) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { fullName, email, password, phone, role, hasCar, startDate } =
    parsed.data;

  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "Could not create account" },
      { status: 400 }
    );
  }

  // The handle_new_user() trigger already inserted a default profiles row
  // (role: sales_rep, full_name/email from the auth user) — finish it off
  // with the fields the trigger doesn't know about.
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      phone: phone || null,
      role,
      has_car: hasCar,
      start_date: startDate || null,
    })
    .eq("id", data.user.id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ id: data.user.id }, { status: 201 });
}
