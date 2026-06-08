create table if not exists public.wall_profiles (
  id text primary key,
  name text not null,
  handle text not null,
  avatar text default '',
  bio text default '',
  mood text default 'online',
  song text default '',
  theme text default 'blue',
  pattern text default 'aqua',
  sticker_pack text default 'party',
  headline text default 'Meine Pinnwand',
  glitter boolean default false,
  password_hash text default '',
  photos text[] default '{}',
  created_at timestamptz default now()
);

alter table public.wall_profiles add column if not exists pattern text default 'aqua';
alter table public.wall_profiles add column if not exists sticker_pack text default 'party';
alter table public.wall_profiles add column if not exists headline text default 'Meine Pinnwand';
alter table public.wall_profiles add column if not exists glitter boolean default false;
alter table public.wall_profiles add column if not exists password_hash text default '';
create unique index if not exists wall_profiles_handle_key on public.wall_profiles (handle);

create table if not exists public.wall_posts (
  id text primary key,
  author_id text not null,
  target_id text not null,
  text text not null,
  sticker text default 'Aqua Star',
  created_at timestamptz default now()
);

alter table public.wall_profiles enable row level security;
alter table public.wall_posts enable row level security;

drop policy if exists "wall profiles are readable" on public.wall_profiles;
drop policy if exists "wall profiles can be created" on public.wall_profiles;
drop policy if exists "wall profiles photos can be updated" on public.wall_profiles;
drop policy if exists "wall posts are readable" on public.wall_posts;
drop policy if exists "wall posts can be created" on public.wall_posts;

create policy "wall profiles are readable"
  on public.wall_profiles
  for select
  using (true);

create policy "wall profiles can be created"
  on public.wall_profiles
  for insert
  with check (true);

create policy "wall profiles photos can be updated"
  on public.wall_profiles
  for update
  using (true)
  with check (true);

create policy "wall posts are readable"
  on public.wall_posts
  for select
  using (true);

create policy "wall posts can be created"
  on public.wall_posts
  for insert
  with check (true);

insert into public.wall_profiles (id, name, handle, avatar, bio, mood, song, theme, pattern, sticker_pack, headline, glitter, password_hash, photos)
values (
  'kimon',
  'Kimon',
  'birthday-host',
  '',
  'Host der 23. Geburtstagsnacht. Hier darf alles angepinnt werden, was später lustig ist.',
  'bereit fuer Karaoke',
  'Moment - C4RL',
  'blue',
  'aqua',
  'party',
  'Willkommen auf Kimons Pinnwand',
  true,
  '',
  '{}'
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('wall-images', 'wall-images', true)
on conflict (id) do update set public = true;

drop policy if exists "wall images are public" on storage.objects;
drop policy if exists "wall images can be uploaded" on storage.objects;

create policy "wall images are public"
  on storage.objects
  for select
  using (bucket_id = 'wall-images');

create policy "wall images can be uploaded"
  on storage.objects
  for insert
  with check (bucket_id = 'wall-images');
