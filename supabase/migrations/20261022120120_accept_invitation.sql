-- Called by the invitee from /invite/[token]. Security definer because the
-- invitee is not a member yet, so cannot read the invitation or add membership.
-- Returns the joined team's id.
create function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_inv public.team_invitations;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  -- Read auth.users, not the JWT or profile: the current, confirmed address.
  select email into v_email
  from auth.users
  where id = v_uid and email_confirmed_at is not null;

  select * into v_inv
  from public.team_invitations
  where token = p_token
  for update;

  if not found then
    raise exception 'Invitation not found' using errcode = 'P0002';
  end if;
  if v_inv.status <> 'pending' then
    raise exception 'Invitation already used or cancelled' using errcode = '22023';
  end if;
  if v_inv.expires_at <= now() then
    raise exception 'Invitation expired' using errcode = '22023';
  end if;
  -- "is distinct from" so a missing email (anonymous or unconfirmed user) fails too.
  if lower(v_email) is distinct from lower(v_inv.email) then
    raise exception 'Invitation is for a different email' using errcode = '42501';
  end if;

  insert into public.team_members (team_id, user_id, role, invited_by)
  values (v_inv.team_id, v_uid, v_inv.role, v_inv.invited_by)
  on conflict (team_id, user_id) do nothing;

  update public.team_invitations
  set status = 'accepted', accepted_at = now()
  where id = v_inv.id;

  return v_inv.team_id;
end;
$$;

revoke execute on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;
