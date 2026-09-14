# Flow Chart App

A Vue 3 + TypeScript chatbot flow builder: view a flow as a draggable node
canvas, create new nodes, and edit/delete them from a details drawer.

## Getting started

```bash
npm install
npm run dev         # start the dev server (Vite)
npm run type-check  # vue-tsc --noEmit
npm run build       # type-check, then production build
npm run preview     # preview the production build
npm run test        # run the unit test suite (Vitest)
```

Requires Node 18+.

## About the sample data

The app fetches the real assessment payload directly from the S3 link at
runtime (`https://respond-io-fe-bucket.s3.ap-southeast-1.amazonaws.com/candidate-assessments/payload.json`),
via `fetch` inside `src/api/nodesApi.ts#loadRawPayload`, wrapped by
`useQuery`. `src/data/payload.json` is the same payload bundled at build time,
used purely as an offline fallback if that network request failsy.

It's a flat array of nodes linked by `parentId`, with no canvas
coordinates, and per-type data shapes that don't match the canvas/panels
directly (e.g. `dateTime` instead of `businessHours`, a single `comment`
string instead of a list, `sendMessage.data.payload` mixing text and
attachment entries). `src/utils/payloadTransform.ts` is the one place
that normalizes this into Vue Flow's `{ nodes, edges }` shape and computes
a layout.

## How it's put together

```
src/
  types.ts                 Shared domain types: FlowNode, FlowEdge, raw payload shape, form types
  plugins/vuetify.ts       Vuetify instance: custom theme + component defaults
  api/nodesApi.ts          Fetches the real payload over the network (S3), with a local fallback; localStorage-backed create/update/delete
  stores/flowStore.ts      Pinia store: canonical nodes/edges + undo/redo for moves
  utils/
    nodeUtils.ts           Pure helpers: icons (emoji + MDI), truncation, default node data, positioning
    validation.ts          Pure form validation helpers
    payloadTransform.ts    Raw payload -> { nodes, edges }: type/shape mapping + layout + edge labels
  router/index.ts           '/' and '/node/:id' both render FlowView
  views/FlowView.vue        Wires TanStack Query + mutations + Pinia + child components together
  components/
    FlowCanvas.vue          Vue Flow canvas, drag handling, edge label styling
    CustomNode.vue           Node card (VCard/VAvatar/VIcon, truncated description)
    CreateNodeModal.vue      VDialog-based "create new node" form + validation
    NodeDetailsDrawer.vue    VNavigationDrawer: edit title/description, Update/Delete, type-specific panel
    panels/
      SendMessagePanel.vue      Message list + attachment tiles/upload
      AddCommentPanel.vue       Comment list (add/edit/remove)
      BusinessHoursPanel.vue    Fixed Mon-Sun rows with time pickers + timezone select
  __tests__/
    setup.ts                 Centralized jsdom polyfills for Vue Flow/Vuetify
    testUtils.ts             Shared Vuetify plugin instance for component tests
    updateReflectsInCanvas.spec.ts   End-to-end proof an Update shows up on the canvas immediately
    (+ one spec file per module/component above)
```

### Design decisions

- **TypeScript throughout.** All `.js` files are `.ts`, every `.vue` file
  uses `<script setup lang="ts">`, and `npm run build`/CI run `vue-tsc
--noEmit` before the Vite build so type errors fail the build, not just
  the editor. `src/types.ts` is the single source of truth for the domain
  model (`FlowNode`, `FlowEdge`, the raw payload shape, form types) that
  everything else — the store, the API, the components — imports from.
- **Top-to-bottom layout, per the mockup.** `CustomNode.vue`'s
  connection handles were flipped from left/right to top/bottom to match.
- **Success/Failure are edge labels, not node cards.**
- **A dedicated transform layer for the real payload.** Beyond
  layout/connectors: `dateTime` → our `businessHours` type; `data.times[].
{day, startTime, endTime}` (short day codes like `mon`) maps to
  `hours[].{day, open, close}` (full day names, matching the picker UI);
  `sendMessage.data.payload` (a mixed text/attachment array) splits into
  separate `texts`/`attachments` arrays; `addComment.data.comment` (a
  single string) is wrapped into a one-item `comments` array so it reuses
  the same list-editing UI as everything else. This all lives in
  `payloadTransform.ts`, kept separate from the fake API and fully
  unit-tested.
