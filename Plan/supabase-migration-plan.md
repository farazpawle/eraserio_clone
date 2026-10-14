---
Title: Move Eraser clone from Convex + Kinde to self-hosted Supabase (Phase 1: core)
Description: Replace Convex (database/backend) and Kinde (login) with the self-hosted Supabase on the "main" VPS, and host the Next.js app on the same VPS.
  Decisions: start fresh (Convex data is test data, not migrated); login = email+password and Google; Phase 1 moves only the working core
  (login, teams, invites, files, document + whiteboard saving, sharing, settings) and makes it secure; the half-built extras (cursors, presence,
  comments, notifications, conflicts, todos, webhooks, admin) are removed now and rebuilt in a later Phase 2 plan.
  Approach: rotate leaked keys first, Postgres schema keyed by user UUID with RLS, @supabase/ssr for sessions, server-side share-link checks,
  Docker deploy behind Nginx Proxy Manager. Tasks: Plan/supabase-migration-tasks.md.
Status: Draft — awaiting user approval
Updated: 2026-10-14
---

# Supabase migration — Phase 1 (core)

## 1. Why

- Convex backend has **no authorization**: every function trusts an email/id sent by the browser, so anyone can read, edit or delete any file by id.
- Convex is never told who is logged in (no auth provider wiring), and Kinde users live outside the database, so ownership is keyed by a mix of email, Kinde id and `'anonymous'`.
- Share and invite tokens use `Math.random()` (guessable).
- Admin/webhook code uses a hard-coded password (`admin123`) shipped to the browser.
- One self-hosted Supabase gives database, login, realtime and file storage in one place, under the user's control.

## 2. Decisions (agreed with the user, 2026-10-14)

| Topic | Decision |
|---|---|
| Existing Convex data | Not migrated — all test data. Fresh start. |
| Login methods | Email + password (with confirmation email) and Google. |
| Scope | Phase 1 = working core only. Extras removed now, rebuilt in Phase 2. |
| Hosting | App and Supabase both on the "main" VPS (`147.93.105.118`), TLS via the existing Nginx Proxy Manager. |
| Supabase instance | The existing stack in `/opt/supabase`, already wiped empty on 2026-10-14 (Schematiq moved to supabase.com cloud and is closed). |

## 3. Current state (from code inventory, 2026-10-14)

- **Next.js 14.2.3 / React 18 / TypeScript**, Tailwind + Radix, Editor.js, Excalidraw 0.17.6, Jest 30.
- `app/ConvexClientProvider.tsx` mounts `ConvexProvider` (no auth). Reads are mostly one-shot `useConvex().query()` in `useEffect`; some `useQuery`.
- Kinde: `app/api/auth/[kindeAuth]/route.js`, `middleware.ts` (matcher misses `/wokspace/*` and `/dashboard/*` sub-paths), `useKindeBrowserClient` in ~15 files.
- Core Convex tables: `users, teams, teamMembers, teamInvitations, files (document + whiteboard as JSON strings), fileShares, userSettings`.
- Extras (mostly untracked in git, not mounted in the UI): `comments, conflictResolution, liveCursors, userPresence, notifications, todos, webhookSettings, webhookDeliveries`, `app/admin/*`, `CollaborationContext`, `hooks/*`, several `components/ui/*` panels.
- Kinde/Convex are also used by the landing page (`app/page.tsx`, `app/_components/Header.tsx` Login/Register links), not only the dashboard.
- The invite modal builds `/invite/<token>` links, but **no `/invite` page exists** — invites are broken today.
- `app/dashboard/[userid]/page.tsx` is a placeholder ("user page").
- **`.env` is tracked in git and pushed to the public GitHub repo** (commit `726ccf3`) with a real Kinde client secret.
- Supabase on VPS: `/opt/supabase` (Postgres 15.8, GoTrue v2.189, Realtime v2.102, Storage + MinIO, Kong on `127.0.0.1:8000`, Studio internal, plus custom `platform-mock` / `temp-key-service` containers). SMTP already set to Brevo.
  Still configured for `schematiq.garritwulf.com`. Its keys exist in old Schematiq env files, are **hard-coded** in `docker-compose.yml` (~line 408) and `volumes/api/kong.yml`, and the JWT secret is also stored in the Realtime tenant rows (`_realtime.tenants`). Only the stopped Schematiq containers use this Supabase, so rotating keys breaks nothing live.

