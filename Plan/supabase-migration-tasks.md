---
Title: Tasks — Convex + Kinde to self-hosted Supabase (Phase 1: core)
Description: Atomic task list for Plan/supabase-migration-plan.md. Stages 0–7: git safety + leaked-secret cleanup, VPS Supabase key rotation and
  setup, database + RLS, login (replace Kinde), data (replace Convex), cleanup, Docker deploy behind Nginx Proxy Manager, verification.
  [User] tasks need DNS, Google Cloud, Kinde, NPM admin or a human judgement; each says why.
Total Tasks: 131
Status: In progress (Stage 4 done except postponed checks 4.25–4.26 and avatar fix 4.27; next Stage 5)
Updated: 2026-10-14
---
# Tasks — Supabase migration Phase 1

## Recorded versions (task 0.6, 2026-10-14)

- next 14.2.3 · @excalidraw/excalidraw ^0.17.6 · react ^18 · node v24.21.0 (local)
- VPS `main`: GoTrue v2.189.0 · Realtime v2.102.3 · Postgres 15.8.1.085 · Kong 2.8.1

## Stage 0 — Safety and git hygiene

- [X]  0.1 Create branch `feat/supabase-migration` from `main`.
- [X]  0.2 Add `.env`, `.env.*` (except `.env.example`), `.vscode/memories.db` and `script.ps1` to `.gitignore`.
- [X]  0.3 Stop tracking `.env` (`git rm --cached .env`), keeping the local file.
- [X]  0.4 Commit the current modified + untracked work as a snapshot; review the staged list first so no secret file is included.
- [ ]  0.5 [User] In the Kinde dashboard, delete the app (user confirmed 2026-10-22: Kinde is dropped for Supabase login, no rotation) — its real secret is in the public GitHub repo history (commit `726ccf3`); only you can log in to Kinde.
- [X]  0.6 Record installed versions (`next`, `@excalidraw/excalidraw`, VPS GoTrue / Realtime / Postgres / Kong) at the top of this file.

**Verify:** `git status` clean on the branch; `git ls-files | grep -i env` shows nothing but `.env.example` (if any); `script.ps1` not committed.

## Stage 1 — Supabase server setup (VPS `main`, `/opt/supabase`)

