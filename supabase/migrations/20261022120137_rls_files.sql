-- Every member reads; owner, admin and member write; viewer is read-only.

create policy "files: members read"
  on public.files for select
  to authenticated
  using (private.is_team_member(team_id));

create policy "files: writers create"
  on public.files for insert
  to authenticated
  with check (
    private.team_role(team_id) in ('owner', 'admin', 'member')
    and created_by = (select auth.uid())
  );

create policy "files: writers update"
  on public.files for update
  to authenticated
  using (private.team_role(team_id) in ('owner', 'admin', 'member'))
  with check (private.team_role(team_id) in ('owner', 'admin', 'member'));

create policy "files: writers delete"
  on public.files for delete
  to authenticated
  using (private.team_role(team_id) in ('owner', 'admin', 'member'));
