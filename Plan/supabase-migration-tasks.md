---
Title: Tasks — Convex + Kinde to self-hosted Supabase (Phase 1: core)
Description: Atomic task list for Plan/supabase-migration-plan.md. Stages 0–7: git safety + leaked-secret cleanup, VPS Supabase key rotation and
  setup, database + RLS, login (replace Kinde), data (replace Convex), cleanup, Docker deploy behind Nginx Proxy Manager, verification.
  [User] tasks need DNS, Google Cloud, Kinde, NPM admin or a human judgement; each says why.
Total Tasks: 122
Status: Not started
Updated: 2026-10-14
---

# Tasks — Supabase migration Phase 1

## Stage 0 — Safety and git hygiene

- [ ] 0.1 Create branch `feat/supabase-migration` from `main`.
- [ ] 0.2 Add `.env`, `.env.*` (except `.env.example`), `.vscode/memories.db` and `script.ps1` to `.gitignore`.
- [ ] 0.3 Stop tracking `.env` (`git rm --cached .env`), keeping the local file.
- [ ] 0.4 Commit the current modified + untracked work as a snapshot; review the staged list first so no secret file is included.
- [ ] 0.5 [User] In the Kinde dashboard, delete the app (or rotate its client secret) — its real secret is in the public GitHub repo history (commit `726ccf3`); only you can log in to Kinde.
- [ ] 0.6 Record installed versions (`next`, `@excalidraw/excalidraw`, VPS GoTrue / Realtime / Postgres / Kong) at the top of this file.

**Verify:** `git status` clean on the branch; `git ls-files | grep -i env` shows nothing but `.env.example` (if any); `script.ps1` not committed.

## Stage 1 — Supabase server setup (VPS `main`, `/opt/supabase`)

- [ ] 1.1 [User] Create DNS A records `eraser.garritwulf.com` and `eraser-api.garritwulf.com` → `147.93.105.118` (needs the domain registrar login).
- [ ] 1.2 Back up `/opt/supabase/.env`, `docker-compose.yml`, `docker-compose.override.yml` and `volumes/api/kong.yml` with a dated suffix.
- [ ] 1.3 Read the Supabase changelog + self-hosting docs for breaking changes affecting the installed versions.
- [ ] 1.4 Generate a new `JWT_SECRET` and matching `ANON_KEY` / `SERVICE_ROLE_KEY` (HS256, long expiry); write them to `/opt/supabase/.env`.
- [ ] 1.5 Replace the two hard-coded old keys in `docker-compose.yml` (temp-key/platform-mock service, ~line 408) with `${ANON_KEY}` / `${SERVICE_ROLE_KEY}`.
- [ ] 1.6 Replace the two hard-coded old keys in `volumes/api/kong.yml` with the new keys (or confirm Kong renders them from env).
- [ ] 1.7 Update the Realtime tenant record(s) in `_realtime.tenants` to the new JWT secret (the tenant stores its own copy).
- [ ] 1.8 Set `SITE_URL=https://eraser.garritwulf.com`, `API_EXTERNAL_URL` and `SUPABASE_PUBLIC_URL=https://eraser-api.garritwulf.com`.
- [ ] 1.9 Set `ADDITIONAL_REDIRECT_URLS=https://eraser.garritwulf.com/**,http://localhost:3000/**`.
- [ ] 1.10 Confirm `ENABLE_EMAIL_SIGNUP=true`, `ENABLE_EMAIL_AUTOCONFIRM=false`; change SMTP sender name from "Schematiq" to "Eraser".
- [ ] 1.11 [User] Create a Google Cloud OAuth client (Web) with redirect URI `https://eraser-api.garritwulf.com/auth/v1/callback`; send me the client ID and secret (needs your Google account).
- [ ] 1.12 Add `GOTRUE_EXTERNAL_GOOGLE_ENABLED/CLIENT_ID/SECRET/REDIRECT_URI` to the auth service in `docker-compose.override.yml`, values from `.env`.
- [ ] 1.13 Recreate the Supabase stack (`docker compose up -d`).
- [ ] 1.14 Confirm every Supabase container is healthy and Realtime accepts a connection with the new anon key.
- [ ] 1.15 Connect the `NGINX-Proxy` container to the `supabase_default` network.
- [ ] 1.16 [User] In Nginx Proxy Manager add proxy host `eraser-api.garritwulf.com` → `supabase-kong:8000`, websockets on, Let's Encrypt SSL (needs the NPM admin login) — or give me the login.
- [ ] 1.17 Update the `selfhosted-supabase` MCP entry in `~/.claude/settings.json` with the new URL and keys (ask the user before editing).

