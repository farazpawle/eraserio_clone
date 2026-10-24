-- Private bucket for images pasted into a file's canvas.
-- Object name is "<files.id>/<excalidraw image id>"; access follows the file's team:
-- every member reads, owner/admin/member write, viewers and outsiders get nothing.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'canvas-files',
  'canvas-files',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- The file id from an object name, or null when the name is not exactly
-- "<uuid>/<id>" (no extra folders, no "..").
create function private.canvas_file_id(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9_-]{1,64}$'
    then split_part(p_name, '/', 1)::uuid
  end;
$$;

revoke execute on function private.canvas_file_id(text) from public, anon;
grant execute on function private.canvas_file_id(text) to authenticated;

-- The files lookup runs as the caller, so public.files' own policy limits it to team members.
-- Write objects.name: a bare "name" would resolve to public.files.name inside the subquery.
create policy "canvas-files: members read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'canvas-files'
    and exists (select 1 from public.files f where f.id = private.canvas_file_id(objects.name))
  );

create policy "canvas-files: writers insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'canvas-files'
    and exists (
      select 1 from public.files f
      where f.id = private.canvas_file_id(objects.name)
        and private.team_role(f.team_id) in ('owner', 'admin', 'member')
    )
  );

create policy "canvas-files: writers update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'canvas-files'
    and exists (
      select 1 from public.files f
      where f.id = private.canvas_file_id(objects.name)
        and private.team_role(f.team_id) in ('owner', 'admin', 'member')
    )
  )
  with check (
    bucket_id = 'canvas-files'
    and exists (
      select 1 from public.files f
      where f.id = private.canvas_file_id(objects.name)
        and private.team_role(f.team_id) in ('owner', 'admin', 'member')
    )
  );

create policy "canvas-files: writers delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'canvas-files'
    and exists (
      select 1 from public.files f
      where f.id = private.canvas_file_id(objects.name)
        and private.team_role(f.team_id) in ('owner', 'admin', 'member')
    )
  );