- [X]  1.1 [User] Create DNS A records `eraser.garritwulf.com` and `eraser-api.garritwulf.com` → `147.93.105.118` (needs the domain registrar login).
- [X]  1.2 Back up `/opt/supabase/.env`, `docker-compose.yml`, `docker-compose.override.yml` and `volumes/api/kong.yml` with a dated suffix.
- [X]  1.3 Read the Supabase changelog + self-hosting docs for breaking changes affecting the installed versions. Findings: don't pull new upstream compose files (Envoy replaces Kong, PG17, `API_EXTERNAL_URL` now ends in `/auth/v1` upstream — ours stays the bare host, so Google redirect = `${API_EXTERNAL_URL}/auth/v1/callback`); changing `JWT_SECRET` signs out all users.
- [X]  1.4 Generate a new `JWT_SECRET` and matching `ANON_KEY` / `SERVICE_ROLE_KEY` (HS256, long expiry); write them to `/opt/supabase/.env`. Done 2026-10-22 on the server (secret never left it); claims `iss=supabase`, `aud=authenticated`, 10-year expiry; backups `*.bak-stage1-20261022-105653`.
- [X]  1.5 Replace the two hard-coded old keys in `docker-compose.yml` (temp-key/platform-mock service, ~line 408) with `${ANON_KEY}` / `${SERVICE_ROLE_KEY}`.
- [X]  1.6 Replace the two hard-coded old keys in `volumes/api/kong.yml` with the new keys (Kong 2.8.1 here mounts the file directly, no env rendering).
- [X]  1.7 Update the Realtime tenant record(s) in `_realtime.tenants` to the new JWT secret. Not done by SQL: `SEED_SELF_HOST=true` deletes and re-seeds tenant `realtime-dev` from `API_JWT_SECRET` on every start (re-seeded 10:57:45). Stale tenants `supabase-realtime` (db `supabase`) and `garritwulf` (db `postgres`) still hold the old, now-dead secret; unused.
- [X]  1.8 Set `SITE_URL=https://eraser.garritwulf.com`, `API_EXTERNAL_URL` and `SUPABASE_PUBLIC_URL=https://eraser-api.garritwulf.com`.
- [X]  1.9 Set `ADDITIONAL_REDIRECT_URLS=https://eraser.garritwulf.com/**,http://localhost:3000/**`.
- [X]  1.10 Confirm `ENABLE_EMAIL_SIGNUP=true`, `ENABLE_EMAIL_AUTOCONFIRM=false`; change SMTP sender name from "Schematiq" to "Eraser".
- [X]  1.11 [User] (done 2026-10-22, project `silicon-parity-510713-r1`, client "Eraser web"; app still in Testing — see 6.8) Create a Google Cloud OAuth client (Web) with redirect URI `https://eraser-api.garritwulf.com/auth/v1/callback`; send me the client ID and secret (needs your Google account).
- [X]  1.12 Add `GOTRUE_EXTERNAL_GOOGLE_ENABLED/CLIENT_ID/SECRET/REDIRECT_URI` to the auth service in `docker-compose.override.yml`, values from `.env` (`GOOGLE_ENABLED/GOOGLE_CLIENT_ID/GOOGLE_SECRET`). Done 2026-10-22, auth recreated; `/auth/v1/settings` google=true; `/authorize?provider=google` → 302 to Google with redirect `https://eraser-api.garritwulf.com/auth/v1/callback`.
- [X]  1.13 Recreate the Supabase stack (`docker compose up -d --force-recreate`, 2026-10-22). Re-run `docker compose up -d auth` after 1.12.
- [X]  1.14 Confirm every Supabase container is healthy and Realtime accepts a connection with the new anon key. Via Kong internally: new key → health 200, rest 200, websocket 101; old key → 401 / 401 / 403.
- [X]  1.15 Connect the `NGINX-Proxy` container to the `supabase_default` network. Done 2026-10-22; `http://supabase-kong:8000` reachable from NPM. Not persisted if the NPM container is recreated from its own compose — re-run `docker network connect supabase_default NGINX-Proxy` then.
- [X]  1.16 [User] (done 2026-10-22; public check: new key health 200, old key 401, websocket 101, email on, autoconfirm off) In Nginx Proxy Manager add proxy host `eraser-api.garritwulf.com` → `supabase-kong:8000`, websockets on, Let's Encrypt SSL (needs the NPM admin login) — or give me the login.
- [X]  1.17 Update the `selfhosted-supabase` MCP entry with the new URL and keys (user approved 2026-10-22). Entry is in `~/.claude.json` (not `settings.json`), still `"disabled": true`; backup `~/.claude.json.bak-stage1-*`. Works once 1.16 is live and Claude Code is restarted.

**Verify:** `https://eraser-api.garritwulf.com/auth/v1/health` → 200 with the new anon key; the old anon key → 401; `/auth/v1/settings` shows email + google enabled; Realtime websocket connects.

## Stage 2 — Database (migrations in `supabase/migrations/`)

