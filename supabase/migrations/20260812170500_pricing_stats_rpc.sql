-- Function to get price statistics (IQR trimmed median, min, max) for marketplace items
create or replace function public.get_product_price_stats(p_category text default null, p_condition text default null)
returns table (
  suggested_min numeric,
  suggested_max numeric,
  average_price numeric,
  sample_size bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count bigint;
  v_q1 numeric;
  v_q3 numeric;
  v_iqr numeric;
  v_lower_bound numeric;
  v_upper_bound numeric;
begin
  -- Calculate 25th and 75th percentiles to determine IQR bounds
  select 
    count(*),
    percentile_cont(0.25) within group (order by price),
    percentile_cont(0.75) within group (order by price)
  into v_count, v_q1, v_q3
  from public.products
  where (p_category is null or category = p_category)
    and (p_condition is null or condition = p_condition)
    and is_hidden = false
    and moderation_status = 'approved';

  if v_count < 3 then
    return query select 0::numeric, 0::numeric, 0::numeric, 0::bigint;
    return;
  end if;

  v_iqr := coalesce(v_q3 - v_q1, 0);
  v_lower_bound := greatest(0, v_q1 - (1.5 * v_iqr));
  v_upper_bound := v_q3 + (1.5 * v_iqr);

  -- Return IQR-trimmed min, max, and avg
  return query
  select 
    round(min(price)::numeric, 2),
    round(max(price)::numeric, 2),
    round(avg(price)::numeric, 2),
    count(*)
  from public.products
  where (p_category is null or category = p_category)
    and (p_condition is null or condition = p_condition)
    and is_hidden = false
    and moderation_status = 'approved'
    and price >= v_lower_bound
    and price <= v_upper_bound;
end;
$$;
