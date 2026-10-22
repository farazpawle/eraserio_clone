create table public.files (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  archived boolean not null default false,
  document jsonb,
  whiteboard jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.files enable row level security;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function private.set_updated_at() from public, anon, authenticated;

create trigger files_set_updated_at
  before update on public.files
  for each row execute function private.set_updated_at();
