-- Safely add is_admin to profiles if it doesn't exist
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Safely create or replace the is_admin() function for RLS
create or replace function public.is_admin()
returns boolean as $$
declare
  is_admin_flag boolean;
begin
  select profiles.is_admin into is_admin_flag
  from public.profiles
  where id = auth.uid();
  
  return coalesce(is_admin_flag, false);
end;
$$ language plpgsql security definer;

-- Add RLS policies allowing admins to delete posts
drop policy if exists "Admins can delete posts" on public.posts;
create policy "Admins can delete posts"
on public.posts for delete
using (public.is_admin());

-- Add RLS policies allowing admins to delete products
drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
on public.products for delete
using (public.is_admin());

-- Add RLS policies allowing admins to delete comments
drop policy if exists "Admins can delete comments" on public.post_comments;
create policy "Admins can delete comments"
on public.post_comments for delete
using (public.is_admin());

-- Allow admins to update posts (e.g., to hide them)
drop policy if exists "Admins can update posts" on public.posts;
create policy "Admins can update posts"
on public.posts for update
using (public.is_admin());

-- Allow admins to update products (e.g., to hide them)
drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
on public.products for update
using (public.is_admin());