**Verify:** `https://eraser-api.garritwulf.com/auth/v1/health` → 200 with the new anon key; the old anon key → 401; `/auth/v1/settings` shows email + google enabled; Realtime websocket connects.

## Stage 2 — Database (migrations in `supabase/migrations/`)

- [ ] 2.1 Add Supabase CLI as a pinned dev dependency.
- [ ] 2.2 Run `supabase init` (creates `supabase/config.toml` only).
- [ ] 2.3 Create migration (via `supabase migration new`) for `profiles` table + `handle_new_user` trigger on `auth.users` (fills name/avatar from email or Google metadata).
- [ ] 2.4 Create migration for `teams` + `team_members` tables + trigger adding the creator as `owner`.
- [ ] 2.5 Create migration for `private` schema with helpers `is_team_member(team_id)` and `team_role(team_id)` (security definer, `search_path` pinned, `auth.uid()` based, execute revoked from `public`/`anon`).
- [ ] 2.6 Create migration for `team_invitations` table (random 32-byte token default, 7-day expiry default).
- [ ] 2.7 Create migration for `public.accept_invitation(token)` (security definer; rejects anon, wrong email, expired or used tokens; inserts membership; execute granted to `authenticated` only).
- [ ] 2.8 Create migration for `files` table (`document jsonb`, `whiteboard jsonb`) + `updated_at` trigger.
- [ ] 2.9 Create migration for `file_shares` table (random 32-byte token default, `permission` view/comment/edit).
- [ ] 2.10 Create migration for `user_settings` table.
- [ ] 2.11 Create migration: RLS + policies for `profiles` (self read/update; read teammates' profiles).
- [ ] 2.12 Create migration: RLS + policies for `teams` and `team_members`.
- [ ] 2.13 Create migration: RLS + policies for `team_invitations`.
- [ ] 2.14 Create migration: RLS + policies for `files`.
- [ ] 2.15 Create migration: RLS + policies for `file_shares` and `user_settings`.
- [ ] 2.16 Create migration: grants to `authenticated` only (no `anon` table access); indexes on every foreign key and token column.
- [ ] 2.17 Write `supabase/tests/rls.sql`: two users; assert B cannot read/change A's teams, files, shares, invitations, settings; viewer cannot write files; invitation accept rejects wrong email and expired token.
- [ ] 2.18 Apply migrations to the VPS database in order (upload via SSH, run with `psql` inside `supabase-db`, one transaction each, recorded in `supabase_migrations.schema_migrations`).
- [ ] 2.19 Run `supabase/tests/rls.sql` against the VPS database (inside a transaction that rolls back).
- [ ] 2.20 Run security + performance advisors; fix every finding.
- [ ] 2.21 Generate TypeScript types into `types/database.ts`.

**Verify:** RLS test script passes; advisors clean; types file compiles.

## Stage 3 — Login (replace Kinde)

- [ ] 3.1 Check current `@supabase/ssr` docs for Next.js 14 App Router; install `@supabase/supabase-js` and `@supabase/ssr` pinned, commit lockfile.
- [ ] 3.2 Add `lib/supabase/client.ts` (browser client).
- [ ] 3.3 Add `lib/supabase/server.ts` (server client with cookies).
- [ ] 3.4 Add `lib/supabase/admin.ts` (service-role client, `server-only` import guard).
- [ ] 3.5 Write failing test for the route-guard rules (which paths need login, safe `next` redirect).
- [ ] 3.6 Rewrite `middleware.ts`: refresh session with `getClaims()`, protect `/dashboard/:path*`, `/teams/:path*`, `/wokspace/:path*`, `/workspace/:path*`, `/shared/:path*`, `/invite/:path*`.
- [ ] 3.7 Add `app/(auth)/login/page.tsx` (email + password form, Google button).
- [ ] 3.8 Add `app/(auth)/signup/page.tsx` with "check your email" state.
- [ ] 3.9 Add `app/(auth)/forgot-password/page.tsx` (sends reset email).
- [ ] 3.10 Add `app/(auth)/update-password/page.tsx` (set new password after the email link).
- [ ] 3.11 Add `app/auth/callback/route.ts` (code exchange, only relative `next` redirects).
- [ ] 3.12 Add sign-out server action.
- [ ] 3.13 Add `hooks/useUser.ts` (current user + profile) replacing `useKindeBrowserClient`.
- [ ] 3.14 Swap Kinde in the landing page header (`app/_components/Header.tsx`: Login/Register links).
- [ ] 3.15 Swap Kinde in `app/page.tsx`.
- [ ] 3.16 Swap Kinde in `app/dashboard/layout.tsx`, `page.tsx`, `_components/Header.tsx`.
- [ ] 3.17 Swap Kinde in `app/dashboard/_components/SideNav.tsx`, `SideNavTop.tsx`, `FileList.tsx`.
- [ ] 3.18 Swap Kinde in `app/(routes)/teams/create/page.tsx`.
- [ ] 3.19 Swap Kinde in `components/ui/file-share-modal.tsx` and `team-invitation-modal.tsx`.
- [ ] 3.20 Swap Kinde in `app/_hooks/useUserSettings.tsx`.
- [ ] 3.21 Delete `app/api/auth/[kindeAuth]/route.js`.

**Verify:** route-guard test passes; sign-up email arrives; email login, Google login, sign-out, forgot/update password all work locally against the VPS.

## Stage 4 — Data (replace Convex)

- [ ] 4.1 Write failing tests for `lib/data/teams.ts` (list my teams incl. ones I joined, create, delete).
- [ ] 4.2 Implement `lib/data/teams.ts`.
- [ ] 4.3 Write failing tests for `lib/data/files.ts` (list, create, rename, archive, delete, save document, save whiteboard).
- [ ] 4.4 Implement `lib/data/files.ts`.
- [ ] 4.5 Write failing tests for `lib/data/invitations.ts` (send, list, cancel, accept, list members, remove member, change role).
- [ ] 4.6 Implement `lib/data/invitations.ts`.
- [ ] 4.7 Write failing tests for `lib/data/shares.ts` (create link, list, revoke, resolve token server-side incl. expired and revoked).
- [ ] 4.8 Implement `lib/data/shares.ts`.
- [ ] 4.9 Implement `lib/data/settings.ts` (get/upsert).
- [ ] 4.10 Swap Convex in `app/page.tsx`.
- [ ] 4.11 Swap Convex in `app/dashboard/layout.tsx` and `page.tsx` (drop the manual "create user" call — the database trigger does it).
- [ ] 4.12 Swap Convex in `SideNav.tsx`, `SideNavTop.tsx`, `FileList.tsx`.
- [ ] 4.13 Swap Convex in `app/(routes)/teams/create/page.tsx`.
- [ ] 4.14 Swap Convex in the workspace page (load file).
- [ ] 4.15 Swap Convex in `Editor.tsx` (document save, debounced).
- [ ] 4.16 Swap Convex in `WSCanvas.tsx` (whiteboard save, debounced).
- [ ] 4.17 Swap Convex in `file-share-modal.tsx`.
- [ ] 4.18 Swap Convex in `team-invitation-modal.tsx`.
- [ ] 4.19 Rebuild `/shared/[token]` as a server-resolved page (view / comment / edit by permission; edits go through a server route that re-checks the token).
- [ ] 4.20 Add the missing `/invite/[token]` page (the modal already builds this link but no page exists) calling `accept_invitation`.
- [ ] 4.21 Swap Convex in `app/_hooks/useUserSettings.tsx`.

**Verify:** all data-module tests pass; every core screen loads and saves against the VPS database.

## Stage 5 — Cleanup

- [ ] 5.1 Remove `useWorkspaceCollaboration` + `WorkspaceNotificationBar` from the workspace page.
- [ ] 5.2 Remove `ConvexClientProvider` from `app/layout.tsx`; delete the file.
- [ ] 5.3 Delete `convex/` folder.
- [ ] 5.4 Delete collaboration extras: `app/_context/CollaborationContext.tsx`, `hooks/useWorkspaceCollaboration.ts`, `useRealTimeCollaboration.ts`, `useConflictAwareSave.ts`, `types/collaboration.ts`, `types/todos.ts`.
- [ ] 5.5 Delete collaboration UI: `components/ui/` live-cursors, comments-panel, notifications-panel, conflict-resolution-dialog, collaboration-toolbar, user-presence-indicator, workspace-notification-bar.
- [ ] 5.6 Delete admin extras: `app/admin/`, `components/AdminRouteGuard.tsx`, `hooks/useAdminAuth.ts`, `lib/adminAuth.ts`.
- [ ] 5.7 Delete placeholder page `app/dashboard/[userid]/page.tsx`.
- [ ] 5.8 Delete tests for removed code (`Tests/admin-auth`, `Tests/todos`, `Tests/webhook-system`).
- [ ] 5.9 Update the Convex mock in `Tests/workspace-improvements/WorkspaceLoading.test.tsx`.
- [ ] 5.10 Uninstall `convex` and `@kinde-oss/kinde-auth-nextjs`.
- [ ] 5.11 Remove Convex/Kinde/ADMIN vars from local env; add `.env.example` with Supabase names only.
- [ ] 5.12 Rename route folder `wokspace` → `workspace`; update links; add redirect from the old path in `next.config.mjs`.
- [ ] 5.13 Mark `Docs/REAL_TIME_COLLABORATION.md` as Phase 2 / not implemented.
- [ ] 5.14 Update `README.md` tech stack + setup steps.

**Verify:** `grep -ri "convex\|kinde"` in source returns nothing; `npm run build` passes.

## Stage 6 — Deploy (VPS)

- [ ] 6.1 Set `output: 'standalone'` in `next.config.mjs`.
- [ ] 6.2 Add multi-stage `Dockerfile` (Node LTS alpine, non-root user; `NEXT_PUBLIC_*` passed as build args because Next bakes them in at build time).
- [ ] 6.3 Add `docker-compose.prod.yml` binding `10.0.0.1:8091:3000` (Docker bridge gateway — reachable by NPM, not the internet).
- [ ] 6.4 Create `/opt/eraser/.env.prod` on the server (chmod 600): public Supabase URL, anon key, service-role key.
- [ ] 6.5 Copy the app source to `/opt/eraser` on the VPS.
- [ ] 6.6 Build and start the container on the VPS.
- [ ] 6.7 [User] In Nginx Proxy Manager add `eraser.garritwulf.com` → `10.0.0.1:8091`, Let's Encrypt SSL (needs the NPM admin login) — or give me the login.

**Verify:** `https://eraser.garritwulf.com` loads over HTTPS; `http://147.93.105.118:8091` not reachable from outside.

## Stage 7 — Final verification

- [ ] 7.1 `npx tsc --noEmit` passes.
- [ ] 7.2 `npm run lint` passes (causes fixed, not silenced).
- [ ] 7.3 `npm run build` passes.
- [ ] 7.4 `npm test` passes.
- [ ] 7.5 Browser smoke test on live URL: sign up by email, confirm, log in.
- [ ] 7.6 Browser smoke test: Google login, sign out, forgot password.
- [ ] 7.7 Browser smoke test: create team, create file, edit document + whiteboard, reload, changes kept.
- [ ] 7.8 Browser smoke test: invite second user, accept link, second user sees team files.
- [ ] 7.9 Browser smoke test: share link view + edit work; revoked and expired links refused.
- [ ] 7.10 Isolation check: an outside user cannot open a team file URL or read it via the REST API with their token.
- [ ] 7.11 Re-run Supabase advisors on the live database.
- [ ] 7.12 Self-review diff: no debug logs, no secrets, no dead imports, `service_role` only in server files.
- [ ] 7.13 [User] Try the app yourself and confirm it looks and feels right (human judgement).
- [ ] 7.14 Add the recurring project rules (Supabase keys, RLS-first, server-only service role) to the project `CLAUDE.md`.
- [ ] 7.15 Move plan + task file to `Plan/completed/`; write the Phase 2 plan.

## Implementation verification (acceptance)

- All "Done when" items in the plan are met.
- RLS test script and Jest suite are green; advisors report no issues.
- No Convex/Kinde code, packages or env vars remain; no secret file tracked in git.
- `service_role` key appears only in server-side code and server env files.
- Old Supabase keys rejected everywhere; Kinde secret deleted or rotated.
- App reachable only via HTTPS on `eraser.garritwulf.com`; Supabase only via `eraser-api.garritwulf.com`; Studio not public.
