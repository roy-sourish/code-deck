# CodeDeck Project Walkthrough

This document is for the situation where you have just received the CodeDeck project and want to understand it properly before making changes.

The goal is not just to describe files. The goal is to help you build the right mental model of how the whole app works.

## 1. What This Project Is

CodeDeck is a notebook-style coding app built in React.

Users can create:

- `code` cells
- `text` cells

A code cell lets the user:

- write JavaScript or React code
- import npm packages
- bundle code in the browser
- see the result in a preview window

A text cell lets the user:

- write markdown notes
- switch between editing and viewing

The notebook is saved locally in the browser, so refreshing the page keeps the content.

## 2. What Problem The App Solves

The app is trying to combine a few ideas into one experience:

- notebook editing
- code execution
- React component previewing
- markdown note-taking
- persistent local storage

So the app is not just a form app and not just an editor. It is really a mini notebook environment running fully in the browser.

## 3. How To Think About The App

The easiest mental model is:

- the notebook content lives in Redux
- the preview output is also tracked in Redux
- the editor UI reads from Redux and writes back to Redux
- bundling happens asynchronously in the browser
- preview code runs inside an iframe
- notebook data is saved to browser storage

If you remember only that, the rest of the code becomes much easier to follow.

## 4. The Best Order To Read The Code

If you want to understand the project efficiently, read it in this order:

1. `src/main.tsx`
2. `src/app/App.tsx`
3. `src/features/notebook/state/types.ts`
4. `src/features/notebook/state/rootReducer.ts`
5. `src/features/notebook/state/store.ts`
6. `src/features/notebook/state/cellsSlice.ts`
7. `src/features/notebook/state/bundlesSlice.ts`
8. `src/features/notebook/state/selectors.ts`
9. `src/features/notebook/components/cell-list.tsx`
10. `src/features/notebook/components/cell-list-item.tsx`
11. `src/features/notebook/components/code-cell.tsx`
12. `src/features/notebook/components/code-editor.tsx`
13. `src/features/notebook/components/preview.tsx`
14. `src/features/notebook/components/text-editor.tsx`
15. `src/lib/bundler/index.ts`
16. `src/lib/bundler/plugins/unpkg-path-plugin.ts`
17. `src/lib/bundler/plugins/fetch-plugin.ts`

That order goes from app boot, to state, to UI, to runtime execution.

## 5. Top-Level Folder Structure

```text
src/
  app/
  features/
    notebook/
      components/
      state/
  lib/
    bundler/
  test/
```

This structure is intentional.

### `src/app`

This is the application shell.

It contains:

- app-level layout
- startup logic
- app-level tests

It should not hold notebook-specific business logic if that logic belongs to the notebook feature.

### `src/features/notebook`

This is the main feature folder.

It contains everything directly related to the notebook itself:

- notebook UI
- notebook Redux state
- notebook storage logic

This is the heart of the project.

### `src/lib/bundler`

This is infrastructure code.

It contains the browser-side bundling system used by code cells.

This logic is shared infrastructure, not visual UI.

### `src/test`

This contains shared test setup and helpers.

## 6. App Boot Flow

### Step 1: `src/main.tsx`

This is the real entry point.

What it does:

1. imports global CSS
2. creates the React root
3. wraps the app with Redux `Provider`
4. passes the store into React

This is where React and Redux get connected.

### Step 2: `src/app/App.tsx`

This is the main visible shell of the app.

What it does:

1. pulls `loading` and `error` from the Redux `cells` slice
2. dispatches `fetchCells()` on mount
3. shows a page header
4. shows loading and error UI
5. renders `CellList`

Important point:

`App.tsx` does not manage notebook content itself. It only starts the loading process and renders the notebook feature.

## 7. The Redux Architecture

The Redux logic lives in:

- `src/features/notebook/state`

There are two main slices:

- `cells`
- `bundles`

### Why Two Slices?

Because the app has two different kinds of data:

1. notebook content
2. code execution results

