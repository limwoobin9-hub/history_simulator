-- One row per owner and slot. All client access is scoped to auth.uid().
create table public.game_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot between 1 and 3),
  state jsonb not null check (jsonb_typeof(state) = 'object' and pg_column_size(state) <= 524288),
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);

alter table public.game_saves enable row level security;
grant select, insert, update, delete on public.game_saves to authenticated;

create policy "Read own saves" on public.game_saves
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own saves" on public.game_saves
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own saves" on public.game_saves
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Delete own saves" on public.game_saves
  for delete to authenticated using ((select auth.uid()) = user_id);
