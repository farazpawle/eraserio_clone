-- Not in the API's exposed schemas. Security definer so policies can read
-- team_members without recursing into team_members' own policies.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create function private.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = (select auth.uid())
  );
$$;

-- The caller's role in the team, or null when not a member.
create function private.team_role(p_team_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.team_members
  where team_id = p_team_id and user_id = (select auth.uid());
$$;

revoke execute on function private.is_team_member(uuid), private.team_role(uuid) from public, anon;
grant execute on function private.is_team_member(uuid), private.team_role(uuid) to authenticated;
