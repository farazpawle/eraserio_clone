---
name: eraser-supabase-db
description: Runs SQL and applies schema migrations on the live Eraser database (self-hosted Supabase on the VPS `main`, /opt/supabase). Use for any task that reads or changes the live database or adds a migration.
---

# Eraser database (VPS `main`)

Reach the server with the `ssh-vps` MCP tools. Ask the user before changing the live database.

- The app database is `supabase` (`POSTGRES_DB`), not `postgres` (`postgres` has no `auth` schema).
- Run SQL as `postgres` so it owns the tables: `docker exec -i supabase-db psql -U postgres -d supabase`.
- The database listens only on `127.0.0.1:5435` inside the server; the PC cannot reach it directly.

## Applying a schema change

1. `npx supabase migration new <name>` and write the SQL.
2. Test on the local database (`npx supabase db start`, Postgres 15) and run `supabase/tests/rls.sql` against it.
3. Upload the file, apply it on the VPS in its own transaction, and record it in `supabase_migrations.schema_migrations`.
4. Run `rls.sql` on the VPS inside a transaction that rolls back, then regenerate `types/database.ts`.
