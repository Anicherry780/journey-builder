# Journey Builder — Prefill Mapping UI

A React + TypeScript app for viewing and editing prefill mappings between forms in a DAG-based workflow.

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
  types/        Shared TypeScript interfaces (the public contract)
```

**Direction of dependencies:** `components/ → state/ → lib/ ← datasources/ → api/`

The domain layer (`lib/`, `types/`, `state/`) imports nothing from React, the DOM, or `fetch`. It's exhaustively unit-tested.

### Key design decisions

**1. `MappingValue` stores stable identifiers, not display labels.**
A mapping is `{ type: "form_field", sourceNodeId, sourceFieldKey }` or `{ type: "global", globalKey }`. Display labels are resolved at render time via `lib/mapping.ts` so renaming a form is reflected immediately and stale references are detectable.

**2. Form list uses topological sort.**
Forms render in DAG order so a user always sees a prerequisite before its dependents. Implemented as Kahn's algorithm in `lib/topology.ts`. Cycle-tolerant — orphaned nodes still appear at the end.

**3. State lives in a reducer, not scattered `setState` calls.**
`mappingsReducer` has three actions: `SET_MAPPING`, `CLEAR_MAPPING`, `HYDRATE`. All mapping changes flow through this single seam, which makes audit logging, undo/redo, and persistence straightforward to add.

**4. Data sources are registered through a Context provider, not a global array.**
`<DataSourceProvider registry={...}>` injects the active registry. Tests pass their own; tenants could swap in a different mix without touching consumer code.

**5. Compatibility filtering is opt-in per source.**
The `DataSource` interface includes an optional `isCompatible(targetField, candidate)` hook. The default rule is "matching `type`, and matching `format` if both sides declare one." Sources can override.

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

That's it — no other code changes. The modal automatically picks it up: the new group appears, search includes its fields, selection works, persistence works.

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
| No Redux / Zustand | One stateful container; lifting + reducer is sufficient |
| No CSS-in-JS / MUI | Keeps the bundle and dep surface small; inline styles are intentional. The challenge says "doesn't need to be pretty." |
| No router | Single-page tool; routing would be noise |
| No persistence layer | Not in spec; reducer is structured to add it later (one effect on `mappings`) |
| No visual graph (React Flow) | The spec explicitly opts out of a node-based UI |
| No memoization on `FormList` / `PrefillPanel` | Graph is small (6 forms); premature optimization. `useMemo` is used in the modal where the cost of recomputing per keystroke would actually matter |

Each of these has a clean seam to add later — the layered architecture makes "add it later" cheap.

---

## What I'd add next

- **Persistence**: wrap the reducer with a `useEffect` that mirrors `mappings` to `sessionStorage`; hydrate on mount.
- **Audit log middleware**: log every reducer action with `{ before, after, timestamp }` for compliance use cases.
- **PII sensitivity tags** on `FieldOption` and a warning UI on `pii → public` mappings.
- **AI suggestion source**: implement a `DataSource` that returns LLM-suggested mappings — slots in next to the form-field sources without any other change.
- **Auth + RBAC**: wrap `<App>` with an `<AuthProvider>` (same pattern as `DataSourceProvider`); gate save/clear buttons via a `can()` predicate.

Each of these touches one layer.
