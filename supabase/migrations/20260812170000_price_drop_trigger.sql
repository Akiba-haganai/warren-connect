-- Price drop notification trigger with security definer and set-based fan-out
create or replace function public.notify_on_product_price_drop()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Minimum 5% drop threshold to prevent notification spam
  if ((OLD.price - NEW.price) / OLD.price) >= 0.05 then
    insert into public.notifications (user_id, title, body, link, created_at)
    select 
      s.user_id,
      'Price Drop Alert! 📉',
      'The price of "' || NEW.title || '" dropped from K' || OLD.price || ' to K' || NEW.price || '!',
      '/marketplace/' || NEW.id,
      now()
    from public.saved_items s
    where s.item_type = 'product' 
      and s.item_id = NEW.id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_product_price_drop on public.products;
create trigger trg_product_price_drop
after update on public.products
for each row
when (NEW.price < OLD.price)
execute function public.notify_on_product_price_drop();

-- Ensure realtime publication includes notifications table
alter publication supabase_realtime add table public.notifications;
