# CodeDeck Owner Guide

This guide is written for you as the builder and maintainer of the app. It explains what the app is doing, why the code is structured this way, and how the major moving pieces fit together in a practical, easy-to-follow way.

## 1. Big Picture

CodeDeck is a notebook app with two kinds of cells:

- `code` cells
- `text` cells

The user can:

- add cells
- reorder cells
- delete cells
- edit content
- preview code output
- keep everything saved locally

The app is split into three main areas:

1. App bootstrapping
2. Notebook feature
3. Bundling/preview infrastructure

## 2. Folder Structure And Why It Matters

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

### `src/app`

This is the app shell layer.

Use it for:

- top-level app layout
- app startup logic
- integration tests for the app shell

Current files:

- `App.tsx`
- `App.css`
- `App.test.tsx`

### `src/features/notebook/components`

This is the notebook UI feature area.

Use it for anything the user directly interacts with inside the notebook:

- cell list
- add-cell controls
- action bar
- code cell
- text cell
- preview
- editor wrappers
- resizable layout

### `src/features/notebook/state`

This is the Redux logic area for the notebook.

Use it for:

- slices
- selectors
- types
- storage utilities
- store creation
- typed hooks

### `src/lib/bundler`

This is infrastructure code, not notebook UI.

Use it for:

- starting esbuild
- bundling user code
- plugin logic for resolving and fetching dependencies

### `src/test`

This contains shared testing setup.

Use it for:

- render helpers
- common mocks
- shared test environment setup

## 3. App Startup Flow

The app starts here:

- `src/main.tsx`

What happens there:

1. React root is created
2. Redux `Provider` wraps the app
3. `App` is rendered

Then `src/app/App.tsx` runs:

1. it gets `dispatch`
2. it reads `loading` and `error` from Redux
3. it dispatches `fetchCells()` inside `useEffect`
4. it renders the notebook UI with `CellList`

So the app always tries to load saved notebook data on startup.

## 4. Redux Store Overview

The Redux store is created in:

- `src/features/notebook/state/store.ts`

The store combines two slices:

- `cells`
- `bundles`

### Why There Are Two Slices

They solve different problems:

#### `cells`

This is the source of truth for notebook structure and content.

It answers:

- What cells exist?
- In what order?
- What is inside each cell?
- Are we loading saved cells?
- Was there a persistence error?

#### `bundles`

This holds temporary compiled output for code cells.

It answers:

- Is this code cell currently bundling?
- What compiled code should be sent to preview?
- Did the bundle fail?

This data is temporary and should not be persisted.

## 5. The `cells` Slice In Plain English

File:

- `src/features/notebook/state/cellsSlice.ts`

### State Shape

```ts
{
  loading: boolean;
  error: string | null;
  order: string[];
  data: Record<string, Cell>;
}
```

### Why `order` And `data` Are Separate

This is a normalized Redux pattern.

Instead of storing:

```ts
cells: Cell[]
```

the app stores:

```ts
order: ["a", "b", "c"]
data: {
  a: {...},
  b: {...},
  c: {...}
}
```

This makes updates easier and safer.

Benefits:

- fast lookup by id
- easy reorder logic
- less awkward array mutation
- cleaner selectors

### Important Reducers

#### `updateCell`

Updates the content of a cell.

Used when:

- code changes in Monaco
- markdown changes in the text editor

#### `deleteCell`

Removes a cell from:

- `data`
- `order`

#### `insertCellBefore`

Creates a new cell and inserts it before the target cell.

#### `insertCellAfter`

Creates a new cell and inserts it after the target cell.

This is also how the app adds a cell when the notebook is empty or when adding after the last cell.

#### `moveCell`

Swaps a cell with the one above or below it.

Boundary checks prevent:

- moving the first cell further up
- moving the last cell further down

### Async Thunks

#### `fetchCells`

Loads notebook data from `localforage`.

If valid data is found:

- it is normalized into `order` and `data`

If nothing is found:

- the notebook starts empty

If invalid data is found:

- the notebook falls back to empty state
- a readable error is stored

#### `saveCells`

Reads the current Redux state, converts the ordered notebook back into a `Cell[]`, and saves it to `localforage`.

## 6. Listener Middleware: Why Saves Feel Automatic

In `store.ts`, listener middleware watches notebook-changing actions:

- `updateCell`
- `deleteCell`
- `insertCellBefore`
- `insertCellAfter`
- `moveCell`

When any of those happen:

1. active pending save listeners are cancelled
2. the middleware waits 500ms
3. it dispatches `saveCells()`

This gives you debounced auto-save behavior.

### Why This Is Better Than Saving Inside Every Component

Because persistence becomes:

- centralized
- reusable
- easier to test
- not tied to UI components

The components only describe user intent. The store handles side effects.

## 7. The `bundles` Slice In Plain English

File:

- `src/features/notebook/state/bundlesSlice.ts`

This slice stores compiled output for each code cell.

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

### What `createBundle` Does

It:

1. receives `cellId` and raw input code
2. calls `bundleCode(input)`
3. stores the result by `cellId`

### Why `requestId` Exists

Bundling is async, and users type quickly.

That means this can happen:

1. request A starts
2. request B starts
3. request B finishes first
4. request A finishes later

Without protection, old code could overwrite new code.

The `requestId` fix ensures only the newest request for that cell wins.

That is one of the important stability protections in the app.

## 8. How A Code Cell Works

Main files:

