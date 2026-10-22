-- Only team owners and admins see and manage invitations.
-- Invitees never read this table; they go through accept_invitation().

create policy "team_invitations: owner or admin read"
  on public.team_invitations for select
  to authenticated
  using (private.team_role(team_id) in ('owner', 'admin'));

create policy "team_invitations: owner or admin create"
  on public.team_invitations for insert
  to authenticated
  with check (
    private.team_role(team_id) in ('owner', 'admin')
    and invited_by = (select auth.uid())
    and status = 'pending'
  );

create policy "team_invitations: owner or admin update"
  on public.team_invitations for update
  to authenticated
  using (private.team_role(team_id) in ('owner', 'admin'))
  with check (private.team_role(team_id) in ('owner', 'admin'));

create policy "team_invitations: owner or admin delete"
  on public.team_invitations for delete
  to authenticated
  using (private.team_role(team_id) in ('owner', 'admin'));
