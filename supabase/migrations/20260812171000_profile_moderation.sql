-- Add moderation_status column to profiles and accommodations if missing
alter table public.profiles
  add column if not exists moderation_status text not null default 'approved',
  add column if not exists moderation_score jsonb;

alter table public.accommodations
  add column if not exists moderation_status text not null default 'approved',
  add column if not exists moderation_score jsonb;
