# Project rules

- Login and data go through Supabase only (Convex and Kinde are removed; do not reintroduce them). Use `lib/supabase/{client,server,admin}.ts` for clients and `lib/data/*` for queries (the Supabase client is passed in as the first argument).
- Row-level security on every table, enabled in the table's own migration. Grants go to `authenticated` only, never `anon`.
- `SUPABASE_SERVICE_ROLE_KEY` is used only in server code through `lib/supabase/admin.ts` (`server-only`). Never prefix it `NEXT_PUBLIC_`, never commit it. Only `.env.example` is tracked.
- Schema changes are new migration files in `supabase/migrations/` (`npx supabase migration new`); never edit a migration already applied. Run `supabase/tests/rls.sql` before applying.
- Checks: `npx tsc --noEmit`, `npm test`, `npm run build`. ESLint is not configured yet (`npm run lint` only asks to set it up).
- Live database access and applying migrations: use the `eraser-supabase-db` skill. Deploying the app to the VPS: use the `eraser-deploy` skill.
- The canvas is Excalidraw only (no React Flow or tldraw). A typed diagram is an Excalidraw frame with `customData.kind = "diagram"` holding its code; parsing, layout (ELK) and element generation live in `lib/diagram/` as pure TypeScript with no React or DOM imports. See `Plan/redesign-eraser-canvas-plan.md`.
- Browser-only libraries (Editor.js, Excalidraw) are loaded with `next/dynamic` and `ssr: false`; importing them normally crashes server rendering. Server-side Supabase clients send requests with `cache: 'no-store'` so Next.js never serves stale rows.
- One topic per skill in `.claude/skills/`; create a new small skill when a task needs knowledge that fits none of them.
