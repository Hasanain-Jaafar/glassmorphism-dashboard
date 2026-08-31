import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 4 * 1024 * 1024; // Vercel's default serverless request-body limit is ~4.5MB.

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.user) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const formData = await request.formData();
  const title = formData.get("title");
  const file = formData.get("file");

  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Enter a title" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a PDF file" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "PDF must be smaller than 4MB" },
      { status: 400 }
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  let content = "";
  try {
    // getDocumentProxy/extractText detach the ArrayBuffer they're given
    // (pdf.js takes ownership of it for performance) — pass a copy so the
    // original `bytes` used for the storage upload below stays intact.
    // Confirmed empirically: without .slice(), bytes.byteLength becomes 0
    // after extraction, silently uploading a corrupted empty file.
    const pdf = await getDocumentProxy(bytes.slice());
    const extracted = await extractText(pdf, { mergePages: true });
    content = extracted.text.trim();
  } catch {
    // A PDF that fails to parse (corrupted, unusual structure) still gets
    // stored — the admin can view the original file even if AI Brain can't
    // read anything useful from it.
    content = "";
  }

  const supabase = await createClient();
  const storagePath = `${crypto.randomUUID()}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("knowledge-base")
    .upload(storagePath, bytes, { contentType: "application/pdf" });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data, error: insertError } = await supabase
    .from("knowledge_base_documents")
    .insert({
      title: title.trim(),
      storage_path: storagePath,
      content: content || "(No extractable text found in this PDF.)",
      file_size: file.size,
      uploaded_by: admin.user.id,
    })
    .select("id, title, storage_path, file_size, created_at")
    .single();

  if (insertError || !data) {
    // Clean up the orphaned storage object if the row insert failed.
    await supabase.storage.from("knowledge-base").remove([storagePath]);
    return NextResponse.json(
      { error: insertError?.message ?? "Couldn't save the document" },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      id: data.id,
      title: data.title,
      storagePath: data.storage_path,
      fileSize: data.file_size,
      createdAt: data.created_at,
    },
    { status: 201 }
  );
}
