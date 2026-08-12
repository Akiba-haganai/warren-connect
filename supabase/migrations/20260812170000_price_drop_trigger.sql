-- 20260812170000_price_drop_trigger.sql
-- Notifies buyers who saved a product when its price drops.

-- 0. Ensure schema compatibility for notifications
alter table public.notifications
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists link text,
  add column if not exists item_type text,
  add column if not exists item_id text,
  add column if not exists payload jsonb;

-- ---------------------------------------------------------------------------
-- 1. Trigger function
-- ---------------------------------------------------------------------------
create or replace function public.notify_on_product_price_drop()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_drop_pct numeric;
  v_cooldown interval := interval '24 hours';
  v_min_drop_pct numeric := 5; -- ignore drops smaller than 5%
begin
  -- Guard against division by zero / nonsensical prices.
  if OLD.price is null or OLD.price <= 0 then
    return NEW;
  end if;

  v_drop_pct := ((OLD.price - NEW.price) / OLD.price) * 100;

  if v_drop_pct < v_min_drop_pct then
    return NEW;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    link,
    item_type,
    item_id,
    payload,
    created_at
  )
  select
    si.user_id,
    'price_drop',
    'Price Drop Alert! 📉',
    'The price of "' || NEW.title || '" dropped from K' || OLD.price || ' to K' || NEW.price || '!',
    '/marketplace/' || NEW.id,
    'product',
    NEW.id,
    jsonb_build_object(
      'product_id', NEW.id,
      'old_price', OLD.price,
      'new_price', NEW.price,
      'drop_pct', round(v_drop_pct, 2)
    ),
    now()
  from public.saved_items si
  where si.item_type = 'product'
    and si.item_id = NEW.id
    -- don't notify the seller about their own listing
    and si.user_id <> NEW.seller_id
    -- cooldown: skip buyers already notified about this product recently
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = si.user_id
        and n.item_type = 'product'
        and n.item_id = NEW.id
        and n.type = 'price_drop'
        and n.created_at > now() - v_cooldown
    );

  return NEW;
end;
$$;

comment on function public.notify_on_product_price_drop() is
  'Fires on product price decreases and fans out a system notification to '
  'every buyer who saved the item, subject to a minimum drop threshold and '
  'a per-buyer cooldown to prevent notification spam.';

-- ---------------------------------------------------------------------------
-- 2. Trigger
-- ---------------------------------------------------------------------------
drop trigger if exists trg_notify_on_product_price_drop on public.products;

create trigger trg_notify_on_product_price_drop
  after update on public.products
  for each row
  when (NEW.price < OLD.price)
  execute function public.notify_on_product_price_drop();

-- ---------------------------------------------------------------------------
-- 3. RLS so buyers can actually read their own notifications
-- ---------------------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists "Users can read their own notifications" on public.notifications;

create policy "Users can read their own notifications"
  on public.notifications
  for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. Realtime: required for usePriceDrop.ts to receive inserts.
--    Idempotent guard since ADD TABLE errors if already a member.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Helpful index: the cooldown NOT EXISTS check and buyer inbox reads both
--    filter on (user_id, item_type, item_id, type, created_at).
-- ---------------------------------------------------------------------------
create index if not exists idx_notifications_user_item_type_created
  on public.notifications (user_id, item_type, item_id, type, created_at desc);