- **The `trigger` node is treated as display-only.** It isn't one of the
  three creatable/editable types the brief describes.
- **Single route component, param-driven drawer.** Both `/` and `/node/:id`
  render `FlowView`. The canvas (and Vue Flow's internal state) never
  unmounts when the drawer opens or closes — only the drawer's `v-if`
  toggles based on `route.params.id`. That's what makes the canvas ↔
  drawer transition smooth instead of a jarring page swap, while still
  satisfying "the details drawer should be accessible via URL containing
  the node ID."
- **Vue Flow node type indirection.** Vue Flow renders nodes purely by
  their `type` key, so all real node types (`sendMessage`, `addComment`,
  `businessHours`, `trigger`) map to a single Vue Flow render type,
  `custom`, backed by `CustomNode.vue`. The real semantic type travels
  through as `data.realType` so `CustomNode` can still pick the right
  icon/behavior.
- **Pinia as the source of truth for rendering, Query owns the network
  lifecycle.** `useQuery(['flow'], fetchFlow)` fetches once and seeds the
  Pinia store; all mutations (`useMutation`) go through the fake API and,
  on success, patch the store directly. This keeps the canvas reactive to
  local edits instantly (no waiting on a refetch) while still routing every
  read/write through Query, per the brief.
- **Real network fetch for the GET, with an offline fallback.** `fetchFlow`
  (wrapped by `useQuery` in `FlowView.vue`) fetches the payload from the
  live S3 URL over `fetch`, not a bundled copy. That S3 object is a
  static, public file with no endpoint on the other end to mutate — so
  once fetched it's cached in `localStorage`, and every mutation
  (create/update/delete via `useMutation`) reads/writes against that
  cache, exactly like it would against a real REST API's persisted
  state. If the network request fails (offline, CORS, the object moves),
  `loadRawPayload` falls back to `src/data/payload.json`, a build-time
  copy of the same payload, logging a warning rather than breaking the
  app. This fallback path is unit-tested by mocking `fetch` in
  `nodesApi.spec.ts`.
- **Business Hours is a fixed 7-row form, not a growable list.** The brief
  asks to "display existing business hours" and "utilize a date/time
  picker to update" — not to add or remove days — and the mockup shows a
  fixed Mon–Sun table. `BusinessHoursPanel.vue` follows that: each day is
  always present with an editable open/close time, plus a timezone select,
  matching the mockup's layout.
- **Explicit "Update" button, not save-on-blur.** Editing a node's title,
  description, or its type-specific panel (messages/attachments, comments,
  business hours) stages changes locally; nothing is persisted until you
  click "Update" in the drawer footer. `NodeDetailsDrawer.vue` pulls the
  current panel state via a `getData()` method each panel exposes with
  `defineExpose` (`SendMessagePanel`, `AddCommentPanel`,
  `BusinessHoursPanel`), merges it with the title/description fields, and
  saves everything in a single `update-node` emit/mutation. A panel can
  return `null` from `getData()` to block the save when its own local
  validation fails (e.g. a business-hours row with close before open) —
  its inline error stays visible and nothing partial gets written.
- **Every node opens a drawer, including display-only ones.** Eevery node — including display-only ones — opens the drawer, and `NodeDetailsDrawer.vue` renders a **read-only preview**
  (title + description as plain text, a "Preview" badge, no
  Update/Delete buttons) rather than the editable form when
  `isDisplayOnlyNode(node.type)` is true. The redirect-back-to-canvas
  guard fires only once the flow has actually finished loading
  (`store.initialized`) _and_ the id genuinely doesn't exist (a stale id,
  or one of the never-real Success/Failure ids) — not for display-only
  types, and not for a real id that simply hasn't loaded yet (see the bug
  note below).
