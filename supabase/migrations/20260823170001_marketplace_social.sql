-- Product Likes
create table if not exists product_likes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamp with time zone default now() not null,
  unique(product_id, user_id)
);

alter table product_likes enable row level security;
create policy "Anyone can view product likes" on product_likes for select using (true);
create policy "Authenticated users can like products" on product_likes for insert with check (auth.uid() = user_id);
create policy "Users can unlike their products" on product_likes for delete using (auth.uid() = user_id);

-- Product Comments
create table if not exists product_comments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null check(length(content) <= 500),
  moderation_status text default 'approved' not null,
  created_at timestamp with time zone default now() not null
);

alter table product_comments enable row level security;
create policy "Anyone can view product comments" on product_comments for select using (moderation_status = 'approved');
create policy "Authenticated users can comment on products" on product_comments for insert with check (auth.uid() = user_id);
create policy "Users can delete their own product comments" on product_comments for delete using (auth.uid() = user_id);
create policy "Admins can delete any product comments" on product_comments for delete using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
);

-- Accommodation Likes
create table if not exists accommodation_likes (
  id uuid primary key default gen_random_uuid(),
  accommodation_id uuid references accommodations(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamp with time zone default now() not null,
  unique(accommodation_id, user_id)
);

alter table accommodation_likes enable row level security;
create policy "Anyone can view accommodation likes" on accommodation_likes for select using (true);
create policy "Authenticated users can like accommodations" on accommodation_likes for insert with check (auth.uid() = user_id);
create policy "Users can unlike accommodations" on accommodation_likes for delete using (auth.uid() = user_id);

-- Accommodation Comments
create table if not exists accommodation_comments (
  id uuid primary key default gen_random_uuid(),
  accommodation_id uuid references accommodations(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null check(length(content) <= 500),
  moderation_status text default 'approved' not null,
  created_at timestamp with time zone default now() not null
);

alter table accommodation_comments enable row level security;
create policy "Anyone can view accommodation comments" on accommodation_comments for select using (moderation_status = 'approved');
create policy "Authenticated users can comment on accommodations" on accommodation_comments for insert with check (auth.uid() = user_id);
create policy "Users can delete their own accommodation comments" on accommodation_comments for delete using (auth.uid() = user_id);
create policy "Admins can delete any accommodation comments" on accommodation_comments for delete using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
);
