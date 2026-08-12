-- ==========================================
-- 1. USER MUTES TABLE
-- ==========================================
create table if not exists public.user_mutes (
  id uuid primary key default gen_random_uuid(),
  muter_id uuid not null references public.profiles(id) on delete cascade,
  muted_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint no_self_mute check (muter_id <> muted_id),
  unique (muter_id, muted_id)
);

alter table public.user_mutes enable row level security;

drop policy if exists "Users manage their own mutes" on public.user_mutes;
create policy "Users manage their own mutes"
on public.user_mutes for all
using (auth.uid() = muter_id)
with check (auth.uid() = muter_id);

-- ==========================================
-- 2. BLOCKED USERS RLS & HELPER FUNCTIONS
-- ==========================================
alter table public.blocked_users enable row level security;

drop policy if exists "Users manage their own blocks" on public.blocked_users;
create policy "Users manage their own blocks"
on public.blocked_users for all
using (auth.uid() = blocker_id)
with check (auth.uid() = blocker_id);

-- SECURITY DEFINER allows internal RLS checks to safely evaluate bidirectional blocks
create or replace function public.is_blocked_relationship(other_user_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.blocked_users
    where (blocker_id = auth.uid() and blocked_id = other_user_id)
       or (blocker_id = other_user_id and blocked_id = auth.uid())
  );
$$;

-- Helper function to check if current user is banned
create or replace function public.is_current_user_banned()
returns boolean
language sql
security definer
stable
as $$
  select is_banned from public.profiles where id = auth.uid();
$$;

-- ==========================================
-- 3. ENFORCE BLOCK & BAN FILTERING ON CONTENT TABLES (AS RESTRICTIVE)
-- ==========================================

-- Posts 
drop policy if exists "Hide posts from blocked relationships" on public.posts;
create policy "Hide posts from blocked relationships"
on public.posts as restrictive for select
using (not public.is_blocked_relationship(user_id));

drop policy if exists "Banned users cannot create posts" on public.posts;
create policy "Banned users cannot create posts"
on public.posts as restrictive for insert
with check (not coalesce(public.is_current_user_banned(), false));

drop policy if exists "Banned users cannot update posts" on public.posts;
create policy "Banned users cannot update posts"
on public.posts as restrictive for update
using (not coalesce(public.is_current_user_banned(), false));

-- Products 
drop policy if exists "Hide products from blocked relationships" on public.products;
create policy "Hide products from blocked relationships"
on public.products as restrictive for select
using (not public.is_blocked_relationship(seller_id));

drop policy if exists "Banned users cannot create products" on public.products;
create policy "Banned users cannot create products"
on public.products as restrictive for insert
with check (not coalesce(public.is_current_user_banned(), false));

drop policy if exists "Banned users cannot update products" on public.products;
create policy "Banned users cannot update products"
on public.products as restrictive for update
using (not coalesce(public.is_current_user_banned(), false));

-- Accommodations 
drop policy if exists "Hide accommodations from blocked relationships" on public.accommodations;
create policy "Hide accommodations from blocked relationships"
on public.accommodations as restrictive for select
using (not public.is_blocked_relationship(owner_id));

drop policy if exists "Banned users cannot create accommodations" on public.accommodations;
create policy "Banned users cannot create accommodations"
on public.accommodations as restrictive for insert
with check (not coalesce(public.is_current_user_banned(), false));

drop policy if exists "Banned users cannot update accommodations" on public.accommodations;
create policy "Banned users cannot update accommodations"
on public.accommodations as restrictive for update
using (not coalesce(public.is_current_user_banned(), false));

-- Messages
drop policy if exists "Cannot message blocked users" on public.messages;
create policy "Cannot message blocked users"
on public.messages as restrictive for insert
with check (
  (not coalesce(public.is_current_user_banned(), false))
  and
  not exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (public.is_blocked_relationship(c.user1_id) or public.is_blocked_relationship(c.user2_id))
  )
);

drop policy if exists "Banned users cannot update messages" on public.messages;
create policy "Banned users cannot update messages"
on public.messages as restrictive for update
using (not coalesce(public.is_current_user_banned(), false));

-- ==========================================
-- 4. NON-DESTRUCTIVE UPGRADE FOR REPORTS TABLE
-- ==========================================
alter table public.reports 
  add column if not exists content_owner_id uuid references public.profiles(id) on delete set null,
  add column if not exists reason_detail text,
  add column if not exists content_snapshot jsonb,
  add column if not exists assigned_moderator_id uuid references public.profiles(id),
  add column if not exists resolution_note text,
  add column if not exists resolved_at timestamptz,
  add column if not exists is_system_generated boolean not null default false;

