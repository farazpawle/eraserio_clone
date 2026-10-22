create extension if not exists pgcrypto with schema extensions;

create table public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  email text not null check (char_length(email) between 3 and 320),
  role text not null default 'member' check (role in ('admin', 'member', 'viewer')),
  token text not null unique default encode(extensions.gen_random_bytes(32), 'hex'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled')),
  invited_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.team_invitations enable row level security;

-- One open invitation per email per team.
create unique index team_invitations_one_pending
  on public.team_invitations (team_id, lower(email))
  where status = 'pending';
