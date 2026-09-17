create extension if not exists pgcrypto;

create table if not exists public.coaching_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_date date not null,
  start_time time not null,
  end_time time not null,
  client_name text not null check (char_length(trim(client_name)) > 0),
  paid_minutes integer not null default 0 check (paid_minutes >= 0),
  free_minutes integer not null default 0 check (free_minutes >= 0),
  received_coach_the_coach_minutes integer not null default 0 check (received_coach_the_coach_minutes >= 0),
  coaching_format text not null default '1:1 비대면',
  given_coach_the_coach_minutes integer not null default 0 check (given_coach_the_coach_minutes >= 0),
  mentor_coaching_minutes integer not null default 0 check (mentor_coaching_minutes >= 0),
  milestone text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint at_least_one_activity check (
    paid_minutes + free_minutes + received_coach_the_coach_minutes +
    given_coach_the_coach_minutes + mentor_coaching_minutes > 0
  )
);

create index if not exists coaching_sessions_user_date_idx
  on public.coaching_sessions (user_id, session_date desc);

create unique index if not exists coaching_sessions_import_identity_idx
  on public.coaching_sessions (user_id, session_date, start_time, end_time, client_name);

alter table public.coaching_sessions enable row level security;

create policy "Users can read only their coaching sessions"
  on public.coaching_sessions for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert only their coaching sessions"
  on public.coaching_sessions for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update only their coaching sessions"
  on public.coaching_sessions for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete only their coaching sessions"
  on public.coaching_sessions for delete
  using ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists coaching_sessions_set_updated_at on public.coaching_sessions;
create trigger coaching_sessions_set_updated_at
  before update on public.coaching_sessions
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.coaching_sessions to authenticated;
