-- Create deletion_requests table if it doesn't exist
create table if not exists public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'rejected')),
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.deletion_requests enable row level security;

-- Policies for deletion_requests
drop policy if exists "Users can insert their own deletion requests" on public.deletion_requests;
create policy "Users can insert their own deletion requests"
on public.deletion_requests for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can view their own deletion requests" on public.deletion_requests;
create policy "Users can view their own deletion requests"
on public.deletion_requests for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Admins can update deletion requests" on public.deletion_requests;
create policy "Admins can update deletion requests"
on public.deletion_requests for update
using (public.is_admin());

drop policy if exists "Admins can delete deletion requests" on public.deletion_requests;
create policy "Admins can delete deletion requests"
on public.deletion_requests for delete
using (public.is_admin());
