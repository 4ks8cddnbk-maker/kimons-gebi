delete from public.wall_posts;
delete from public.wall_follows;

delete from public.wall_profiles
where id <> 'kimon';

insert into public.wall_profiles (
  id,
  name,
  handle,
  avatar,
  bio,
  mood,
  song,
  theme,
  pattern,
  sticker_pack,
  headline,
  glitter,
  background_color,
  accent_color,
  font_style,
  layout_density,
  password_hash,
  photos
)
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
  'Willkommen auf Kimons .fish',
  true,
  '#dcecff',
  '#66b9f1',
  'lucida',
  'cozy',
  '',
  '{}'
)
on conflict (id) do update set
  name = excluded.name,
  handle = excluded.handle,
  avatar = excluded.avatar,
  bio = excluded.bio,
  mood = excluded.mood,
  song = excluded.song,
  theme = excluded.theme,
  pattern = excluded.pattern,
  sticker_pack = excluded.sticker_pack,
  headline = excluded.headline,
  glitter = excluded.glitter,
  background_color = excluded.background_color,
  accent_color = excluded.accent_color,
  font_style = excluded.font_style,
  layout_density = excluded.layout_density,
  photos = excluded.photos;
