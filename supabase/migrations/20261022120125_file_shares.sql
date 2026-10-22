create table public.file_shares (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files (id) on delete cascade,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  token text not null unique default encode(extensions.gen_random_bytes(32), 'hex'),
  permission text not null default 'view' check (permission in ('view', 'comment', 'edit')),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.file_shares enable row level security;
