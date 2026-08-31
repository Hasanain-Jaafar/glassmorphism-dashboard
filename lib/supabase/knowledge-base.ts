import { createClient } from "@/lib/supabase/client";

export type KnowledgeBaseDocument = {
  id: string;
  title: string;
  storagePath: string;
  fileSize: number;
  createdAt: string;
};

/** Admin-only via RLS. Excludes `content` — the list view never needs the full extracted text. */
export async function fetchKnowledgeBaseDocuments(): Promise<KnowledgeBaseDocument[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("knowledge_base_documents")
    .select("id, title, storage_path, file_size, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    storagePath: row.storage_path,
    fileSize: row.file_size,
    createdAt: row.created_at,
  }));
}

/** Short-lived (5 min — enough for a PDF viewer's range requests while someone reads it) signed URL, generated on demand and never stored. */
export async function getKnowledgeBaseDocumentViewUrl(
  storagePath: string
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("knowledge-base")
    .createSignedUrl(storagePath, 300);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteKnowledgeBaseDocument(
  id: string,
  storagePath: string
): Promise<void> {
  const supabase = createClient();
  const { error: storageError } = await supabase.storage
    .from("knowledge-base")
    .remove([storagePath]);
  if (storageError) throw storageError;

  const { error } = await supabase
    .from("knowledge_base_documents")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