alter table public.reports alter column status set default 'pending';

alter table public.reports enable row level security;
drop policy if exists "Users can create reports" on public.reports;
create policy "Users can create reports"
on public.reports for insert
with check (auth.uid() = reporter_id);

drop policy if exists "Users can view their own submitted reports" on public.reports;
create policy "Users can view their own submitted reports"
on public.reports for select
using ((auth.uid() = reporter_id and not is_system_generated) or public.is_admin());

drop policy if exists "Admins can update reports" on public.reports;
create policy "Admins can update reports"
on public.reports for update
using (public.is_admin());

-- ==========================================
-- 5. RATE LIMITING TABLE, FUNCTION & TRIGGERS
-- ==========================================
create table if not exists public.rate_limit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  action_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_lookup on public.rate_limit_events(user_id, action_type, created_at);

create or replace function public.check_rate_limit(
  p_user_id uuid, p_action_type text, p_max_count int, p_window_seconds int
) returns boolean
language plpgsql security definer as $$
declare v_count int;
begin
  select count(*) into v_count
  from public.rate_limit_events
  where user_id = p_user_id
    and action_type = p_action_type
    and created_at > now() - (p_window_seconds || ' seconds')::interval;

  if v_count >= p_max_count then
    return false;
  end if;

  insert into public.rate_limit_events(user_id, action_type) values (p_user_id, p_action_type);
  return true;
end;
$$;

-- Generic Trigger Function for Rate Limits
create or replace function public.enforce_rate_limit()
returns trigger language plpgsql as $$
begin
  if TG_TABLE_NAME = 'posts' then
    if not public.check_rate_limit(new.user_id, 'post', 5, 60) then
      raise exception 'Rate limit exceeded: maximum 5 posts per minute';
    end if;
  elsif TG_TABLE_NAME = 'messages' then
    if not public.check_rate_limit(new.sender_id, 'message', 20, 60) then
      raise exception 'Rate limit exceeded: maximum 20 messages per minute';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_post_rate_limit on public.posts;
create trigger trg_post_rate_limit
before insert on public.posts
for each row execute function public.enforce_rate_limit();

drop trigger if exists trg_message_rate_limit on public.messages;
create trigger trg_message_rate_limit
before insert on public.messages
for each row execute function public.enforce_rate_limit();

-- ==========================================
-- 6. KEYWORD FILTER TABLE, FUNCTION & TRIGGERS
-- ==========================================
create table if not exists public.blocked_keywords (
  id bigint generated always as identity primary key,
  keyword text not null unique,
  severity text not null default 'block' -- 'block' or 'flag'
);

create or replace function public.check_profanity(content_text text)
returns text
language plpgsql stable as $$
declare v_match record;
begin
  if content_text is null or content_text = '' then
    return 'clean';
  end if;

  for v_match in select keyword, severity from public.blocked_keywords loop
    if content_text ilike '%' || v_match.keyword || '%' then
      return v_match.severity;
    end if;
  end loop;
  return 'clean';
end;
$$;

-- Generic Trigger Function for Keyword Filter (SECURITY DEFINER allows internal insertion to reports)
create or replace function public.enforce_content_filter()
returns trigger language plpgsql security definer as $$
declare v_result text;
declare v_content_type text;
declare v_content text;
declare v_author_id uuid;
begin
  if TG_TABLE_NAME = 'posts' then
    v_content := new.content;
    v_content_type := 'post';
    v_author_id := new.user_id;
  elsif TG_TABLE_NAME = 'messages' then
    v_content := new.content;
    v_content_type := 'message';
    v_author_id := new.sender_id;
  else
    return new;
  end if;

  v_result := public.check_profanity(v_content);

  if v_result = 'blocked' then
    raise exception 'Content violates community guidelines';
  elsif v_result = 'flagged' then
    insert into public.reports(
      reporter_id, content_type, content_id, content_owner_id,
      reason, reason_detail, content_snapshot, is_system_generated
    ) values (
      v_author_id, v_content_type, new.id, v_author_id,
      'other', 'Auto-flagged by keyword filter',
      to_jsonb(new), true
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_post_content_filter on public.posts;
create trigger trg_post_content_filter
before insert or update on public.posts
for each row execute function public.enforce_content_filter();

drop trigger if exists trg_message_content_filter on public.messages;
create trigger trg_message_content_filter
before insert or update on public.messages
for each row execute function public.enforce_content_filter();
