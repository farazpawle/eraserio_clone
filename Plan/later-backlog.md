---
Title: Later backlog — features agreed for after the redesign
Description: Features the user deliberately postponed on 2026-10-23 while planning the Graphite redesign and Eraser-style canvas, so they are
  not forgotten. The two agreed ones are live collaboration and AI diagrams. The rest are gaps found while planning: plan limits and payments,
  comments, version history, diagram embeds in the document, marketing pages and smaller items. Each lists why it waits, what it needs and
  the open questions for the user. Turn an item into its own plan before building it.
Status: Parked
Updated: 2026-10-23
---

# Later backlog

Parent plan: `Plan/redesign-eraser-canvas-plan.md`. Each item becomes its own plan and task file in `Plan/` when it is picked up.

## 1. Live collaboration (agreed with the user: after the editor)

- **What:** several people edit the same file at the same time, with live cursors, name tags, the avatar row in the header showing who is here, and shapes and text appearing instantly.
- **Why it waits:** it is the largest and riskiest piece, and it needs the new editor to be stable first.
- **Ready for it already:** the canvas stays a plain list of Excalidraw elements in `files.whiteboard`. Each element carries `version` and `versionNonce`, which Excalidraw's own `reconcileElements` merges. A typed diagram is one frame whose code is the source of truth, so two people changing one diagram resolve as "last code wins" for that diagram only.
- **Likely approach (confirm when planning):**
  - Supabase Realtime Broadcast carries element changes and pointer positions.
  - Realtime Presence shows who is here.
  - The database keeps the saved copy.
  - The document pane needs its own approach: Editor.js has no live merging, so this means a different editor or block-level locking.
- **Open questions for the user:** maximum people per file? Must the document pane be live too, or only the canvas? Is a "following" mode (watch someone's view) needed?
- **Old code to look at, not reuse:** the removed Convex collaboration code in git history (`convex/liveCursors.ts`, `convex/userPresence.ts`, `hooks/useRealTimeCollaboration.ts`) shows the earlier feature set.

## 2. AI diagrams (agreed with the user: later stage)

- **What:** "describe it, get a diagram". The user types a sentence, AI writes the diagram code, and the diagram appears and can be edited like any other.
- **Why it waits:** it builds on the diagram text language from Stage 2, needs an AI service account, and has running costs.
- **Approach:**
  - The AI returns diagram code, never raw shapes.
  - Our parser checks that code; if it has errors, they go back to the model for one or two fix attempts, and only then is anything drawn.
  - The API key stays in server-only env through a server route, never `NEXT_PUBLIC_`.
  - Each user gets a rate limit and a monthly cap.
- **Open questions for the user:** which AI provider (recommend Claude, latest model), who pays (included in paid plans or not), monthly limit per user, and whether to add "explain this diagram" and "update the diagram from the document".

## 3. Plan limits and payments

- **What:** a real free-plan limit (the prototype's "3 of 5 free files"), an Upgrade button that works, and paid plans that match the landing page's pricing.
- **Why it waits:** no limit or payment logic exists today. Stage 7 shows a plain file count, and Stage 9 shows prices that the user confirms.
- **Open questions:** payment provider (for example Stripe or Paddle), the plan limits, and what happens to files over the limit after a downgrade.

## 4. Comments on files and diagram shapes

- **What:** threaded comments pinned to a spot on the canvas or a paragraph in the document, with notifications.
- **Why it waits:** the old Convex version was removed in the Supabase move, and it overlaps with live collaboration (item 1).
- **Needs:** a new `comments` table with RLS, plus a notifications design.

## 5. Version history

- **What:** see and restore earlier versions of a file (the clock icon in the Blueprint prototype's rail).
- **Needs:** a `file_versions` table (a snapshot on save, thinned over time) with RLS, plus a restore flow.
- **Open question:** how long to keep versions per plan.

## 6. Diagrams inside the document

- **What:** embed a canvas diagram in the document pane (Eraser does this), so the document shows a live picture of the diagram.
- **Why it waits:** it needs the Stage 2 diagram block. Editor.js needs a custom block that renders a diagram frame read-only.

## 7. Marketing and help pages

- **What:** the Docs, Changelog, About, Careers, Contact and Terms pages linked from the landing page and footer (placeholder links in the prototype).
- **Why it waits:** these are content work, not app work. The Terms page also needs legal text from the user.

## 8. Smaller items

- **Real logo and brand:** the prototype logo is a placeholder mark. The name Draftboard is confirmed, but a domain and logo are still to come.
- **ESLint:** it is not configured yet (`npm run lint` only asks to set it up). Add it before the codebase grows further.
- **Prototype skill lessons:** two lessons from the prototype build are waiting for the user's yes:
  - a reduced-motion rule fails when the animation class is on `<html>`;
  - don't name a page-picker switch "Screen" next to the size switch.

## 9. Next.js major upgrade (found during stage 0, 2026-10-24)

- **What:** move the app from Next.js 14.2.x to 15 or 16.
- **Why it waits:** stage 0 only budgeted a 14.2.x patch bump (it fixes the one CVE the task named, CVE-2025-29927). An `npm audit` run during that bump found several unpatched critical and high Next.js holes with no 14.2.x fix, including two remote-code-execution bugs (one through the image-optimization API, one specific to Windows-hosted servers like this app's VPS) and a handful of denial-of-service and cache-poisoning issues. The fix for all of them is Next 15.5.28+ or 16.4.3+, which is a breaking major upgrade (async request APIs, React 19, and every library that depends on Next/React), too large to fit inside "foundations."
- **Needs:** its own plan and task file; expect middleware and data-fetching rewrites, a React 19 bump, and a compatibility pass on Excalidraw, Radix and the Supabase SSR client.
- **Open question for the user:** when to schedule it — given the severity (critical RCEs), recommend treating it as the next plan after this redesign ships, not left indefinite.

## How to use this file

When an item is picked up, write its plan with the writing-plans and plan-files skills. Then mark it here as `Planned → Plan/<file>.md`, and delete the entry once it ships.
