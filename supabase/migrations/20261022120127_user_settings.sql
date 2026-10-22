create table public.user_settings (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  keyboard_shortcuts jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function private.set_updated_at();
