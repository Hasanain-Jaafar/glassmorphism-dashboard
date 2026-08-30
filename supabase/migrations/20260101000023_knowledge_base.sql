-- Knowledge Base for AI Brain — admin-uploaded PDFs, text extracted once at
-- upload time (app/api/admin/knowledge-base/route.ts) and cached in
-- `content`, so every later chat turn just reads cheap plain text instead of
-- re-processing the PDF. Private bucket + admin-only RLS throughout: these
-- are internal company documents, not meant to be public like
-- product-images/avatars.

insert into storage.buckets (id, name, public)
values ('knowledge-base', 'knowledge-base', false)
on conflict (id) do nothing;

create policy "knowledge_base_read_admin_only" on storage.objects
  for select using (bucket_id = 'knowledge-base' and public.is_admin());

create policy "knowledge_base_write_admin_only" on storage.objects
  for insert with check (bucket_id = 'knowledge-base' and public.is_admin());

create policy "knowledge_base_delete_admin_only" on storage.objects
  for delete using (bucket_id = 'knowledge-base' and public.is_admin());

create table public.knowledge_base_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  storage_path text not null,
  content text not null,
  file_size integer not null check (file_size >= 0),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index knowledge_base_documents_created_at_idx
  on public.knowledge_base_documents (created_at desc);

grant select, insert, delete on public.knowledge_base_documents to authenticated;

alter table public.knowledge_base_documents enable row level security;

create policy "knowledge_base_documents_select_admin_only" on public.knowledge_base_documents
  for select using (public.is_admin());

create policy "knowledge_base_documents_insert_admin_only" on public.knowledge_base_documents
  for insert with check (public.is_admin());

create policy "knowledge_base_documents_delete_admin_only" on public.knowledge_base_documents
  for delete using (public.is_admin());
