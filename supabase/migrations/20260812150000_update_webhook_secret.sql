create or replace function public.call_moderate_image()
returns trigger as $$
declare
  v_url text := 'https://dhxgdapxzovsjdgqoore.supabase.co/functions/v1/moderate-image';
  v_webhook_secret text := 'warren-connect-secure-webhook-2026';
begin
  -- Only fire for pending-uploads bucket to save unnecessary pg_net calls
  if NEW.bucket_id != 'pending-uploads' then
    return NEW;
  end if;

  -- Use pg_net to make the async HTTP request
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_webhook_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', row_to_json(NEW),
      'old_record', null
    )
  );

  return NEW;
end;
$$ language plpgsql security definer;
