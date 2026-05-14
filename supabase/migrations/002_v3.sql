-- prompts: one row per day
create table if not exists public.prompts (
  id          uuid primary key default gen_random_uuid(),
  text        text not null,
  active_date date not null unique
);

alter table public.prompts enable row level security;

do $$ begin
  create policy "Anyone can read prompts" on public.prompts for select using (true);
exception when duplicate_object then null;
end $$;

-- drawings: stroke data submitted by users (or seed drawings with user_id null)
create table if not exists public.drawings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete set null,
  prompt_id    uuid references public.prompts(id) on delete cascade,
  strokes      jsonb not null default '[]',
  submitted_at timestamptz default now() not null
);

alter table public.drawings enable row level security;

do $$ begin
  create policy "Anyone can read drawings" on public.drawings for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can insert own drawings"
    on public.drawings for insert with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- ratings: one per (drawing, rater) pair
create table if not exists public.ratings (
  id         uuid primary key default gen_random_uuid(),
  drawing_id uuid not null references public.drawings(id) on delete cascade,
  rater_id   uuid not null references public.profiles(id) on delete cascade,
  stars      smallint not null check (stars between 1 and 5),
  rated_at   timestamptz default now() not null,
  unique (drawing_id, rater_id)
);

alter table public.ratings enable row level security;

do $$ begin
  create policy "Users can read ratings" on public.ratings for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can insert own ratings"
    on public.ratings for insert with check (auth.uid() = rater_id);
exception when duplicate_object then null;
end $$;

-- add drawing_id to games for challenge cuts
alter table public.games add column if not exists drawing_id uuid references public.drawings(id) on delete set null;

-- seed prompts (adjust dates as needed)
insert into public.prompts (text, active_date) values
  ('Draw a cat',   current_date),
  ('Draw a house', current_date + 1),
  ('Draw a tree',  current_date + 2),
  ('Draw a fish',  current_date + 3),
  ('Draw a sun',   current_date + 4),
  ('Draw a car',   current_date + 5),
  ('Draw a bird',  current_date + 6)
on conflict (active_date) do nothing;

-- seed drawings: simple strokes for the absolute fallback
insert into public.drawings (user_id, prompt_id, strokes)
select
  null,
  (select id from public.prompts where text = 'Draw a cat'),
  '[{"tool":"brush","color":"#000000","size":12,"points":[[580,300],[556,390],[490,456],[400,480],[310,456],[244,390],[220,300],[244,210],[310,144],[400,120],[490,144],[556,210],[580,300]]}]'::jsonb
where not exists (
  select 1 from public.drawings
  where user_id is null
    and prompt_id = (select id from public.prompts where text = 'Draw a cat')
);

insert into public.drawings (user_id, prompt_id, strokes)
select
  null,
  (select id from public.prompts where text = 'Draw a house'),
  '[{"tool":"brush","color":"#000000","size":12,"points":[[250,400],[250,280],[400,160],[550,280],[550,400],[250,400]]},{"tool":"brush","color":"#000000","size":12,"points":[[340,400],[340,300],[460,300],[460,400]]}]'::jsonb
where not exists (
  select 1 from public.drawings
  where user_id is null
    and prompt_id = (select id from public.prompts where text = 'Draw a house')
);
