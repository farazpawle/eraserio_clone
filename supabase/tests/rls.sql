-- RLS isolation test. Run with psql as postgres:
--   psql -v ON_ERROR_STOP=1 -f rls.sql
-- Everything runs in one transaction that is rolled back, so nothing persists.
-- Any failed check raises "FAIL: ..." and stops the script.
--
-- Users: A = alice (team owner), B = bob (outsider), C = carol (invited viewer).

\set ON_ERROR_STOP on
\set A '''aaaaaaaa-0000-0000-0000-00000000000a'''
\set B '''bbbbbbbb-0000-0000-0000-00000000000b'''
\set C '''cccccccc-0000-0000-0000-00000000000c'''

begin;

-- Test helpers, rolled back with everything else.
create schema rls_test;
grant usage on schema rls_test to anon, authenticated;

create function rls_test.check(p_ok boolean, p_msg text) returns void
language plpgsql as $$
begin
  if p_ok is not true then
    raise exception 'FAIL: %', p_msg;
  end if;
  raise notice 'ok: %', p_msg;
end;
$$;

-- Passes when the statement is refused for an access reason. Syntax and
-- undefined-object errors (42xxx except 42501) fail, so a broken test can't pass.
create function rls_test.refused(p_sql text, p_msg text) returns void
language plpgsql as $$
declare
  v_state text;
  v_error text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_error = message_text;
  end;
  perform rls_test.check(
    v_state is not null and (v_state = '42501' or v_state not like '42%'),
    format('%s [%s %s]', p_msg, v_state, v_error));
end;
$$;

-- Rows touched by an update/delete (RLS hides rows silently, so expect 0).
create function rls_test.rows(p_sql text) returns bigint
language plpgsql as $$
declare
  n bigint;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Passes when a statement touches 0 rows or is refused with "permission denied".
create function rls_test.untouched(p_sql text, p_msg text) returns void
language plpgsql as $$
declare
  n bigint := 0;
  v_state text;
begin
  begin
    execute p_sql;
    get diagnostics n = row_count;
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate;
    n := case when v_state = '42501' then 0 else 1 end;
  end;
  perform rls_test.check(n = 0, p_msg);
end;
$$;

create function rls_test.as_user(p_uid uuid) returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

grant execute on all functions in schema rls_test to anon, authenticated;

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', :A, 'authenticated', 'authenticated', 'alice@rls.test', now(), '{"full_name":"Alice"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', :B, 'authenticated', 'authenticated', 'bob@rls.test', now(), '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', :C, 'authenticated', 'authenticated', 'carol@rls.test', now(), '{}', now(), now());

select rls_test.check((select count(*) from public.profiles where id in (:A, :B, :C)) = 3,
  'sign-up trigger created 3 profiles');
select rls_test.check((select full_name from public.profiles where id = :B) = 'bob',
  'profile name falls back to email prefix');

select rls_test.check((select not public from storage.buckets where id = 'canvas-files'),
  'canvas-files bucket is private');
select rls_test.check((select file_size_limit from storage.buckets where id = 'canvas-files') = 5242880,
  'canvas-files bucket limits images to 5 MiB');
select rls_test.check((select allowed_mime_types from storage.buckets where id = 'canvas-files')
  = array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
  'canvas-files bucket allows only image types');

-- ── A sets up a team, file, share, invitations, settings ──
set local role authenticated;
select rls_test.as_user(:A);

insert into public.teams (name) values ('Alice team') returning id as team_id \gset
select rls_test.check((select role from public.team_members where team_id = :'team_id' and user_id = :A) = 'owner',
  'creator added as owner');

insert into public.files (team_id, name, document) values (:'team_id', 'Alice file', '{"v":1}') returning id as file_id \gset
insert into public.file_shares (file_id, permission) values (:'file_id', 'edit');
insert into public.team_invitations (team_id, email, role) values (:'team_id', 'carol@rls.test', 'viewer')
  returning token as carol_token \gset
insert into public.team_invitations (team_id, email, role, expires_at)
  values (:'team_id', 'bob@rls.test', 'member', now() - interval '1 day')
  returning token as expired_token \gset
insert into public.user_settings (theme) values ('dark');

select rls_test.check(length(:'carol_token') = 64, 'invitation token is 32 random bytes (hex)');
select rls_test.check(rls_test.rows(format('update public.files set document = %L where id = %L', '{"v":2}', :'file_id')) = 1,
  'owner can save the document');
select rls_test.refused(format('update public.files set team_id = gen_random_uuid() where id = %L', :'file_id'),
  'owner cannot move a file to another team');

-- Canvas images live in storage at "<file id>/<image id>".
-- Direct deletes from storage tables need this switch (the Storage API sets it itself).
select set_config('storage.allow_delete_query', 'true', true);
insert into storage.objects (bucket_id, name) values ('canvas-files', :'file_id' || '/abc123');
select rls_test.check((select count(*) from storage.objects where bucket_id = 'canvas-files') = 1,
  'owner can store and read a canvas image');
select rls_test.refused(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'canvas-files', gen_random_uuid()::text || '/abc'),
  'owner cannot store an image for a file that does not exist');
