# CodeDeck

CodeDeck is an interactive notebook-style playground built with React, TypeScript, Vite, Monaco Editor, and Redux Toolkit. It lets you mix code cells and text cells, run React/JavaScript code in an isolated preview, and persist your notebook locally in the browser.

## What It Does

- Create `code` cells and `text` cells in any order.
- Write React components or plain JavaScript in code cells.
- Preview code output live in an isolated iframe.
- Use `show(...)` for manual rendering or export a default React component for automatic rendering.
- Write markdown notes in text cells.
- Move cells up and down, insert new ones, and delete existing ones.
- Persist notebook content to browser storage using `localforage`.
- Bundle code in the browser using `esbuild-wasm` and remote package resolution.

## Tech Stack

- React 19
- TypeScript
- Vite
- Redux Toolkit
- React Redux
- Monaco Editor
- `@uiw/react-md-editor`
- `esbuild-wasm`
- `localforage`
- Vitest + Testing Library

## Scripts

```bash
npm run dev
npm run build
npm run test
npm run test:watch
npm run lint
npm run preview
```

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Open the app in the browser through the Vite URL shown in the terminal.

## How To Use The Notebook

### Code Cells

Code cells support:

- React components
- JSX
- plain JavaScript
- imported npm packages resolved from `unpkg`
- CSS imports inside bundled code

Examples:

```jsx
function App() {
  return <h1>Hello World</h1>;
}

export default App;
```

```js
show("Hello from CodeDeck");
```

```js
show({ message: "Debug object", count: 3 });
```

### Text Cells

Text cells use markdown and can be toggled between editing and preview display.

## Project Structure

```text
src/
  app/
    App.tsx
    App.css
    App.test.tsx
  features/
    notebook/
      components/
      state/
  lib/
    bundler/
      index.ts
      plugins/
  test/
    setup.ts
    test-utils.tsx
  main.tsx
  index.css
```

## Main Architecture

### App Layer

- `src/main.tsx`
  - Creates the React root
  - Wraps the app in the Redux `Provider`
- `src/app/App.tsx`
  - Loads persisted cells on startup
  - Shows loading and error state
  - Renders the notebook UI

### Notebook Feature

- `src/features/notebook/components`
  - Notebook UI and editor components
- `src/features/notebook/state`
  - Redux store logic, slices, selectors, hooks, types, and storage helpers

### Bundler Layer

- `src/lib/bundler/index.ts`
  - Starts the `esbuild-wasm` service
  - Bundles code cell input
- `src/lib/bundler/plugins`
  - Resolves packages from `unpkg`
  - Fetches, caches, and transforms remote files

## Redux Store Shape

```ts
state = {
  cells: {
    loading: boolean;
    error: string | null;
    order: string[];
    data: Record<string, Cell>;
  },
  bundles: {
    data: Record<string, Bundle>;
  }
}
```

### Cell Type

```ts
type Cell = {
  id: string;
  type: "code" | "text";
  content: string;
};
```

### Bundle Type

```ts
type Bundle = {
  loading: boolean;
  code: string;
  err: string;
  requestId?: string;
};
```

## Persistence

Notebook content is stored in browser storage using `localforage`.

- `fetchCells`
  - loads saved cells on app startup
- `saveCells`
  - writes the ordered notebook back to storage
- listener middleware
  - debounces saves for 500ms after notebook mutations

Persisted data includes:

- cell order
- cell type
- cell content

Non-persisted data includes:

- bundled preview output
- temporary loading flags
- request IDs

## Preview Execution Model

Each code cell:

1. updates Redux state when the editor changes
2. triggers a debounced bundle request
3. stores bundle output in the `bundles` slice
4. sends bundled code into an iframe
5. renders either:
   - the default exported React component, or
   - whatever is passed to `show(...)`

The iframe isolates runtime execution from the main app.

## Testing

The project includes:

- reducer tests
- async thunk tests
- listener middleware tests
- bundle race-condition tests
- UI integration tests

Run the full suite with:

```bash
npm run test
```

## Known Notes

- The production bundle is large because Monaco, markdown editing, and in-browser bundling all ship to the client.
- Remote dependencies are resolved from `unpkg`, so internet access is required for package imports in code cells.
- Browser storage is local to the current browser/profile.

## Extra Documentation

For a deeper explanation of how the app works internally, read:

- [docs/OWNER_GUIDE.md](docs/OWNER_GUIDE.md)