## 4. Target architecture

```
Browser ──https──> eraser.garritwulf.com ──NPM──> eraser-web (Next.js, standalone Docker, bound to 10.0.0.1)
   │                                                   │ server components / route handlers / middleware
   └─https──> eraser-api.garritwulf.com ──NPM──> supabase-kong:8000 ──> auth / rest / realtime / storage
                                                       │
                                               supabase-db (Postgres, RLS on every table)
```

- Browser talks to Supabase directly with the **anon key**; Row Level Security decides what each user can see.
- **service_role key only on the server** (share-link resolution, never `NEXT_PUBLIC_`).
- Sessions in cookies via `@supabase/ssr`; `middleware.ts` refreshes the session with `auth.getClaims()` and guards routes.
- Browser **and** server use the same public URL (`https://eraser-api.garritwulf.com`): `@supabase/ssr` names its cookie after the URL, so an internal URL on the server would not see the browser's login.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are baked in at build time, so the Docker build receives them as build args.
- Studio stays internal (reach it through an SSH tunnel), never published.

## 5. Data model (Postgres, `public` schema, all RLS-enabled)

| Table | Key columns | Notes |
|---|---|---|
| `profiles` | `id uuid PK → auth.users`, `email`, `full_name`, `avatar_url` | Filled by trigger on sign-up (email + Google). |
| `teams` | `id`, `name`, `created_by uuid`, `archived`, `created_at` | Creator auto-added as `owner` by trigger. |
| `team_members` | `team_id`, `user_id`, `role` (owner/admin/member/viewer), `joined_at`, `invited_by` | PK `(team_id, user_id)`. |
| `team_invitations` | `id`, `team_id`, `email`, `role`, `token` (32-byte random), `status`, `expires_at` | Accepted via `public.accept_invitation(token)`: security definer, granted to `authenticated` only, checks the caller's email matches, not expired, not used. Invite link is copied and sent by the inviter (same as today); invite emails are Phase 2. |
| `files` | `id`, `team_id`, `name`, `created_by`, `archived`, `document jsonb`, `whiteboard jsonb`, `updated_at` | `updated_at` set by trigger. |
| `file_shares` | `id`, `file_id`, `created_by`, `token`, `permission` (view/comment/edit), `expires_at`, `is_active` | Link shares. |
| `user_settings` | `user_id PK`, `theme`, `keyboard_shortcuts jsonb`, `preferences jsonb` | Owner-only. |

**Access rules (RLS):**
- Helper functions `private.is_team_member(team_id)` / `private.team_role(team_id)` (`SECURITY DEFINER`, in a non-exposed `private` schema, `auth.uid()` checks, `search_path` pinned) to avoid recursive policies.
- Users read their own profile and their teammates' profiles (needed for member lists); nobody else's.
- Team members read team + files; `member`+ write files; `viewer` read-only; `owner/admin` manage members, invites and shares.
- UPDATE policies always have both `USING` and `WITH CHECK`; every policy is `TO authenticated` plus an ownership/membership predicate.
- Share links: the `/shared/[token]` page resolves the token **on the server** (service role), checks `is_active` + `expires_at`, then serves the file with the link's permission; edits through a share link go through a server route that re-checks the token. Login still required to open a link (same as today).
- Tokens: `encode(gen_random_bytes(32), 'hex')`.

## 6. Phases & stages

**Stage 0 — Safety and git hygiene**: new branch; stop tracking `.env` and keep other secret files (`script.ps1`, `.vscode/memories.db`) out of git; snapshot-commit all current work so deleting the extras is recoverable; user deletes/rotates the leaked Kinde secret.

