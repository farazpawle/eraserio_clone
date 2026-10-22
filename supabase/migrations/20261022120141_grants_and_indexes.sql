-- Supabase's default privileges give anon and authenticated full access to new
-- public tables. Reset, then grant authenticated only what the policies need.
-- Column-level update grants stop clients moving rows between teams/owners.

revoke all on
  public.profiles, public.teams, public.team_members, public.team_invitations,
  public.files, public.file_shares, public.user_settings
from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

grant select, insert, delete on public.teams to authenticated;
grant update (name, archived) on public.teams to authenticated;

grant select, delete on public.team_members to authenticated;
grant update (role) on public.team_members to authenticated;

grant select, insert, delete on public.team_invitations to authenticated;
grant update (status) on public.team_invitations to authenticated;

grant select, insert, delete on public.files to authenticated;
grant update (name, archived, document, whiteboard) on public.files to authenticated;

grant select, insert, delete on public.file_shares to authenticated;
grant update (permission, expires_at, is_active) on public.file_shares to authenticated;

grant select, insert, update, delete on public.user_settings to authenticated;

-- Foreign-key indexes (primary keys and unique tokens are indexed already).
create index teams_created_by_idx on public.teams (created_by);
create index team_members_user_id_idx on public.team_members (user_id);
create index team_members_invited_by_idx on public.team_members (invited_by);
create index team_invitations_team_id_idx on public.team_invitations (team_id);
create index team_invitations_invited_by_idx on public.team_invitations (invited_by);
create index files_team_id_idx on public.files (team_id);
create index files_created_by_idx on public.files (created_by);
create index file_shares_file_id_idx on public.file_shares (file_id);
create index file_shares_created_by_idx on public.file_shares (created_by);
