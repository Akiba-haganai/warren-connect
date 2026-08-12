-- Lock down direct INSERT permissions on posts and products
-- Forces all post and product creations to route through the create-post and create-product Edge Functions.

-- Drop any permissive INSERT policies for posts
drop policy if exists "Users can insert their own posts" on public.posts;
drop policy if exists "Authenticated users can create posts" on public.posts;
drop policy if exists "Users can create posts" on public.posts;
drop policy if exists "Enable insert for authenticated users only" on public.posts;

-- Drop any permissive INSERT policies for products
drop policy if exists "Users can insert their own products" on public.products;
drop policy if exists "Authenticated users can create products" on public.products;
drop policy if exists "Users can create products" on public.products;
drop policy if exists "Enable insert for authenticated users only" on public.products;
