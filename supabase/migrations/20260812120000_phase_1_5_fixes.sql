-- ==========================================
-- 1. FIX KEYWORD FILTER TYPOS ('block', 'flag')
-- ==========================================

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

  if v_result = 'block' then
    raise exception 'Content violates community guidelines';
  elsif v_result = 'flag' then
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


-- ==========================================
-- 2. SERVER-SIDE CONTENT SNAPSHOT ON REPORTS
-- ==========================================

create or replace function public.set_report_content_snapshot()
returns trigger language plpgsql security definer as $$
declare v_live_row record;
begin
  if new.content_snapshot is null then
    if new.content_type = 'post' then
      select * into v_live_row from public.posts where id = new.content_id;
      if found then new.content_snapshot := to_jsonb(v_live_row); end if;
    elsif new.content_type = 'product' then
      select * into v_live_row from public.products where id = new.content_id;
      if found then new.content_snapshot := to_jsonb(v_live_row); end if;
    elsif new.content_type = 'accommodation' then
      select * into v_live_row from public.accommodations where id = new.content_id;
      if found then new.content_snapshot := to_jsonb(v_live_row); end if;
    elsif new.content_type = 'message' then
      select * into v_live_row from public.messages where id = new.content_id;
      if found then new.content_snapshot := to_jsonb(v_live_row); end if;
    end if;
  end if;
  return new;
end;
$$;

-- ==========================================
-- 3. SEED KEYWORDS
-- ==========================================
insert into public.blocked_keywords (keyword, severity) values
  ('kill', 'block'),
  ('murder', 'block'),
  ('assassinate', 'block'),
  ('bomb', 'block'),
  ('terrorist', 'block'),
  ('idiot', 'flag'),
  ('stupid', 'flag'),
  ('moron', 'flag'),
  ('scam', 'flag')
on conflict (keyword) do nothing;

drop trigger if exists trg_reports_snapshot on public.reports;
create trigger trg_reports_snapshot
before insert on public.reports
for each row execute function public.set_report_content_snapshot();
