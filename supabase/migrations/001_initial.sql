-- profiles: one row per auth user, created automatically via trigger
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique,
  avatar_url  text,
  created_at  timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can read any profile"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- games: nullable user_id allows guest play
create table public.games (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  score      integer not null,
  left_pct   numeric not null,
  right_pct  numeric not null,
  played_at  timestamptz default now() not null
);

alter table public.games enable row level security;

create policy "Users can insert own games"
  on public.games for insert with check (auth.uid() = user_id);

create policy "Users can read own games"
  on public.games for select using (auth.uid() = user_id);

-- Storage bucket for avatars is created in the Supabase dashboard.
-- Bucket name: avatars
-- Public: true (avatar images are publicly readable)
