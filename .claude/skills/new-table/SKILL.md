---
name: new-table
description: Adds a new table to the Eraser database the safe way - migration, row-level security, grants, RLS test and data helper. Use when asked to add or change a table.
disable-model-invocation: true
---

# Add a table

1. `npx supabase migration new <name>`; write the `create table` there. Never edit an existing migration.
2. In the same migration: `alter table ... enable row level security` and the policies. A table without policies is closed to everyone, which is the safe default.
3. Grants go to `authenticated` only, never `anon`. Look at `20261022120141_grants_and_indexes.sql` for the pattern; add indexes on columns used in policies and joins.
4. Add cases to `supabase/tests/rls.sql` (owner allowed, outsider refused, anonymous refused) using its `rls_test.check` / `rls_test.refused` helpers.
5. Add query functions in `lib/data/<topic>.ts`: the Supabase client is the first argument, use `unwrap` from `lib/data/db.ts`.
6. Apply and regenerate `types/database.ts` with the `eraser-supabase-db` skill (ask the user before touching the live database).