**Stage 1 — Supabase server setup (VPS)**: rotate JWT secret + anon/service keys everywhere they live (`.env`, hard-coded copies in compose + `kong.yml`, Realtime tenant rows); point site/API URLs to the new subdomains; enable Google; set redirect URLs; connect NPM to Supabase's network; create the `eraser-api` proxy host with TLS.

**Stage 2 — Database**: SQL migrations in `supabase/migrations/` (tables, triggers, helpers, invitation RPC, RLS, grants, indexes). The VPS is the only database (no live users yet, and no local Docker stack assumed), so migrations are applied there over SSH, one transaction each, recorded in `supabase_migrations.schema_migrations`. Prove RLS with a two-user test script; run advisors.

**Stage 3 — App login (replace Kinde)**: install `@supabase/supabase-js` + `@supabase/ssr` (pinned); client helpers; new `middleware.ts`; login, sign-up, forgot-password and update-password pages; Google button; auth callback route; sign-out; swap Kinde in every file including the landing page and its header.

**Stage 4 — App data (replace Convex)**: one small data module per feature (`lib/data/teams.ts`, `files.ts`, `shares.ts`, `invitations.ts`, `settings.ts`); swap every Convex call file by file; debounced document/whiteboard saving; rebuild the share page; add the missing invite page.

**Stage 5 — Cleanup**: unhook collaboration from the workspace page; remove Convex, Kinde, `convex/`, the unmounted extras, admin pages, placeholder page and their tests; `.env.example`; rename `wokspace` → `workspace` with a redirect.

**Stage 6 — Deploy**: Dockerfile (Next standalone, public env as build args); compose file bound to the Docker bridge gateway (`10.0.0.1:8091`); env file on the server only; NPM host `eraser.garritwulf.com` with TLS.

**Stage 7 — Verify**: type check, lint, build, tests, browser smoke test of every core flow on the live URL, security re-check.

**Phase 2 (separate plan, later)**: presence + live cursors with Realtime Presence/Broadcast (no DB writes per mouse move), comments, notifications, todos, admin with roles in `app_metadata`, webhooks via database webhooks, optional real-time co-editing, whiteboard images to Storage.

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Deleting untracked extras loses work | Stage 0 commits everything to a branch first. |
| Kinde secret public on GitHub | Untrack `.env` in Stage 0; user deletes/rotates the Kinde app. History rewrite not needed once the secret is dead. |
| Leaked old Supabase keys (Schematiq env files, MCP config) | Rotate JWT secret + regenerate keys in Stage 1, including hard-coded copies and Realtime tenant rows. |
| Self-hosted stack has custom fixes (platform-mock, temp-key-service, Realtime patches) that may not survive a recreate | Back up every config file first; check each container and a Realtime connection after `up -d`; restore backups if broken. |
| Server and browser using different Supabase URLs log users out | Both use the public `eraser-api` URL. |
| RLS mistakes expose other users' files | Two-user RLS test script + Supabase advisors before any UI work. |
| Large whiteboards (base64 images) | `jsonb` has no 1 MB limit; move images to Storage in Phase 2. |
| Self-hosted Supabase may not support new publishable keys / asymmetric JWT | Use anon/service_role keys; `getClaims()` falls back to a server check with symmetric keys — acceptable. Verify against installed versions at Stage 1. |
| VPS has 4 cores and shared load (n8n, other sites) | Fine for a small team; watch memory after deploy; move to own server if traffic grows. |
| Google login setup needs a Google Cloud account | `[User]` task with exact steps. |
| Library APIs change | Check Supabase changelog + docs against installed versions before Stage 1 and Stage 3. |

## 8. Done when

- A new user can sign up with email (confirmation email arrives) or Google, create a team, create a file, edit the document and whiteboard, reload and see changes, invite a teammate who accepts, and share a link with view/edit permission that works and expires.
- A second user **cannot** see or change the first user's files by any route or direct API call.
- No Convex or Kinde code or package remains; build, lint, type check and tests pass; the app runs at `https://eraser.garritwulf.com`.
