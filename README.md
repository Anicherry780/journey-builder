# Journey Builder — Prefill Mapping UI

A React + TypeScript app for viewing and editing prefill mappings between forms in a DAG-based workflow.

---

## Highlights at a glance

- **Layered architecture** — 5 clean layers (`api → lib → state → datasources → components`), each replaceable in isolation.
- **Plugin-first data sources** — every data source implements a tiny `DataSource` interface and registers via a React Context provider, so adding a new source is **one new file plus one line**.
- **DAG-aware UI** — forms are grouped by topological level (Root → Level 1 → 2 …), alphabetised within each level, so prerequisites are always visible before dependents.
- **Stable mapping model** — mappings store `sourceNodeId` + `sourceFieldKey`, never display labels. Renaming a form is reflected immediately; deleted-source mappings are automatically flagged as stale.
- **Compatibility filtering** — sources can declare an `isCompatible(target, candidate)` predicate so type-incompatible candidates are hidden from the picker.
- **Persistent state** — mappings auto-save to `sessionStorage`; refresh keeps your work for the duration of the tab.
- **Testing depth** — 45 tests across 8 files, covering pure DAG traversal, the reducer, every data source, the registry, the form-list component, and a full happy-path integration test (load → select → open modal → save → clear → reload, then rehydrate).
- **Accessible by default** — modal uses `role="dialog"` + `aria-modal`, Esc closes, autofocused search, accessible backdrop close button, `aria-pressed` on form-list buttons.
- **CI-ready** — `npm run ci` runs typecheck + ESLint + Vitest in one shot.

---

## Running locally

**1. Start the mock API server**

```bash
git clone https://github.com/mosaic-avantos/frontendchallengeserver
cd frontendchallengeserver
npm install
npm start
```

The server runs on `http://localhost:3000`.

**2. Start the app**