Those are related, but not the same thing.

## 8. The `cells` Slice

File:

- `src/features/notebook/state/cellsSlice.ts`

This slice is the source of truth for the notebook.

### State Shape

```ts
{
  loading: boolean;
  error: string | null;
  order: string[];
  data: Record<string, Cell>;
}
```

### What `order` Means

`order` is the visual order of cells in the notebook.

Example:

```ts
order: ["a", "b", "c"]
```

### What `data` Means

`data` holds the actual cell objects indexed by id.

Example:

```ts
data: {
  a: { id: "a", type: "code", content: "..." },
  b: { id: "b", type: "text", content: "..." },
  c: { id: "c", type: "code", content: "..." }
}
```

### Why This Structure Is Better Than A Plain Array

Because it makes Redux operations easier:

- reorder cells using `order`
- update one cell quickly using `data[id]`
- avoid repeated array scans for common edits

This pattern is called normalized state.

### Important Actions

#### `updateCell`

Changes the `content` of one cell.

This is used when:

- the code editor changes
- the markdown editor changes

#### `deleteCell`

Removes the cell from:

- `data`
- `order`

#### `insertCellBefore`

Creates a new cell and inserts it before an existing one.

#### `insertCellAfter`

Creates a new cell and inserts it after an existing one.

This also handles appending a new cell when there is no valid target.

#### `moveCell`

Moves a cell up or down.

It only swaps ids inside `order`.

The actual cell data remains the same.

### Async Work In `cells`

#### `fetchCells`

Loads saved notebook data from browser storage.

#### `saveCells`

Reads the current Redux notebook state and writes it back to storage.

## 9. The `bundles` Slice

File:

- `src/features/notebook/state/bundlesSlice.ts`

This slice stores compiled output for code cells.

Each code cell has its own bundle record.

### State Shape

```ts
{
  data: {
    [cellId]: {
      loading: boolean;
      code: string;
      err: string;
      requestId?: string;
    }
  }
}
```

### Why This Exists Separately

Notebook content and compiled output are not the same thing.

For example:

- code content should be saved
- compiled output should not be saved

Bundled output is temporary runtime state.

### What `createBundle` Does

It:

1. receives the raw input code for a code cell
2. calls the bundler
3. stores the compiled result in Redux

### Why `requestId` Matters

If the user types quickly, multiple bundle requests can overlap.

Without protection:

- old bundle results could overwrite new ones

With `requestId`:

- only the newest bundle result for a cell is allowed to win

That prevents stale preview bugs.

## 10. Store Setup And Middleware

File:

- `src/features/notebook/state/store.ts`

This file creates the Redux store and attaches listener middleware.

### What The Store Combines

- `cells` reducer
- `bundles` reducer

### What The Listener Middleware Does

It watches notebook-changing actions:

- `updateCell`
- `deleteCell`
- `insertCellBefore`
- `insertCellAfter`
- `moveCell`

When any of those happen:

1. previous save listeners are cancelled
2. the middleware waits 500ms
3. it dispatches `saveCells()`

This gives the app auto-save behavior with debounce.

### Why This Is Good

It keeps persistence logic out of UI components.

The UI only says:

- “user changed something”

The middleware says:

- “that means we should save soon”

That separation makes the app easier to maintain.

## 11. Selectors And Hooks

Files:

- `selectors.ts`
- `hooks.ts`

### Selectors

Selectors provide clean ways to read data:

- `selectOrderedCellIds`
- `selectCellById`
- `selectBundleByCellId`

This keeps components simple.

### Typed Hooks

The app uses:

- `useAppDispatch`
- `useAppSelector`

These are typed wrappers around React Redux hooks, which improves TypeScript support.

## 12. Notebook UI Components

Main UI folder:

- `src/features/notebook/components`

Let’s go through the components in the order they are used.

### `cell-list.tsx`

This component renders the notebook as a whole.

It:

