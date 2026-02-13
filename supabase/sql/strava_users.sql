create table if not exists public.strava_users (
  athlete_id bigint primary key,
  username text,
  firstname text,
  lastname text,
  city text,
  state text,
  country text,
  profile_medium text,
  profile text,
  access_token text,
  refresh_token text,
  expires_at bigint,
  raw jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists strava_users_updated_at_idx
  on public.strava_users (updated_at desc);