- `code-cell.tsx`
- `code-editor.tsx`
- `preview.tsx`

### Flow

1. User types into Monaco
2. Monaco calls `onChange`
3. `updateCell` stores the new code in Redux
4. `CodeCell` has an effect that waits 800ms
5. It dispatches `createBundle({ cellId, input })`
6. Bundled output goes into the `bundles` slice
7. `Preview` receives `bundle.code` and `bundle.err`
8. Preview iframe executes the bundled code

### Why Code Content Lives In Redux

Because it gives you:

- one source of truth
- persistence
- predictable updates
- easy reorder support

If content lived only inside Monaco, reordering or remounting cells would be much harder to manage safely.

## 9. How Text Cells Work

Main file:

- `text-editor.tsx`

Text cells are simpler than code cells.

The content is stored in Redux, but the edit/view toggle is local component state.

Why?

- the markdown content is part of the notebook and must persist
- whether the cell is currently in edit mode is UI-only state and does not need to be global

That is a good rule of thumb:

- persistent/shared data -> Redux
- temporary presentation-only state -> local component state

## 10. How The Preview System Works

Main files:

- `src/lib/bundler/index.ts`
- `src/lib/bundler/plugins/fetch-plugin.ts`
- `src/lib/bundler/plugins/unpkg-path-plugin.ts`
- `src/features/notebook/components/preview.tsx`

### Step 1: Bundling

`bundleCode(input)` uses `esbuild-wasm` in the browser.

It bundles:

- the user code
- imports from npm via `unpkg`
- CSS imports

### Step 2: Virtual Entry File

The fetch plugin creates a virtual `index.js` entry file.

That entry file:

- imports React
- imports `createRoot`
- creates a `show(...)` helper
- imports the user code as a virtual module
- auto-renders the default export if one exists

This is why both of these work:

```jsx
export default function App() {
  return <h1>Hello</h1>;
}
```

```js
show("Hello");
```

### Step 3: iframe Execution

The preview component:

- resets the iframe HTML
- sends compiled code via `postMessage`
- `eval`s it inside the iframe
- catches runtime errors
- catches unhandled promise rejections

The iframe gives isolation so notebook code does not directly run inside the main React app.

## 11. How Package Imports Work

The bundler plugins resolve imports from `unpkg`.

### `unpkg-path-plugin.ts`

This plugin decides where a module path should point.

It handles:

- the virtual entry file
- the virtual user-input module
- relative imports from already-fetched modules
- package imports like `react`, `lodash`, etc.

### `fetch-plugin.ts`

This plugin fetches the actual file contents.

It also:

- caches fetched files in `localforage`
- transforms CSS into runtime-injected `<style>` tags

So if a user imports CSS from a package, the preview can still display it.

## 12. Why Reordering Needed Special Handling

You hit a Monaco issue when clicking `Up` and `Down`.

The cause was that Monaco does not always like being moved around in the DOM as a live editor instance.

The fix was to make code editors remount safely when their notebook position changes, while keeping the actual code text in Redux.

That means:

- UI remount is safe
- code content is not lost
- reordering is stable

## 13. How To Add A New Feature Safely

A practical way to think about changes:

### If it changes notebook content

Put it in Redux.

Examples:

- new cell properties
- metadata per cell
- saved notebook preferences

### If it is temporary UI state

Keep it local first unless multiple distant components need it.

Examples:

- is a menu open
- is a text cell in edit mode
- hover states

### If it is not notebook-specific

Put it in `lib` or another feature folder, not inside notebook UI by default.

## 14. How To Debug Problems

### Preview Is Blank

Check:

1. is `bundle.loading` stuck?
2. is `bundle.err` present?
3. does the code export a default component or call `show(...)`?
4. are package imports resolving correctly?

### Notebook Is Not Saving

Check:

1. whether mutation actions are firing
2. whether listener middleware is dispatching `saveCells`
3. whether `localforage` write succeeds
4. whether an error is being stored in `state.cells.error`

### Cell Reordering Feels Wrong

Check:

1. `state.cells.order`
2. `moveCell` boundary logic
3. whether the right `cellId` is being passed from the action bar

### Old Preview Replaces New Preview

Check:

1. `requestId` handling in `bundlesSlice`
2. whether an older async request is still overwriting state

## 15. Good Mental Model For Redux In This App

If you want the simplest mental model, think of Redux here like this:

- `cells` = the notebook itself
- `bundles` = temporary compiled output for code cells
- components = ways to display and edit that state
- middleware = automatic behavior like saving
- thunks = async work like loading, saving, and bundling

Or even simpler:

- reducers change data
- selectors read data
- thunks do async work
- middleware reacts to actions

## 16. Things I Would Improve Next

If you want to keep improving the app later, these are strong next steps:

- add a cell toolbar for duplicate/copy actions
- add keyboard shortcuts
- add notebook export/import
- persist UI preferences like pane sizes
- code-split Monaco and markdown editor to reduce bundle size
- add more integration tests around reordering and preview behavior
- support multiple notebooks instead of one local notebook

## 17. Final Summary

1. Redux owns the notebook content.
2. Bundles are temporary and per code cell.
3. Listener middleware handles debounced autosave.
4. The preview works by bundling code and running it inside an iframe.
5. `show(...)` is the manual render helper.
6. A default exported React component is auto-rendered.
7. The folder structure now separates app shell, notebook feature, bundler infrastructure, and test utilities.
