grant usage on schema public to anon, authenticated;

alter table public.wall_profiles add column if not exists verified boolean default false;

create table if not exists public.wall_comments (
  id text primary key,
  post_id text not null,
  author_id text not null,
  text text not null,
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.wall_profiles to anon, authenticated;
grant select, insert, update, delete on public.wall_posts to anon, authenticated;
grant select, insert, delete on public.wall_follows to anon, authenticated;
grant select, insert, update, delete on public.wall_comments to anon, authenticated;

alter table public.wall_profiles disable row level security;
alter table public.wall_posts disable row level security;
alter table public.wall_follows disable row level security;
alter table public.wall_comments disable row level security;
