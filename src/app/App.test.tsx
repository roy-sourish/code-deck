import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import * as bundler from "../lib/bundler";
import * as cellStorage from "../features/notebook/state/cellStorage";
import { renderWithStore } from "../test/test-utils";

vi.mock("../features/notebook/state/cellStorage", () => ({
  loadCellsFromStorage: vi.fn(),
  saveCellsToStorage: vi.fn(),
}));

vi.mock("../lib/bundler", () => ({
  bundleCode: vi.fn(async (input: string) => ({
    code: `compiled:${input}`,
    err: "",
  })),
}));

vi.mock("@monaco-editor/react", () => ({
  default: ({
    value,
    onChange,
  }: {
    value: string;
    onChange?: (value: string) => void;
  }) => (
    <textarea
      aria-label="code editor"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}));

vi.mock("@uiw/react-md-editor", () => {
  const MarkdownEditor = ({
    value,
    onChange,
  }: {
    value?: string;
    onChange?: (value: string) => void;
  }) => (
    <textarea
      aria-label="markdown editor"
      value={value ?? ""}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );

  MarkdownEditor.Markdown = ({ source }: { source?: string }) => (
    <div>{source}</div>
  );

  return {
    default: MarkdownEditor,
  };
});

vi.mock("react-resizable", () => ({
  ResizableBox: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const mockedLoadCells = vi.mocked(cellStorage.loadCellsFromStorage);
const mockedSaveCells = vi.mocked(cellStorage.saveCellsToStorage);
const mockedBundleCode = vi.mocked(bundler.bundleCode);

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches persisted cells on mount and renders them in order", async () => {
    mockedLoadCells.mockResolvedValue([
      { id: "code-1", type: "code", content: "const count = 1;" },
      { id: "text-1", type: "text", content: "Notes" },
    ]);

    renderWithStore(<App />);

    expect(await screen.findByDisplayValue("const count = 1;")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Notes")).toBeInTheDocument();
    expect(mockedLoadCells).toHaveBeenCalledTimes(1);
  });

  it("lets the user add, edit, bundle, delete, and persist cells", async () => {
    mockedLoadCells.mockResolvedValue([
      { id: "text-1", type: "text", content: "Initial note" },
    ]);
    mockedSaveCells.mockResolvedValue(undefined);

    renderWithStore(<App />);

    const textEditors = await screen.findAllByLabelText("markdown editor");
    fireEvent.change(textEditors[0], { target: { value: "Updated note" } });

    const addCodeButtons = screen.getAllByRole("button", { name: "+ Code" });
    fireEvent.click(addCodeButtons[addCodeButtons.length - 1]);

    const codeEditor = await screen.findByLabelText("code editor");
    fireEvent.change(codeEditor, { target: { value: "console.log('hi');" } });

    await waitFor(() => {
      expect(mockedBundleCode).toHaveBeenCalled();
    });

    const deleteButtons = screen.getAllByRole("button", { name: "Delete cell" });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByTestId(/cell-/)).toHaveLength(1);
    });
    await waitFor(() => {
      expect(mockedSaveCells).toHaveBeenCalled();
    });
  });
});
