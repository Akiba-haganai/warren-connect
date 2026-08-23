create or replace function get_feed_with_stats(caller_id uuid, page_limit int, page_offset int)
returns table (
  id uuid,
  user_id uuid,
  content text,
  image_url text,
  created_at timestamp with time zone,
  is_hidden boolean,
  moderation_status text,
  moderation_score jsonb,
  featured boolean,
  user_name text,
  user_avatar text,
  is_verified boolean,
  likes_count bigint,
  comments_count bigint,
  is_liked boolean
)
language sql security definer
as $$
  select 
    p.id,
    p.user_id,
    p.content,
    p.image_url,
    p.created_at,
    p.is_hidden,
    p.moderation_status,
    p.moderation_score,
    p.featured,
    pr.full_name as user_name,
    pr.avatar_url as user_avatar,
    pr.is_verified,
    (select count(*) from post_likes pl where pl.post_id = p.id) as likes_count,
    (select count(*) from post_comments pc where pc.post_id = p.id) as comments_count,
    case when caller_id is null then false else exists(select 1 from post_likes pl where pl.post_id = p.id and pl.user_id = caller_id) end as is_liked
  from posts p
  left join profiles pr on pr.id = p.user_id
  where p.is_hidden = false 
    and p.moderation_status = 'approved'
  order by p.created_at desc
  limit page_limit
  offset page_offset;
$$;
