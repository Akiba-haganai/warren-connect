-- Add RLS policies for Admins on accommodations
drop policy if exists "Admins can update accommodations" on public.accommodations;
create policy "Admins can update accommodations"
on public.accommodations for update
using (public.is_admin());

drop policy if exists "Admins can delete accommodations" on public.accommodations;
create policy "Admins can delete accommodations"
on public.accommodations for delete
using (public.is_admin());

-- Add RLS policies for Admins on profiles
drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles for update
using (public.is_admin());

-- Add RLS policies for Admins on reports
drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports"
on public.reports for update
using (public.is_admin());

drop policy if exists "Admins can delete reports" on public.reports;
create policy "Admins can delete reports"
on public.reports for delete
using (public.is_admin());

-- Add RLS policies for Admins on tags
drop policy if exists "Admins can insert tags" on public.tags;
create policy "Admins can insert tags"
on public.tags for insert
with check (public.is_admin());

drop policy if exists "Admins can delete tags" on public.tags;
create policy "Admins can delete tags"
on public.tags for delete
using (public.is_admin());

-- Add RLS policies for Admins on notifications (for handling resets)
drop policy if exists "Admins can delete notifications" on public.notifications;
create policy "Admins can delete notifications"
on public.notifications for delete
using (public.is_admin());