- **A "+" button on every node adds a wired-up child.** Hovering a node
  reveals a small "+" on its bottom edge (`CustomNode.vue`); clicking it
  opens the same Create Node modal (now labeled "Add child of
  '<parent title>'") and, on success, both creates the node _and_ an edge
  from the clicked node to it — `createNodeRequest` accepts an optional
  `parentId` and persists the edge alongside the node so it survives a
  refresh, not just a live store update. Position is computed relative to
  the parent (`nextChildPosition`): straight below for the first child,
  spread horizontally for siblings after that, so children don't stack on
  top of each other. The existing toolbar "Create New Node" button still
  adds an unconnected node, for building a fresh branch.
- **Vuetify as the UI library.** Every interactive surface uses real
  Vuetify components rather than hand-rolled CSS: `v-app-bar`/`v-main`
  for the toolbar/layout (`FlowView.vue`), `v-dialog` + `v-card` +
  `v-text-field`/`v-textarea`/`v-select` for the create-node form
  (`CreateNodeModal.vue`), `v-navigation-drawer` for the details drawer,
  and `v-card`/`v-avatar`/`v-icon`/`v-btn` for the canvas node cards
  (`CustomNode.vue` — kept the same `.flow-node`/`.flow-node__add-child`
  class names alongside Vuetify's own, so tests didn't need rewriting
  there). `src/plugins/vuetify.ts` defines a custom theme matching the
  app's original teal/slate palette and sets sane component defaults
  (outlined fields, comfortable density) once instead of per-component.
  `App.vue` wraps the app in the required `<v-app>` root.

### Per-type field visibility in the drawer

- **sendMessage / addComment**: an editable Title only — no Description
  field, since the panel below (messages/attachments, or the comment
  itself) _is_ the content.
- **addComment specifically**: exactly one comment, edited as a single
  field (`AddCommentPanel.vue`), not a growable add/remove list.
  `comments` is still typed as `string[]` (to avoid a wider schema
  change) but the UI only ever produces zero or one entries.
- **businessHours**: Title and Description are shown as plain read-only
  text, not inputs — only the hours/timezone panel below is editable.
  `NodeDetailsDrawer.vue`'s `isTitleReadOnly` computed drives this; the
  Update/Delete buttons and the panel itself work exactly as before,
  only the header fields changed.
- **trigger**: unaffected — still the full read-only preview from
  before (title, description, no panel, no Update/Delete).

### Undo/redo: moves and edits

Covers edits made through the drawer's Update button, matching the nice-to-have as
originally written ("moves _and_ edits"). The Pinia store's history
stack holds a union of two entry kinds:

- `{ kind: 'move', nodeId, from, to }` — recorded on every drag-stop.
- `{ kind: 'edit', nodeId, from, to }` — recorded after a successful
  Update, where `from`/`to` are full `FlowNodeData` snapshots taken
  immediately before and after the mutation (`FlowView.vue`'s
  `handleUpdateNode`), not just the partial payload that was sent, so
  undo restores the exact prior state regardless of which fields
  actually changed.

`undo()`/`redo()` branch on `entry.kind` to apply either a position or a
full data replacement, and the Undo/Redo toolbar buttons persist
whichever kind it was through the same update mutation moves already
used. Move- and edit-type entries interleave correctly on the same
stack — undoing walks back through whatever was actually done, in order,
regardless of kind.

### Accessibility (nice-to-have)

Every node is focusable (`tabindex="0"`, `role="button"`) and opens the
details drawer on `Enter`/`Space` as well as click — display-only nodes
(trigger) open the read-only preview the same way rather than being
excluded from the tab order.

## Testing

`npm run test` runs the Vitest suite (69 tests across 10 files):
pure-function tests

## CI/CD

- `.github/workflows/ci.yml` installs dependencies, type-checks, runs the
  test suite, and builds the app on every push/PR to `main`.
- `vercel.json` adds an SPA rewrite so refreshing on `/node/:id` doesn't
  404 on Vercel (client-side routing via `createWebHistory`).
