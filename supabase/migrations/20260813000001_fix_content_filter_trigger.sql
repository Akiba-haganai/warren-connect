create or replace function public.enforce_content_filter()
returns trigger language plpgsql security definer as $$
declare v_result text;
declare v_content_type text;
declare v_content text;
declare v_author_id uuid;
begin
  -- Only run the profanity check on INSERT, or on UPDATE if the content actually changed.
  -- This allows admins to update fields like is_hidden or featured without triggering blocks
  -- on pre-existing content that might violate new keyword rules.
  if TG_OP = 'UPDATE' then
    if TG_TABLE_NAME = 'posts' and new.content = old.content then
      return new;
    elsif TG_TABLE_NAME = 'messages' and new.content = old.content then
      return new;
    end if;
  end if;

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