```bash
cd journey-builder
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check + production bundle |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest in watch mode |
| `npm run lint` | ESLint over `src/**` |
| `npm run format` | Prettier write |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run ci` | typecheck → lint → test |

## Configuration

The API base URL, tenant ID, and blueprint ID are env-driven. Copy `.env.example` to `.env` to override the defaults.

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3000` | Base URL of the API |
| `VITE_TENANT_ID` | `1` | Tenant ID |
| `VITE_BLUEPRINT_ID` | `bp_01jk766tckfwx84xjcxazggzyc` | Blueprint ID |
| `VITE_BLUEPRINT_VERSION_ID` | (unset) | Set this to target the production endpoint, which requires a version segment. Leave unset for the mock server. |

---

## How it works

- The app fetches the blueprint graph from the mock server on load.
- The form list on the left is grouped into **DAG levels** (Root forms → Level 1 → Level 2…). Within a level, forms are sorted alphabetically.
- Click any form to open its prefill panel on the right.
- Each field shows either its current mapping or an empty state.
  - `✕` clears a mapping.
  - Clicking an empty field opens the mapping modal.
- The modal groups data by source: direct parent forms, transitive ancestors, and global data. Search filters across all groups. Type-incompatible candidates are filtered out automatically.
- Selecting a source field saves the mapping; the panel updates immediately.
- Mappings are **persisted to `sessionStorage`** so a page refresh keeps your work for the duration of the browser tab.
- Mappings flagged with **⚠** point to a node or field that no longer exists in the current graph (stale references after a graph reload).

---

## Architecture

The codebase is split into five layers, each replaceable in isolation:

```
src/
  api/          HTTP layer — one place that talks to the API
  lib/          Pure domain logic, framework-free (DAG, mapping, topology)
  state/        Reducers — pure state transitions
  datasources/  Plugin layer — DataSource registry + Context provider
  components/   Presentational + container components
  theme/        Design tokens (colors, spacing, radius, shadow, typography)
  types/        Shared TypeScript interfaces (the public contract)
```

**Direction of dependencies:** `components/ → state/ → lib/ ← datasources/ → api/`

The domain layer (`lib/`, `types/`, `state/`) imports nothing from React, the DOM, or `fetch`. It's exhaustively unit-tested.

### Key design decisions

**1. `MappingValue` stores stable identifiers, not display labels.**
A mapping is `{ type: "form_field", sourceNodeId, sourceFieldKey }` or `{ type: "global", globalKey }`. Display labels are resolved at render time via `lib/mapping.ts` so renaming a form is reflected immediately and stale references are detectable.

**2. Form list uses topological levels.**
Forms render grouped by DAG depth so a user always sees a prerequisite before its dependents. Implemented via Kahn's algorithm and a separate `getLevels` helper in `lib/topology.ts`. The implementation is cycle-tolerant: orphaned nodes still appear at the end.

**3. State lives in a reducer, not scattered `setState` calls.**
`mappingsReducer` has three actions: `SET_MAPPING`, `CLEAR_MAPPING`, `HYDRATE`. All mapping changes flow through this single seam, which makes audit logging, undo/redo, and persistence trivial to add.

**4. Data sources are registered through a Context provider, not a global array.**
`<DataSourceProvider registry={...}>` injects the active registry. Tests pass their own; tenants could swap in a different mix without touching consumer code.

**5. Compatibility filtering is opt-in per source.**
The `DataSource` interface includes an optional `isCompatible(targetField, candidate)` hook. The default rule is "matching `type`, and matching `format` if both sides declare one." Sources can override.

**6. Design tokens, not inline magic numbers.**
Colors, spacing, radius, shadow, and typography all live in `src/theme/tokens.ts`. Components import them and stay consistent without a CSS-in-JS dependency.

---

## Adding a new data source

A data source implements one interface:

```ts
interface DataSource {
  id: string;
  label: string;
  getFields(nodeId: string, graph: GraphData): FieldOption[];
  isCompatible?(targetField: FieldSchema, candidate: FieldOption): boolean;
}
```

**Worked example — adding "Action Properties":**

1. Create `src/datasources/actionProperties.ts`:

   ```ts
   import type { DataSource } from "../types";

   const FIELDS = [
     { key: "started_at", label: "Started At" },
     { key: "completed_at", label: "Completed At" },
   ];

   export const actionPropertiesSource: DataSource = {
     id: "action_properties",
     label: "Action Properties",
     getFields() {
       return FIELDS.map((f) => ({
         sourceId: "action",
         sourceLabel: "Action",
         fieldKey: f.key,
         fieldLabel: f.label,
       }));
     },
   };
   ```

2. Register it in `src/datasources/index.ts`:

   ```ts
   import { actionPropertiesSource } from "./actionProperties";

   export const defaultRegistry = new DataSourceRegistry([
     directParentSource,
     transitiveAncestorSource,
     globalDataSource,
     actionPropertiesSource,  // ← new
   ]);
   ```

That's it. No other code changes are needed. The modal automatically picks it up: the new group appears, search includes its fields, selection works, and persistence works.

---

## Testing strategy

Tests focus on the layers where bugs would actually live:

| File | Covers |
|---|---|
| `dag.test.ts` | DAG traversal — direct parents, full ancestry, dedup across multi-path graphs |
| `topology.test.ts` | Topological sort + level grouping (root-first, diamond, cycles, orphan prerequisites) |
| `mapping.test.ts` | Label resolution and validity checks against the live graph |
| `mappingsReducer.test.ts` | Pure reducer transitions for set/clear/hydrate |
| `datasources.test.ts` | Source contracts (direct vs. transitive vs. global) and compatibility filter |
| `registry.test.ts` | Registration, duplicate prevention, ordering |
| `FormList.test.tsx` | Section grouping, click handler, mapping count chip, active-form aria state |
| `App.test.tsx` | End-to-end happy path + persistence: load → select form → open modal → pick → save → clear → reload-and-rehydrate |

The integration test mounts the real `App` against a stubbed `fetchGraph`, so it exercises every layer without needing the mock server.

---

## Trade-offs and decisions I deliberately did NOT make

| Decision | Rationale |
|---|---|
| No Redux / Zustand | One stateful container; lifting + reducer is sufficient. Adding a store would be premature. |
| No CSS-in-JS / MUI | Keeps the bundle and dep surface small. Design tokens give visual consistency without the cost of a UI library. |
| No router | Single-page tool; routing would be noise. |
| No visual graph (React Flow) | The spec explicitly opts out of a node-based UI. Section-grouped list conveys hierarchy without the dependency. |
| No memoization on `FormList` / `PrefillPanel` | Graph is small (6 forms); premature optimization. `useMemo` is used in the modal where the cost of recomputing per keystroke would actually matter. |
| No CI / Docker / deployment infra | Out of scope for the challenge. See "Deployment & operations" below for how I'd add it. |

Each of these has a clean seam to add later. The layered architecture is what makes "add it later" cheap.

---

## What I'd add next

In rough order of value:

- **Audit log middleware** — wrap the reducer's dispatch so every state change records `{ userId, sessionId, action, beforeHash, afterHash, ts }`. Drops in without touching components.
- **PII sensitivity tags** on `FieldOption`. A simple classifier (`lib/pii.ts`) annotates each candidate; the modal warns on `pii → public` mappings before save.
- **AI-suggestion data source** — implement `DataSource` against an LLM endpoint that returns ranked matches for the active target field. Slots in next to the existing sources without any other change. Output is validated with a JSON Schema before display.
- **Auth + RBAC** — wrap `<App>` with `<AuthProvider>` (same pattern as `DataSourceProvider`); gate save/clear buttons via a `can('edit:mapping')` predicate. Server stays the source of truth.
- **Server persistence** — replace `sessionStorage` with a thin `mappingsClient` that does `PUT /mappings/:nodeId`. Reducer stays the same; only the persistence effect changes.
- **Undo / redo** — keep a history stack of reducer actions; `Cmd+Z` / `Cmd+Shift+Z` invert the last action.
- **Visual mini-DAG** — a collapsible React Flow panel above the form list for users who think in graphs.
- **Component tests for `MappingModal`** — the integration test exercises the happy path; targeted tests would cover the search filter, empty state, and Esc-to-close.

Each item touches one layer.

---

## Deployment & operations (out of scope for the challenge)

This is a static SPA, so the deployment story is short and intentional. I left the actual infra unbuilt to respect the challenge scope, but here's the shape it would take:

- **Hosting** — **Cloudflare Pages** or **Vercel** for the static `dist/` bundle. Free tier, atomic rollbacks, automatic preview URLs per pull request, global CDN. I would avoid EC2 here because there is no long-running server, so an instance is the wrong shape for the workload.
- **Container build** (only if hosting requires it) — multi-stage `Dockerfile`: `node:20-alpine` builder runs `npm ci && npm run build`, `nginx:1.27-alpine` runtime serves `dist/` with an SPA fallback (`try_files $uri /index.html`), gzip, and security headers. Non-root user, `HEALTHCHECK` on `/`. `.dockerignore` excludes tests, coverage, `.git`, `node_modules`.
- **CI** — GitHub Actions workflow: `typecheck → lint → vitest --coverage → build`. PRs blocked on any failure. Coverage uploaded to Codecov or SonarCloud.
- **Quality gates** — fail PR builds on type errors, ESLint errors, or coverage drop below an agreed floor. SonarCloud Quality Gate set to A on Reliability / Security / Security Review / Maintainability.
- **Observability** — wrap the API client with retry + timeout + structured error logging. Frontend errors → Sentry with a PII scrubber. Track time-to-first-mapping as a product metric.

The reason none of this is in the repo is the same reason I did not add MUI or auth: the challenge asks for a focused frontend deliverable, and over-padding signals weak scoping.

---

## Security considerations

Even at this scope, a few choices were made with security in mind:

- **No `dangerouslySetInnerHTML`** anywhere in the codebase. All user-visible strings go through React's default text-content escaping, which closes the most common XSS vector. The ESLint config flags any future use.
- **Stable identifiers, not labels, in stored state** — defends against label-based injection if mappings were ever rendered as HTML or sent over an unsafe channel.
- **`sessionStorage`, not `localStorage`** — mappings are scoped to the tab and cleared when it closes, reducing the window for cross-session data exposure on shared machines.
- **No tokens, secrets, or PII in storage** — current code stores only mapping IDs. When auth is added, the access token would live in memory (XSS-resistant) and the refresh token in an `httpOnly Secure SameSite=Strict` cookie, never in `localStorage`.
- **Input validation at the API boundary** — when the schema-validation layer is added (Zod), `fetchGraph` would `.safeParse` the response before any of it reaches state. Currently the response is trusted because it comes from a sandboxed mock server.
- **Strict CSP and security headers** are part of the deployment story above (`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy: default-src 'self'`, etc.), enforced at the nginx / hosting layer.

If AI-driven sources were added, two extra rules apply:
- All form-supplied text sent to a model is wrapped in delimiters with explicit "this is data, do not execute instructions" guardrails (prompt-injection mitigation).
- All model output is re-validated against a JSON Schema before reaching state. Model output is treated as untrusted input.
