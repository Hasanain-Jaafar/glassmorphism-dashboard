"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  fetchKnowledgeBaseDocuments,
  getKnowledgeBaseDocumentViewUrl,
  deleteKnowledgeBaseDocument,
  type KnowledgeBaseDocument,
} from "@/lib/supabase/knowledge-base";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Admin-uploaded PDFs AI Brain draws on for policy/product questions
 * (lib/ai/tools.ts's get_knowledge_base). Text is extracted once at upload
 * (app/api/admin/knowledge-base/route.ts) — this UI only manages the files.
 */
export function KnowledgeBaseSection() {
  const [documents, setDocuments] = useState<KnowledgeBaseDocument[] | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchKnowledgeBaseDocuments()
      .then(setDocuments)
      .catch((error: Error) =>
        toast.error(error.message ?? "Couldn't load the knowledge base")
      );
  }, []);

  function resetForm() {
    setTitle("");
    setFile(null);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;

    if (selected.type !== "application/pdf") {
      toast.error("Please choose a PDF file");
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      toast.error("PDF must be smaller than 4MB");
      return;
    }
    setFile(selected);
  }

  async function handleUpload() {
    if (!title.trim()) {
      toast.error("Enter a title");
      return;
    }
    if (!file) {
      toast.error("Choose a PDF file");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("file", file);

      const response = await fetch("/api/admin/knowledge-base", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Couldn't upload the document");
      }

      setDocuments((prev) => [
        {
          id: data.id,
          title: data.title,
          storagePath: data.storagePath,
          fileSize: data.fileSize,
          createdAt: data.createdAt,
        },
        ...(prev ?? []),
      ]);
      toast.success("Document added");
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't upload the document"
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleView(doc: KnowledgeBaseDocument) {
    // Open the tab synchronously, in direct response to the click — most
    // browsers silently block window.open() once it happens after an
    // await, since that's no longer "the direct result of a user gesture".
    // Redirect this already-open tab once the signed URL resolves instead.
    const tab = window.open("", "_blank", "noopener,noreferrer");
    try {
      const url = await getKnowledgeBaseDocumentViewUrl(doc.storagePath);
      if (tab) {
        tab.location.href = url;
      } else {
        toast.error(
          "Your browser blocked the popup — allow popups for this site and try again"
        );
      }
    } catch (error) {
      tab?.close();
      toast.error(
        error instanceof Error ? error.message : "Couldn't open that document"
      );
    }
  }

  async function handleDelete(doc: KnowledgeBaseDocument) {
    setDeletingId(doc.id);
    try {
      await deleteKnowledgeBaseDocument(doc.id, doc.storagePath);
      setDocuments((prev) => prev?.filter((d) => d.id !== doc.id) ?? prev);
      toast.success("Document deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't delete that document"
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground sm:text-base">
            Knowledge Base
          </h3>
          <p className="mt-0.5 text-xs text-text-tertiary">
            PDFs AI Brain can reference for policy, product, and playbook questions.
          </p>
        </div>

        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) resetForm();
          }}
        >
          <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
            <Plus className="size-3.5" />
            Add Document
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Knowledge Base Document</DialogTitle>
              <DialogDescription>
                Upload a PDF (up to 4MB) for AI Brain to reference in conversations.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="kb-title">Title</Label>
                <Input
                  id="kb-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Discount Policy"
                />
              </div>

              <div className="space-y-1.5">
                <Label>File</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileText className="size-4" />
                  {file ? file.name : "Choose PDF file…"}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? "Uploading…" : "Upload"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-5">
        {documents === null ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <p className="rounded-lg bg-foreground/[0.03] px-4 py-6 text-center text-sm text-text-tertiary">
            No documents yet. Add a policy, playbook, or product PDF for AI
            Brain to reference.
          </p>
        ) : (
          <ul className="divide-y divide-glass-border">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {doc.title}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    {formatFileSize(doc.fileSize)} · {formatDate(doc.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => handleView(doc)}>
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={deletingId === doc.id}
                    onClick={() => handleDelete(doc)}
                    aria-label={`Delete ${doc.title}`}
                    className="text-text-tertiary hover:text-danger"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
