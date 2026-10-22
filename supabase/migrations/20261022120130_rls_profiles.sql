-- Own profile, plus profiles of people who share a team with me (member lists).
create policy "profiles: read self and teammates"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.team_members m
      where m.user_id = profiles.id
        and private.is_team_member(m.team_id)
    )
  );

-- Column grants (grants_and_indexes) limit this to full_name and avatar_url.
create policy "profiles: update self"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