select rls_test.refused(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'canvas-files', :'file_id' || '/../x'),
  'image names with path tricks are refused');
select rls_test.refused(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'canvas-files', :'file_id' || '/a/b'),
  'image names with extra folders are refused');
select rls_test.refused(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'canvas-files', upper(:'file_id') || '/x'),
  'image names with an upper-case file id are refused');
select rls_test.refused(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'canvas-files', :'file_id' || E'/abc\n'),
  'image names with a trailing newline are refused');
select rls_test.refused(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'canvas-files', :'file_id' || '/' || repeat('a', 65)),
  'image ids longer than 64 characters are refused');
select rls_test.refused(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'canvas-files', :'file_id' || '/a.b'),
  'image ids with a dot are refused');
select rls_test.refused(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'canvas-files', 'not-a-uuid/abc'),
  'image names that do not start with a file id are refused');

-- ── B (outsider) sees and changes nothing of A's ──
select rls_test.as_user(:B);

select rls_test.check((select count(*) from public.teams) = 0, 'B cannot read A''s team');
select rls_test.check((select count(*) from public.team_members) = 0, 'B cannot read A''s members');
select rls_test.check((select count(*) from public.files) = 0, 'B cannot read A''s files');
select rls_test.check((select count(*) from public.file_shares) = 0, 'B cannot read A''s shares');
select rls_test.check((select count(*) from public.team_invitations) = 0, 'B cannot read A''s invitations');
select rls_test.check((select count(*) from public.user_settings) = 0, 'B cannot read A''s settings');
select rls_test.check((select count(*) from public.profiles) = 1, 'B reads only own profile');

select rls_test.check(rls_test.rows(format('update public.files set name = %L where id = %L', 'hacked', :'file_id')) = 0,
  'B cannot rename A''s file');
select rls_test.check(rls_test.rows(format('delete from public.files where id = %L', :'file_id')) = 0,
  'B cannot delete A''s file');
select rls_test.check(rls_test.rows(format('update public.teams set name = %L where id = %L', 'hacked', :'team_id')) = 0,
  'B cannot rename A''s team');
select rls_test.check(rls_test.rows('update public.file_shares set is_active = true') = 0,
  'B cannot change A''s shares');
select rls_test.check(rls_test.rows('update public.user_settings set theme = ''light''') = 0,
  'B cannot change A''s settings');
select rls_test.check((select count(*) from storage.objects where bucket_id = 'canvas-files') = 0,
  'B cannot read A''s canvas images');
select rls_test.check(rls_test.rows(format('update storage.objects set name = name where bucket_id = %L', 'canvas-files')) = 0,
  'B cannot change A''s canvas images');
select rls_test.check(rls_test.rows(format('delete from storage.objects where bucket_id = %L', 'canvas-files')) = 0,
  'B cannot delete A''s canvas images');
select rls_test.refused(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'canvas-files', :'file_id' || '/b1'),
  'B cannot store an image in A''s file');

select rls_test.refused(format('insert into public.files (team_id, name) values (%L, %L)', :'team_id', 'B file'),
  'B cannot create a file in A''s team');
select rls_test.refused(format('insert into public.team_members (team_id, user_id) values (%L, %L)', :'team_id', :B),
  'B cannot add self to A''s team');
select rls_test.refused(format('insert into public.team_invitations (team_id, email) values (%L, %L)', :'team_id', 'bob2@rls.test'),
  'B cannot invite to A''s team');
select rls_test.refused(format('insert into public.user_settings (user_id) values (%L)', :A),
  'B cannot write settings for A');
select rls_test.refused(format('insert into public.teams (name, created_by) values (%L, %L)', 'fake', :A),
  'B cannot create a team in A''s name');
select rls_test.refused(format('update public.profiles set email = %L where id = %L', 'x@x.x', :B),
  'B cannot change own profile email');

select rls_test.refused(format('select public.accept_invitation(%L)', :'carol_token'),
  'B cannot accept an invitation for another email');
select rls_test.refused(format('select public.accept_invitation(%L)', :'expired_token'),
  'B cannot accept an expired invitation');
