-- file_shares: team owners and admins manage share links. Opening a link is
-- resolved server-side with the service role, so link holders never read this table.

create policy "file_shares: owner or admin read"
  on public.file_shares for select
  to authenticated
  using (exists (
    select 1 from public.files f
    where f.id = file_shares.file_id
      and private.team_role(f.team_id) in ('owner', 'admin')
  ));

create policy "file_shares: owner or admin create"
  on public.file_shares for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.files f
      where f.id = file_shares.file_id
        and private.team_role(f.team_id) in ('owner', 'admin')
    )
  );

create policy "file_shares: owner or admin update"
  on public.file_shares for update
  to authenticated
  using (exists (
    select 1 from public.files f
    where f.id = file_shares.file_id
      and private.team_role(f.team_id) in ('owner', 'admin')
  ))
  with check (exists (
    select 1 from public.files f
    where f.id = file_shares.file_id
      and private.team_role(f.team_id) in ('owner', 'admin')
  ));

create policy "file_shares: owner or admin delete"
  on public.file_shares for delete
  to authenticated
  using (exists (
    select 1 from public.files f
    where f.id = file_shares.file_id
      and private.team_role(f.team_id) in ('owner', 'admin')
  ));

-- user_settings: owner only.

create policy "user_settings: own read"
  on public.user_settings for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "user_settings: own create"
  on public.user_settings for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "user_settings: own update"
  on public.user_settings for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "user_settings: own delete"
  on public.user_settings for delete
  to authenticated
  using (user_id = (select auth.uid()));