- reads ordered cell ids from Redux
- renders the top add-cell control
- renders each notebook cell
- renders add-cell controls between cells
- shows an empty-state message when the notebook is empty

This is the main notebook list renderer.

### `cell-list-item.tsx`

This is a wrapper for one cell.

It:

- selects the actual cell from Redux using the `cellId`
- renders the action bar
- decides whether the cell should render as:
  - `CodeCell`
  - `TextEditor`

### `action-bar.tsx`

This gives the user actions for one cell:

- move up
- move down
- delete

It uses the current cell position in `order` to disable invalid movement.

### `add-cell.tsx`

This renders the `+ Code` and `+ Text` buttons.

It decides whether to insert:

- before the next cell
- after the previous cell

That gives the notebook the “insert anywhere” behavior.

## 13. Code Cell Flow

Files:

- `code-cell.tsx`
- `code-editor.tsx`
- `preview.tsx`

### `code-cell.tsx`

This is the orchestrator for one code cell.

It:

1. reads the cell content from Redux
2. reads the bundle result from Redux
3. dispatches `updateCell` when code changes
4. debounces bundle creation by 800ms
5. renders the code editor and preview side by side

Important idea:

This component does not do the bundling itself directly. It only dispatches the thunk that does it.

### `code-editor.tsx`

This wraps Monaco Editor.

It:

- receives `value` from Redux
- emits `onChange`
- provides a `Format` button using Prettier
- remounts safely when cell position changes to avoid Monaco reorder crashes

That remounting logic matters because Monaco can behave badly if a live editor instance is shuffled around in the DOM.

### `preview.tsx`

This renders the iframe where bundled code executes.

It:

- resets iframe HTML
- sends compiled code into the iframe with `postMessage`
- displays preview errors
- shows an instructional empty state when nothing has rendered yet

The iframe contains error handlers for:

- runtime errors
- unhandled promise rejections

This is important because notebook code is untrusted runtime code from the editor.

## 14. Text Cell Flow

File:

- `text-editor.tsx`

This component handles markdown cells.

It stores:

- content in Redux
- edit/view mode in local component state

That is a good example of how to separate state types:

- shared persistent state -> Redux
- temporary UI-only state -> local state

When editing:

- it shows the markdown editor

When not editing:

- it shows rendered markdown

## 15. The Bundler Layer

Files:

- `src/lib/bundler/index.ts`
- `src/lib/bundler/plugins/unpkg-path-plugin.ts`
- `src/lib/bundler/plugins/fetch-plugin.ts`

This is one of the most important systems in the whole app.

## 16. What `bundleCode()` Actually Does

File:

- `src/lib/bundler/index.ts`

This function:

1. initializes `esbuild-wasm` once
2. builds a bundle in the browser
3. returns:
   - compiled code
   - or an error message

This is how a code cell becomes executable preview code.

## 17. `unpkg-path-plugin.ts`

This plugin tells esbuild how to resolve import paths.

It handles:

- the virtual notebook entry file
- the virtual user code file
- relative imports inside fetched modules
- package imports like `react`

If the user writes:

```js
import axios from "axios";
```

this plugin turns that into a fetchable `unpkg` URL.

## 18. `fetch-plugin.ts`

This plugin fetches actual file contents and prepares the runtime.

It does several important jobs.

### Job 1: Creates A Virtual Entry File

The app does not directly bundle the raw user input as-is.

Instead, it creates a wrapper entry file that:

- imports React
- imports `createRoot`
- defines `show(...)`
- imports the user code module
- auto-renders the default export if one exists

That is why both of these work:

```jsx
export default function App() {
  return <h1>Hello</h1>;
}
```

```js
show("Hello");
```

### Job 2: Loads The User Code As A Virtual Module

The user code is stored as a special in-memory module named:

- `__codedeck_user_input__`

That gives the bundler a clean way to wrap the user code.

### Job 3: Caches Remote Files

It uses `localforage` to cache fetched files.

That reduces repeated network work for imported packages.

