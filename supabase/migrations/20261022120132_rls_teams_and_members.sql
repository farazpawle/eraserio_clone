-- teams

-- created_by check too: on insert ... returning, the owner membership row
-- (added by an after-insert trigger) is not visible yet.
create policy "teams: members read"
  on public.teams for select
  to authenticated
  using (created_by = (select auth.uid()) or private.is_team_member(id));

create policy "teams: create as self"
  on public.teams for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "teams: owner or admin update"
  on public.teams for update
  to authenticated
  using (private.team_role(id) in ('owner', 'admin'))
  with check (private.team_role(id) in ('owner', 'admin'));

create policy "teams: owner delete"
  on public.teams for delete
  to authenticated
  using (private.team_role(id) = 'owner');

-- team_members: no insert policy; rows come from the new-team trigger and accept_invitation().

create policy "team_members: members read"
  on public.team_members for select
  to authenticated
  using (private.is_team_member(team_id));

-- Owner row is never changed, and nobody can be promoted to owner.
create policy "team_members: owner or admin change role"
  on public.team_members for update
  to authenticated
  using (role <> 'owner' and private.team_role(team_id) in ('owner', 'admin'))
  with check (role <> 'owner' and private.team_role(team_id) in ('owner', 'admin'));

-- Owner or admin removes someone, or a non-owner leaves.
create policy "team_members: remove or leave"
  on public.team_members for delete
  to authenticated
  using (
    role <> 'owner'
    and (user_id = (select auth.uid()) or private.team_role(team_id) in ('owner', 'admin'))
  );