select rls_test.refused(format('select public.accept_invitation(%L)', 'no-such-token'),
  'unknown token is refused');

-- ── anon (signed out) has no table access at all ──
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select rls_test.refused('select 1 from public.files limit 1', 'anon cannot read files');
select rls_test.refused('select 1 from public.profiles limit 1', 'anon cannot read profiles');
select rls_test.refused(format('select public.accept_invitation(%L)', :'carol_token'), 'anon cannot accept invitations');
select rls_test.refused(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'canvas-files', :'file_id' || '/anon1'),
  'anon cannot store a canvas image');
select rls_test.untouched('select 1 from storage.objects', 'anon cannot read canvas images');
select rls_test.untouched(format('update storage.objects set name = name where bucket_id = %L', 'canvas-files'),
  'anon cannot change canvas images');
select rls_test.untouched(format('delete from storage.objects where bucket_id = %L', 'canvas-files'),
  'anon cannot delete canvas images');

-- ── C accepts the viewer invitation ──
set local role authenticated;
select rls_test.as_user(:C);

select rls_test.check(public.accept_invitation(:'carol_token') = :'team_id'::uuid, 'C accepts own invitation');
select rls_test.refused(format('select public.accept_invitation(%L)', :'carol_token'), 'used invitation is refused');

select rls_test.check((select count(*) from public.files) = 1, 'viewer C reads team files');
select rls_test.check((select count(*) from public.profiles) = 2, 'C reads own and teammate A''s profile');
select rls_test.check(rls_test.rows(format('update public.files set name = %L where id = %L', 'viewer edit', :'file_id')) = 0,
  'viewer cannot edit files');
select rls_test.refused(format('insert into public.files (team_id, name) values (%L, %L)', :'team_id', 'C file'),
  'viewer cannot create files');
select rls_test.check((select count(*) from public.team_invitations) = 0, 'viewer cannot read invitations');
select rls_test.check((select count(*) from public.file_shares) = 0, 'viewer cannot read shares');
select rls_test.check((select count(*) from storage.objects where bucket_id = 'canvas-files') = 1,
  'viewer C reads the team''s canvas images');
select rls_test.refused(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'canvas-files', :'file_id' || '/c1'),
  'viewer cannot store a canvas image');
select rls_test.check(rls_test.rows(format('delete from storage.objects where bucket_id = %L', 'canvas-files')) = 0,
  'viewer cannot delete canvas images');
select rls_test.check(rls_test.rows(format('update storage.objects set name = name where bucket_id = %L', 'canvas-files')) = 0,
  'viewer cannot change canvas images');
select rls_test.check(rls_test.rows(format('delete from public.team_members where user_id = %L', :A)) = 0,
  'viewer cannot remove the owner');

-- ── A manages roles; owner stays protected ──
select rls_test.as_user(:A);
select rls_test.refused(format('update public.team_members set role = %L where user_id = %L', 'owner', :C),
  'nobody can be promoted to owner');
select rls_test.check(rls_test.rows(format('update public.team_members set role = %L where user_id = %L', 'member', :C)) = 1,
  'owner can change a member''s role');

-- C is a member now: members can add and remove canvas images.
select rls_test.as_user(:C);
insert into storage.objects (bucket_id, name) values ('canvas-files', :'file_id' || '/member1');
select rls_test.check(rls_test.rows(format('delete from storage.objects where name = %L', :'file_id' || '/member1')) = 1,
  'member can store and delete a canvas image');

-- ── B still isolated after C joined ──
select rls_test.as_user(:B);
select rls_test.check((select count(*) from public.profiles) = 1, 'B still reads only own profile');

-- B with a team of their own still cannot touch A's canvas images.
insert into public.teams (name) values ('Bob team') returning id as bteam \gset
insert into public.files (team_id, name) values (:'bteam', 'Bob file') returning id as bfile \gset
insert into storage.objects (bucket_id, name) values ('canvas-files', :'bfile' || '/b1');
select rls_test.check((select count(*) from storage.objects where bucket_id = 'canvas-files') = 1,
  'B reads only the canvas images of their own team');
select rls_test.check(rls_test.rows(format('update storage.objects set name = name where name = %L', :'file_id' || '/abc123')) = 0,
  'B cannot change A''s canvas image from B''s own team');
select rls_test.check(rls_test.rows(format('delete from storage.objects where name = %L', :'file_id' || '/abc123')) = 0,
  'B cannot delete A''s canvas image from B''s own team');
select rls_test.refused(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'canvas-files', :'file_id' || '/b2'),
  'B cannot store an image in A''s file even with a team of their own');

reset role;
rollback;

\echo 'RLS tests passed'