- [X]  2.1 Add Supabase CLI as a pinned dev dependency. (`supabase` 2.121.0, exact pin)
- [X]  2.2 Run `supabase init` (creates `supabase/config.toml` only). `major_version` set to 15 to match the VPS.
- [X]  2.3 Create migration (via `supabase migration new`) for `profiles` table + `handle_new_user` trigger on `auth.users` (fills name/avatar from email or Google metadata).
- [X]  2.4 Create migration for `teams` + `team_members` tables + trigger adding the creator as `owner`.
- [X]  2.5 Create migration for `private` schema with helpers `is_team_member(team_id)` and `team_role(team_id)` (security definer, `search_path` pinned, `auth.uid()` based, execute revoked from `public`/`anon`).
- [X]  2.6 Create migration for `team_invitations` table (random 32-byte token default, 7-day expiry default).
- [X]  2.7 Create migration for `public.accept_invitation(token)` (security definer; rejects anon, wrong email, expired or used tokens; inserts membership; execute granted to `authenticated` only).
- [X]  2.8 Create migration for `files` table (`document jsonb`, `whiteboard jsonb`) + `updated_at` trigger.
- [X]  2.9 Create migration for `file_shares` table (random 32-byte token default, `permission` view/comment/edit).
- [X]  2.10 Create migration for `user_settings` table.
- [X]  2.11 Create migration: RLS + policies for `profiles` (self read/update; read teammates' profiles).
- [X]  2.12 Create migration: RLS + policies for `teams` and `team_members`.
- [X]  2.13 Create migration: RLS + policies for `team_invitations`.
- [X]  2.14 Create migration: RLS + policies for `files`.
- [X]  2.15 Create migration: RLS + policies for `file_shares` and `user_settings`.
- [X]  2.16 Create migration: grants to `authenticated` only (no `anon` table access); indexes on every foreign key and token column. Update grants are column-level (clients cannot change `team_id`, `created_by`, profile `email`).
- [X]  2.17 Write `supabase/tests/rls.sql`: two users; assert B cannot read/change A's teams, files, shares, invitations, settings; viewer cannot write files; invitation accept rejects wrong email and expired token. 42 checks; refusals must be access errors (a typo in a test fails it).

Note (2026-10-22): RLS is enabled in each table's own migration (not only in 2.11–2.15), so no table is ever open between migrations. All migrations + `rls.sql` + advisors were first run on a local throwaway DB (`supabase db start`, Postgres 15): 42/42 pass; advisors only "unused index" INFO (empty DB).

- [X]  2.18 Apply migrations to the VPS database in order (upload via SSH, run with `psql` inside `supabase-db`, one transaction each, recorded in `supabase_migrations.schema_migrations`). Done 2026-10-22 (user approved). **The app database is `supabase` (`POSTGRES_DB`), not `postgres`** — `postgres` has no `auth` schema. `supabase.public` was empty, 0 users, no clash. Run as `postgres` → tables owned by `postgres`.
- [X]  2.19 Run `supabase/tests/rls.sql` against the VPS database (inside a transaction that rolls back). 42/42 pass; afterwards 0 users and no `rls_test` schema left.
- [X]  2.20 Run security + performance advisors; fix every finding. Local CLI advisors: clean (only "unused index" INFO on empty DB). VPS DB is only on `127.0.0.1:5435` inside the server, so the CLI wasn't pointed at it (would need the DB password on the PC); instead ran the key lints as SQL on the live DB: no table without RLS, no function without fixed `search_path`, no definer function or table reachable by `anon`, no unindexed foreign key. Full advisor run on live DB stays in 7.11.
- [X]  2.21 Generate TypeScript types into `types/database.ts`. (From the local DB; compiles with `tsc --strict`. Regenerate if the VPS schema differs.)

**Verify:** RLS test script passes; advisors clean; types file compiles.

## Stage 3 — Login (replace Kinde)

- [X]  3.1 Check current `@supabase/ssr` docs for Next.js 14 App Router; install `@supabase/supabase-js` and `@supabase/ssr` pinned, commit lockfile. (`@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.117.3, `server-only` 0.0.1, exact pins; lockfile not committed yet — no commits made this stage.)
- [X]  3.2 Add `lib/supabase/client.ts` (browser client).
- [X]  3.3 Add `lib/supabase/server.ts` (server client with cookies).
- [X]  3.4 Add `lib/supabase/admin.ts` (service-role client, `server-only` import guard). `SUPABASE_SERVICE_ROLE_KEY` not in local env yet — add when Stage 4 needs it (share page).
- [X]  3.5 Write failing test for the route-guard rules (which paths need login, safe `next` redirect). `Tests/auth/routes.test.ts`, 27 tests; rules in `lib/auth/routes.ts`.
- [X]  3.6 Rewrite `middleware.ts`: refresh session with `getClaims()`, protect `/dashboard/:path*`, `/teams/:path*`, `/wokspace/:path*`, `/workspace/:path*`, `/shared/:path*`, `/invite/:path*`. Also `/admin` until Stage 5 deletes it; signed-in users are sent from login/signup/forgot-password to `/dashboard`.
- [X]  3.7 Add `app/(auth)/login/page.tsx` (email + password form, Google button).
- [X]  3.8 Add `app/(auth)/signup/page.tsx` with "check your email" state.
- [X]  3.9 Add `app/(auth)/forgot-password/page.tsx` (sends reset email).
- [X]  3.10 Add `app/(auth)/update-password/page.tsx` (set new password after the email link).
- [X]  3.11 Add `app/auth/callback/route.ts` (code exchange, only relative `next` redirects). Uses `SITE_URL` env (server-only) as origin when set — **must be set in prod (6.4)** because behind NPM `request.url` is the container address.
- [X]  3.12 Add sign-out server action. (`app/auth/actions.ts`)
- [X]  3.13 Add `hooks/useUser.ts` (current user + profile) replacing `useKindeBrowserClient`. Name/avatar from auth metadata (same source the profiles trigger copies), no extra query; switch to `profiles` once profile editing exists.
- [X]  3.14 Swap Kinde in the landing page header (`app/_components/Header.tsx`: Login/Register links).
- [X]  3.15 Swap Kinde in `app/page.tsx`.
- [X]  3.16 Swap Kinde in `app/dashboard/layout.tsx`, `page.tsx`, `_components/Header.tsx`. Avatars use `components/ui/avatar` with an initial fallback (email users have no picture); installed its missing `@radix-ui/react-avatar` 1.2.7.
- [X]  3.17 Swap Kinde in `app/dashboard/_components/SideNav.tsx`, `SideNavTop.tsx`, `FileList.tsx`.
- [X]  3.18 Swap Kinde in `app/(routes)/teams/create/page.tsx`.
- [X]  3.19 Swap Kinde in `components/ui/file-share-modal.tsx` and `team-invitation-modal.tsx`.
- [X]  3.20 Swap Kinde in `app/_hooks/useUserSettings.tsx`.
- [X]  3.21 Delete `app/api/auth/[kindeAuth]/route.js`.

Notes (2026-10-22):
- Kinde still imported only by `app/_context/CollaborationContext.tsx` and `hooks/useAdminAuth.ts` — both deleted in Stage 5.
- Checks run: `tsc` — no errors in changed files (pre-existing: `app/admin/settings/page_old.tsx` syntax, CollaborationContext, live-cursors, useRealTimeCollaboration, `components/ui/scroll-area.tsx` missing `@radix-ui/react-scroll-area`). Jest 290/317: the 27 failures are pre-existing (keyboard-shortcut tests fire events with no target, FileCardLoading `useRouter.mockReturnValue`, FAB/ExportDropdown text matchers, webhook, scroll-area module). `jest.setup.js` now sets dummy Supabase env so components using `useUser` render in tests.
- **ESLint is not configured** (`next lint` asks to set it up) — 7.2 needs a config first.
- Smoke test on `next dev` against the VPS: all auth pages 200; `/dashboard`, `/wokspace/..`, `/invite/..` → 307 `/login?next=…`; bad/missing callback code → login with error; wrong password shows "Invalid login credentials". Real sign-up email, Google, reset and sign-out still need a human inbox → user check below.
- [X]  3.22 [User] (confirmed by user 2026-10-22: sign-up email link, Google login, logout, password reset all work) Try sign-up by email (confirm link arrives and works), Google login, log out, and forgot password on `http://localhost:3000` (`npm run dev`) — needs your inbox and Google account.

**Verify:** route-guard test passes; sign-up email arrives; email login, Google login, sign-out, forgot/update password all work locally against the VPS.

## Stage 4 — Data (replace Convex)

- [X]  4.1 Write failing tests for `lib/data/teams.ts` (list my teams incl. ones I joined, create, delete).
- [X]  4.2 Implement `lib/data/teams.ts`.
- [X]  4.3 Write failing tests for `lib/data/files.ts` (list, create, rename, archive, delete, save document, save whiteboard).
- [X]  4.4 Implement `lib/data/files.ts`.
- [X]  4.5 Write failing tests for `lib/data/invitations.ts` (send, list, cancel, accept, list members, remove member, change role).
- [X]  4.6 Implement `lib/data/invitations.ts`.
- [X]  4.7 Write failing tests for `lib/data/shares.ts` (create link, list, revoke, resolve token server-side incl. expired and revoked).
- [X]  4.8 Implement `lib/data/shares.ts`.
- [X]  4.9 Implement `lib/data/settings.ts` (get/upsert).
- [X]  4.10 Swap Convex in `app/page.tsx`. (Nothing to swap — it never used Convex.)
- [X]  4.11 Swap Convex in `app/dashboard/layout.tsx` and `page.tsx` (drop the manual "create user" call — the database trigger does it).
- [X]  4.12 Swap Convex in `SideNav.tsx`, `SideNavTop.tsx`, `FileList.tsx`.
- [X]  4.13 Swap Convex in `app/(routes)/teams/create/page.tsx`.
- [X]  4.14 Swap Convex in the workspace page (load file).
- [X]  4.15 Swap Convex in `Editor.tsx`. Kept the existing manual save trigger (button/shortcut); no autosave/debounce added — none existed before.
- [X]  4.16 Swap Convex in `WSCanvas.tsx`. Same: manual save kept.
- [X]  4.17 Swap Convex in `file-share-modal.tsx`. Links only (permission + optional expiry); per-email / public / team share types removed (not in schema).
- [X]  4.18 Swap Convex in `team-invitation-modal.tsx`. App sends no email: inviter copies the `/invite/<token>` link.
- [X]  4.19 Rebuild `/shared/[token]` as a server-resolved page (view / comment / edit by permission; edits go through a server route that re-checks the token). `comment` is read-only until comments exist. Saves: `PUT /api/shared/[token]` (5 MB cap).
- [X]  4.20 Add the missing `/invite/[token]` page (the modal already builds this link but no page exists) calling `accept_invitation`. Join is a button, not automatic on load.
- [X]  4.21 Swap Convex in `app/_hooks/useUserSettings.tsx`. (Nothing to swap — local storage only; `lib/data/settings.ts` unused until settings sync is wanted.)
- [X]  4.22 [User] (done by user 2026-10-22; `PUT /api/shared/<unknown token>` → 404 "Link not found", i.e. service-role lookup works) Put `SUPABASE_SERVICE_ROLE_KEY` (value of `SERVICE_ROLE_KEY` in `/opt/supabase/.env`) in local `.env.local` — the auto-mode safety check blocks Claude from copying the key. Without it `/shared/*` and `/api/shared/*` fail locally.
- [X]  4.23 (removed by Claude 2026-10-22 after user asked) Delete `/tmp/eraser-srk.env` on VPS `main` (`rm -f /tmp/eraser-srk.env`) — temp copy of the service-role key (mode 600) left when the copy was blocked; Claude's cleanup command was blocked too.
- [X]  4.24 [User] Signed-in smoke test against the VPS. Passed 2026-10-22 (user): create team, create file, save document + whiteboard, reload keeps changes, delete file; invitation created (shows as pending); edit share link opened and saved from another session.
- [ ]  4.25 [User] Postponed by user: accept the pending invite — copy the link from the invite window, sign in as the invited email (farazpawle@gmail.com), open it, click "Join team", confirm the team's files show. No email is sent by design (needs your second account).
- [ ]  4.26 [User] Postponed by user: revoke the share link in the share window, reopen it → "revoked" message (needs your browser session).
- [ ]  4.27 Fix the broken owner avatar in the team-invitation modal members list (Google photo shows alt text "Fara" instead of the image).

Ideas raised, not planned (ask the user before building): send invite emails from the app via the Supabase server's SMTP (currently the inviter copies the link).

Notes (2026-10-22):
- Data functions take the Supabase client as first argument (`lib/data/db.ts`); writes use `.select().single()` so an RLS-blocked write (viewer) errors instead of silently changing 0 rows. List of files skips `document`/`whiteboard`.
- `FILE` / `TEAM` types are now the database row shapes (`id`, `name`, `team_id`, `created_by` uuid, `created_at`/`updated_at` ISO strings); document/whiteboard are stored as JSON values, not strings.
- Checks: Jest 329/356 (39 new data tests pass; the 27 failures are the same pre-existing ones as Stage 3). tsc: no errors outside files deleted in Stage 5 and `Tests/*` (no `@types/jest`). Signed-out smoke test: all protected pages → login.

**Verify:** all data-module tests pass; every core screen loads and saves against the VPS database.

## Stage 5 — Cleanup

- [X]  5.1 Remove `useWorkspaceCollaboration` + `WorkspaceNotificationBar` from the workspace page. (Done early 2026-10-22: the bar's dialog imports `@radix-ui/react-scroll-area`, which isn't installed, so opening a file failed to compile.)
- [ ]  5.2 Remove `ConvexClientProvider` from `app/layout.tsx`; delete the file.
- [ ]  5.3 Delete `convex/` folder.
- [ ]  5.4 Delete collaboration extras: `app/_context/CollaborationContext.tsx`, `hooks/useWorkspaceCollaboration.ts`, `useRealTimeCollaboration.ts`, `useConflictAwareSave.ts`, `types/collaboration.ts`, `types/todos.ts`.
- [ ]  5.5 Delete collaboration UI: `components/ui/` live-cursors, comments-panel, notifications-panel, conflict-resolution-dialog, collaboration-toolbar, user-presence-indicator, workspace-notification-bar.
- [ ]  5.6 Delete admin extras: `app/admin/`, `components/AdminRouteGuard.tsx`, `hooks/useAdminAuth.ts`, `lib/adminAuth.ts`.
- [ ]  5.7 Delete placeholder page `app/dashboard/[userid]/page.tsx`.
- [ ]  5.8 Delete tests for removed code (`Tests/admin-auth`, `Tests/todos`, `Tests/webhook-system`).
- [X]  5.9 Update the Convex mock in `Tests/workspace-improvements/WorkspaceLoading.test.tsx`. (Now mocks `lib/data/files` + the Supabase client; also removed the Convex mock from `jest.setup.js`. Not run yet — waiting on the deletions.)
- [ ]  5.10 Uninstall `convex` and `@kinde-oss/kinde-auth-nextjs`.
- [ ]  5.11 Remove Convex/Kinde/ADMIN vars from local env; add `.env.example` with Supabase names only.
- [ ]  5.12 Rename route folder `wokspace` → `workspace`; update links; add redirect from the old path in `next.config.mjs`.
- [X]  5.13 Mark `Docs/REAL_TIME_COLLABORATION.md` as Phase 2 / not implemented.
- [ ]  5.14 Update `README.md` tech stack + setup steps. (Done except the `convex/` line in the project-structure block — that edit was blocked.)

Stage 5 progress (2026-10-22): done so far — layout no longer uses `ConvexClientProvider`; `/admin` removed from the login-required list (+ its test line); `.env.example` created; 5.9, 5.13 and most of 5.14. **Blocked, waiting for the user's yes:** every file/folder deletion (5.2 file, 5.3–5.8), uninstall (5.10), local env cleanup (5.11), folder rename (5.12). Note: `components/ui/scroll-area.tsx` imports an uninstalled package and is only used by the files being deleted — remove it with them.

**Verify:** `grep -ri "convex\|kinde"` in source returns nothing; `npm run build` passes.

## Stage 6 — Deploy (VPS)

- [ ]  6.1 Set `output: 'standalone'` in `next.config.mjs`.
- [ ]  6.2 Add multi-stage `Dockerfile` (Node LTS alpine, non-root user; `NEXT_PUBLIC_*` passed as build args because Next bakes them in at build time).
- [ ]  6.3 Add `docker-compose.prod.yml` binding `10.0.0.1:8091:3000` (Docker bridge gateway — reachable by NPM, not the internet).
- [ ]  6.4 Create `/opt/eraser/.env.prod` on the server (chmod 600): public Supabase URL, anon key, service-role key, `SITE_URL=https://eraser.garritwulf.com` (auth callback redirects).
- [ ]  6.5 Copy the app source to `/opt/eraser` on the VPS.
- [ ]  6.6 Build and start the container on the VPS.
- [ ]  6.7 [User] In Nginx Proxy Manager add `eraser.garritwulf.com` → `10.0.0.1:8091`, Let's Encrypt SSL (needs the NPM admin login) — or give me the login.

- [ ]  6.8 Add a public privacy policy page (`/privacy`) to the app — Google refuses to publish the OAuth app without a privacy policy link (Branding page otherwise complete; checked 2026-10-22).
- [ ]  6.9 [User] In Google Auth Platform → Branding, set privacy policy link `https://eraser.garritwulf.com/privacy`, then Audience → Publish app (needs your Google account). Until then only listed test users can use Google login.

**Verify:** `https://eraser.garritwulf.com` loads over HTTPS; `http://147.93.105.118:8091` not reachable from outside.

## Stage 7 — Final verification

- [ ]  7.1 `npx tsc --noEmit` passes.
- [ ]  7.2 `npm run lint` passes (causes fixed, not silenced).
- [ ]  7.3 `npm run build` passes.
- [ ]  7.4 `npm test` passes.
- [ ]  7.5 Browser smoke test on live URL: sign up by email, confirm, log in.
- [ ]  7.6 Browser smoke test: Google login, sign out, forgot password.
- [ ]  7.7 Browser smoke test: create team, create file, edit document + whiteboard, reload, changes kept.
- [ ]  7.8 Browser smoke test: invite second user, accept link, second user sees team files.
- [ ]  7.9 Browser smoke test: share link view + edit work; revoked and expired links refused.
- [ ]  7.10 Isolation check: an outside user cannot open a team file URL or read it via the REST API with their token.
- [ ]  7.11 Re-run Supabase advisors on the live database.
- [ ]  7.12 Self-review diff: no debug logs, no secrets, no dead imports, `service_role` only in server files.
- [ ]  7.13 [User] Try the app yourself and confirm it looks and feels right (human judgement).
- [ ]  7.14 Add the recurring project rules (Supabase keys, RLS-first, server-only service role) to the project `CLAUDE.md`.
- [ ]  7.15 Move plan + task file to `Plan/completed/`; write the Phase 2 plan.

## Implementation verification (acceptance)

- All "Done when" items in the plan are met.
- RLS test script and Jest suite are green; advisors report no issues.
- No Convex/Kinde code, packages or env vars remain; no secret file tracked in git.
- `service_role` key appears only in server-side code and server env files.
- Old Supabase keys rejected everywhere; Kinde secret deleted or rotated.
- App reachable only via HTTPS on `eraser.garritwulf.com`; Supabase only via `eraser-api.garritwulf.com`; Studio not public.
