# Equiply

**IT asset and employee operations for a growing SaaS startup.** One workspace where an IT admin can see what hardware the company owns, who holds what, what a new hire still needs, and what a leaver still has to hand back.

> Frontend-only exercise: React + TypeScript with a simulated API. No backend, no auth.

---

## The problem

At a 100–200 person startup, the IT person usually tracks laptops in a spreadsheet and Slack threads. Questions that sound simple take a lot of digging:

- *Which MacBooks are actually free right now?*
- *Mei starts on Thursday. Does she have a laptop yet?*
- *James leaves Friday. What does he still have?*
- *Which warranties lapse this month?*

Spreadsheets drift because every change touches several things at once. Assigning a laptop changes the laptop, the person, and the history. When those are edited by hand they disagree, and nobody notices until someone is missing a laptop on day one.

**Equiply's core promise:** an admin can see the hardware situation, assign equipment, and recover it from leavers, without the data ever contradicting itself.

## Intended user

A **centralized IT administrator** (the seed data's admin is *Jordan Lee*) who opens the app daily. They are comfortable with dense, data-heavy tools and care about speed and certainty more than hand-holding. The design follows from that: compact tables, the next lifecycle action one click away, every screen linkable, and no state that can go wrong without them seeing it.

---

## What's built (P0)

| Area | What you can do |
| --- | --- |
| **Overview** | Seven metrics, all derived from live data and each linking to its filtered view. A *Needs attention* list: equipment to recover, joiners to prepare, warranties ending within 30 days, assets in repair. Recent activity. |
| **Assets** | Search by name, tag, serial, or the holder's name. Each row shows manufacturer and model under the name. Filter by status (chips with counts), category, and condition. Sort by tag, purchase date, or warranty, from column headers or a sort menu on small screens. Paginated. All of it lives in the URL. |
| **Asset drawer** | Opens from `?asset=<id>` over **any** page. Shows identity, condition, purchase, warranty (with days left), current holder, assignment history, and activity timeline. Offers only the actions the lifecycle allows: Assign · Return · Mark under repair · Mark available · Edit · Retire. |
| **Add / edit asset** | Validated form. Tags are generated (`EQ-LAP-0054`). Duplicate serials are rejected, ignoring case and whitespace. Validation errors focus the first bad field. A new asset opens in the drawer straight away. |
| **Employees** | Directory with search (name, email, ID), department and status filters, and joining-date sort. Detail page: current hardware (return in place), assignment history, activity, onboarding checklist status, offboarding banner. **Assign** is disabled with the reason when the person can't receive assets. |
| **Assign / return** | One dialog for both directions: pick a person for an asset, or an asset for a person. Only eligible options are listed. Returns record the condition, and a *Damaged* return goes straight to repair. |
| **Onboarding / Offboarding** | Read-only queues: equipment progress per incoming hire, and outstanding returns per leaver. Rows link to where the work happens. |
| **Activity log** | Every mutation, grouped by day. Each entry links to its asset or person. |
| **Shell** | Collapsible sidebar (remembered) with live counts, breadcrumbs, a global search combobox (`/` to focus), a notifications bell built from the same attention items, and an off-canvas nav on mobile. |

**States everywhere:** skeletons while loading, an error state with retry, empty states with a way out (*Clear filters*), button spinners during writes, success toasts, and errors shown inline in the dialog that caused them.

> Try the error state with `/?simulate=load-error`, or make the next write fail with `/?simulate=mutation-error`.

## Not built yet (P1), with the hooks in place

- **Guided onboarding / offboarding workflows.** The domain operations (`initiateOnboarding`, `completeOnboarding`, `initiateOffboarding`, `processAssetReturn`, `completeOffboarding`) are **implemented and tested**. Only the step-by-step UI is missing. Returns recorded today already tick the offboarding checklist.
- **Asset distribution chart** (category × assigned/available).
- **Activity log filters** (type, date, entity).
- **Advanced table features** (multi-sort, page-size control, column visibility).

---

## Architecture

```
src/
  app/            Router, route table, root layout, paths (URL helpers)
  components/
    ui/           Design-system primitives: Button, Modal (native <dialog>), Field, Badge, ChipGroup, toasts…
    data-display/ DataTable, Pagination, status badges
    layout/       App shell: sidebar, top bar, global search, loading/error gate
  domain/         ★ Business rules: pure functions, no React
  services/       Simulated API: mock server (latency, failures) + asset/workspace services
  store/          Client cache: Context + useReducer, actions, useMutation
  features/       dashboard · assets · employees · onboarding · offboarding · activity
  hooks/          useUrlState, useAssetDrawer, useLocalStorageState, …
  mocks/          Deterministic seed data
  types/          Domain model
  utils/          Dates (Intl, timezone-safe), formatting, URL params
```

### Data flow

```
 UI event ─▶ useWorkspaceActions().assignAsset(id, emp)
              │
              ▼
        assetService.assign()        ── simulated network: 350–700 ms, can fail
              │
              ▼
        mockServer.write(data => assignAsset(data, input, ctx))
              │            └── domain/ pure function: validates rules, updates asset +
              │                assignment + offboarding item, appends activity
              ▼
        updated WorkspaceData ─▶ dispatch({ type: 'replace' }) ─▶ every view re-derives
```

**Four layers, each testable on its own:**

1. **Domain (`src/domain`)** is the heart. Every business rule is one pure function, `(data, input, ctx) => data`. They throw a `DomainError` with an admin-readable message. `ctx` carries the clock, the actor, and an id generator, so tests are deterministic. The UI never re-implements a rule: buttons come from `getAssetActions(asset)`, eligible people from `canReceiveAssets(employee)`, and the form from the same `validateAssetInput` the server runs.
2. **Services (`src/services`)** form the API surface. A mock server holds the "database", adds latency, and can fail on demand. Services run domain operations against it and respond with the updated workspace. Swapping in a real backend only changes this layer.
3. **Store (`src/store`)** is a client-side cache: `useReducer` with a discriminated `status` union (`loading | ready | error`), so `data` can't be read half-loaded. Actions live in a **separate, stable context**, so components that only trigger writes don't re-render on data changes.
4. **Features** read through selectors and keep view state (filters, sort, page, open drawer) **in the URL** via `useUrlState`. Views are shareable, survive refresh, and work with Back.

### Data model

| Entity | Notes |
| --- | --- |
| `Asset` | Spec fields. `status` changes only through lifecycle operations, never through Edit. |
| `Employee` | Spec fields. `status`: Active · Onboarding · Offboarding · Inactive. |
| `AssetAssignment` | `assetId`, `employeeId`, `assignedAt`, `returnedAt?`, `assignedDuring` (onboarding/manual), `returnCondition?`. **History is never deleted.** |
| `Activity` | Spec fields, plus an optional `related` entity, so an assignment shows on both the asset's and the person's timeline. |
| `OnboardingRecord` | Start date and checklist. **Progress is derived** from current assignments, so an asset assigned from any screen counts. |
| `OffboardingRecord` | Last working day and per-asset items (`Pending Return · Returned · Damaged on Return`). |

**Asset lifecycle**, the table behind `getAssetActions` and every operation:

```
Available ──assign──▶ Assigned ──return (ok)──────▶ Available
    │                    └──────return (damaged)──▶ Under Repair ──mark available──▶ Available
    ├──mark under repair──▶ Under Repair
    └── any non-retired ──retire──▶ Retired (terminal; an active assignment is closed, not lost)
```

**Consistency is checked, not hoped for.** `findInvariantViolations(data)` encodes what "consistent" means. For example: an Assigned asset has exactly one open assignment that matches its holder; nothing Available is Damaged; pending offboarding items are still held by that person. Tests assert it returns `[]` after every operation and on the seed data.

---

## Key technical decisions

| Decision | Why | Tradeoff |
| --- | --- | --- |
| **Pure domain functions + `DomainError`** | Rules live in one place, are trivially unit-testable, and compose (`processAssetReturn` delegates to `returnAsset`). | Exceptions instead of Result types; composition is simpler, but callers need try/catch. `useMutation` turns them into `{ ok, error }` so UI code can't leak a rejection. |
| **Server returns the whole workspace** | Atomic multi-entity updates (asset + assignment + checklist + activity) with no cache-patching code. | Fine at ~50 assets. At real scale I'd return changed entities and patch, or move to TanStack Query with targeted invalidation. |
| **Context + `useReducer`, two contexts** | Small app, single source of truth, no dependency. The split keeps write-only components from re-rendering. | No selectors with memoised subscriptions (Redux/Zustand). Every consumer of data re-renders on change; acceptable at this size. |
| **URL as view state** | Shareable filtered views ("show me everything under repair"), dashboard metrics link to them, Back works, drawer is linkable. | Slightly more code than `useState`. `replace: true` keeps typing out of history. React Router applies URL updates in a transition, so search boxes are uncontrolled (otherwise the caret jumps). Clearing filters remounts them. |
| **Native `<dialog>` for modals and drawers** | `showModal()` gives a real focus trap, inert background, Escape, and top-layer stacking (a dialog over the drawer) with no library. Focus returns to the opener on close, or into the surrounding drawer if the opener is gone. | Everything outside the top modal is inert, so toasts render *inside* the topmost open dialog (`useTopLayerHost`), not in `<body>`. Needs a small jsdom polyfill in tests. |
| **Seed data relative to "today"** | Deterministic (a pure function of the date, no randomness), but warranties are always "ending soon" and joiners always "starting Thursday", whenever the demo runs. | Dates in screenshots change day to day. |
| **No date library** | `Intl` covers formatting. Date-only strings are parsed as **local** dates (tests run in `America/Los_Angeles` to catch the UTC off-by-one). | A little hand-written date code. |
| **Hand-rolled `DataTable` instead of TanStack Table** | P0 needs sort, pagination, and responsive columns; filtering lives in pure, tested functions. Fewer dependencies, and it's easy to walk through in an interview. | TanStack would earn its place with column resizing, virtualisation, or multi-sort (P1+). |

### Libraries

| | Why |
| --- | --- |
| React 19, TypeScript (strict, `noUncheckedIndexedAccess`) | Requirement; strict types catch missing-entity bugs at compile time. |
| Vite 8 | Fast dev server and build; zero config for TS. |
| Tailwind CSS 4 | Design tokens in one `@theme` block (one accent colour), no CSS files to keep in sync. |
| React Router 7 (data router) | Route `handle`s drive breadcrumbs; memory router makes integration tests use the real route table. Pinned to v7 because v8 had just been released. |
| lucide-react | Consistent, tree-shakeable icons. |
| Vitest + Testing Library + user-event | Same config as Vite; tests query by role and label, which doubles as an accessibility check. |
| ESLint + `jsx-a11y` + `react-hooks` | Lint-time accessibility and hook-correctness checks. TypeScript is pinned to 6.0 because `typescript-eslint` doesn't support TS 7 yet. |

---

## Accessibility & responsiveness

- Landmarks, a skip link, a breadcrumb `nav`, `aria-current` on navigation.
- Tables have captions, `scope="col"`, `aria-sort`, and sort buttons. The asset or employee name is a real link (row click is only a mouse shortcut).
- Form fields wire `aria-invalid` and `aria-describedby` to their error or hint. A failed submit focuses the first invalid field.
- Status is always text (badges include the word); colour only reinforces it.
- Global search is an ARIA combobox (`aria-activedescendant`, arrow keys, Enter, Escape).
- Toasts: a polite live region, rendered inside the topmost open dialog so a modal drawer never hides them or makes them inert.
- Respects `prefers-reduced-motion`.
- Desktop-first, checked down to 375px: columns drop by breakpoint, row actions move into the drawer on phones, the sidebar becomes an off-canvas dialog. No page-level horizontal scroll.

## Testing

```bash
npm test          # 100 tests: domain rules, invariants, seed, selectors, URL state, components, integration
```

- **Domain:** every rule in the spec's test list, plus edge cases. For example, retiring an assigned asset keeps its history, a return recorded from the drawer updates the offboarding checklist, and lifecycle fields smuggled into an edit are ignored.
- **Seed:** minimum counts, invariants, determinism, every spec edge case present, still fresh when run on a later date.
- **Integration:** the real app rendered at a URL. Add an asset and see it in the table, assign from the drawer, return damaged, unknown ids show not-found, offboarding blocks new assignments.

## Assumptions

- **Total assets** excludes retired ones (shown as a hint). **Employees** excludes people who have left.
- People **being offboarded** can't receive new hardware, a stricter reading of rule 9, since the goal is recovery.
- A **new asset entered as Damaged** goes straight to *Under Repair*. Editing an Available asset to *Damaged* is refused; use *Mark under repair* instead.
- **Retire** isn't offered while an asset is pending return on an open offboarding (the drawer says why). Record the return first, so the checklist never points at a retired asset.
- Tags carry a global sequence number, so sorting by tag means "order added". A tag is permanent: changing an asset's category in Edit keeps its original tag.
- No persistence: a reload re-seeds the data. That's intentional for a demo. Production would persist via the API, and `localStorage` would be the wrong store for shared records.

## What I'd do next

1. **P1 workflows:** guided onboarding (pick assets per checklist row, review, confirm, complete) and offboarding (initiate, mark each return, complete). The domain operations are ready.
2. **Distribution chart** on the overview, and **activity filters**.
3. **Server-state library** (TanStack Query) once there's a real API: per-entity queries, optimistic updates with rollback, background refresh.
4. **Scale:** paginate or virtualise employees and activity (fine at 21 people and 39 events, not at 2,000); index lookups by id.
5. **E2E tests** (Playwright) for the assign → return → dashboard flow and keyboard-only navigation, plus axe checks in CI.
6. **Bulk actions** (assign a standard kit), CSV import of existing spreadsheets, warranty alerts by email.

---

## Setup

```bash
npm install
npm run dev        # http://localhost:5173
npm test
npm run build      # typecheck + production build
npm run lint
```

Requires Node 20.19+ or 22.12+ (Vite 8).
