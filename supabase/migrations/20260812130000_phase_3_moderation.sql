-- ==========================================
-- PHASE 3: AI MODERATION SCHEMA UPDATES
-- ==========================================

-- 1. Add moderation columns to posts and products
alter table public.posts
  add column if not exists moderation_status text not null default 'approved',
  add column if not exists moderation_score jsonb;

alter table public.products
  add column if not exists moderation_status text not null default 'approved',
  add column if not exists moderation_score jsonb;

-- 2. Create pending-uploads bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('pending-uploads', 'pending-uploads', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('public-images', 'public-images', true)
on conflict (id) do nothing;

-- 3. Storage RLS for pending-uploads
-- Allow users to upload ONLY if the second segment of the path matches their auth.uid()
-- The path structure will be: {table}/{ownerId}/{rowId}/{filename}
-- e.g., posts/uuid/uuid/filename.jpg
drop policy if exists "Users can only upload to their own path" on storage.objects;
create policy "Users can only upload to their own path"
on storage.objects for insert
with check (
  bucket_id = 'pending-uploads'
  and (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authenticated users to read their own pending uploads (just in case they need to fetch them before moderation finishes)
drop policy if exists "Users can read own pending uploads" on storage.objects;
create policy "Users can read own pending uploads"
on storage.objects for select
using (
  bucket_id = 'pending-uploads'
  and (storage.foldername(name))[2] = auth.uid()::text
);

-- Note: 'public-images' RLS should be permissive for reads, restrictive for writes (only service role writes to it after moderation)
drop policy if exists "Public images are viewable by everyone." on storage.objects;
create policy "Public images are viewable by everyone."
on storage.objects for select
using ( bucket_id = 'public-images' );

-- Ensure Edge Functions (service role) can bypass RLS for pending-uploads deletion and public-images insertion.
-- Service Role bypasses RLS by default, so we don't need explicit policies for it, but if we restricted it, we'd add one.