### Job 4: Handles CSS Imports

If a fetched file is CSS:

- it converts it into runtime JS that injects a `<style>` tag into the document

That means package CSS can still affect the preview.

## 19. How Preview Rendering Works

This is the full code-cell execution pipeline:

1. user types in Monaco
2. content is stored in `cells`
3. `CodeCell` waits 800ms
4. `createBundle` runs
5. `bundleCode()` builds the input
6. result is stored in `bundles[cellId]`
7. `Preview` receives the compiled code
8. iframe resets and receives bundled code
9. iframe executes bundled code
10. preview shows:
   - a default exported React component, or
   - whatever was passed to `show(...)`

That is one of the core flows of the entire app.

## 20. Persistence Flow

Persistence uses:

- `localforage`

There are two types of storage in the project:

### Notebook Storage

Used in:

- `cellStorage.ts`

Stores:

- ordered notebook cells

### Bundler File Cache

Used in:

- `fetch-plugin.ts`

Stores:

- fetched remote dependency files

These are separate because they solve different problems.

## 21. What Gets Persisted And What Does Not

### Persisted

- cell ids
- cell types
- cell content
- cell order

### Not Persisted

- compiled code output
- bundle loading flags
- request IDs
- local UI state like markdown edit mode

This is an important distinction when debugging.

## 22. Testing Strategy

The project uses:

- Vitest
- Testing Library

Tests currently cover:

- cells reducer behavior
- bundle behavior
- bundle race-condition protection
- app integration behavior

When reading tests, treat them as another form of documentation.

They help answer:

- what is supposed to happen?
- what cases matter enough to protect?

## 23. What To Be Careful About When Editing This Project

### Be Careful With Monaco

Monaco is powerful but sensitive to lifecycle changes.

If you refactor code cell rendering, test:

- reorder up/down
- adding/removing code cells
- switching between cells

### Be Careful With Async Bundle Races

If you touch bundling logic, make sure older requests cannot overwrite new output.

### Be Careful With Persistence

Notebook data and bundler cache are different systems.

Do not accidentally mix them.

### Be Careful With Preview Execution

Preview code runs in an iframe and is meant to stay isolated from the main app.

If you move preview execution into the main app context, you increase risk and reduce stability.

## 24. If You Want To Add Features, Where Should They Go?

Here is a simple guide.

### New notebook behavior

Put it in:

- `src/features/notebook/state`
- `src/features/notebook/components`

Examples:

- duplicate cell
- cell metadata
- notebook toolbar

### New runtime or bundling behavior

Put it in:

- `src/lib/bundler`

Examples:

- new import resolution rules
- preview runtime helpers
- new transform logic

### New app-wide shell behavior

Put it in:

- `src/app`

Examples:

- routing
- app layout changes
- top-level navigation

## 25. The Most Important Files In The Project

If you only have time to deeply understand a few files, make it these:

- `src/app/App.tsx`
- `src/features/notebook/state/store.ts`
- `src/features/notebook/state/cellsSlice.ts`
- `src/features/notebook/state/bundlesSlice.ts`
- `src/features/notebook/components/code-cell.tsx`
- `src/features/notebook/components/preview.tsx`
- `src/lib/bundler/plugins/fetch-plugin.ts`

Those files explain most of the product behavior.

## 26. A Very Short Mental Summary

If you want the shortest possible summary:

- Redux stores notebook content and bundle results.
- UI components read from Redux and dispatch actions.
- Listener middleware auto-saves notebook changes.
- Code cells trigger async bundling.
- Bundled code runs inside an iframe.
- Default React exports render automatically.
- `show(...)` is the manual preview helper.

## 27. What To Read Next After This

After reading this walkthrough, the best next steps are:

1. open `store.ts`
2. open `cellsSlice.ts`
3. open `bundlesSlice.ts`
4. follow one code cell from editor input to preview output
5. then read the tests

That will give you both conceptual understanding and implementation confidence.
