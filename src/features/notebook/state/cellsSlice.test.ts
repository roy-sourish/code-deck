import { beforeEach, describe, expect, it, vi } from "vitest";
import * as cellStorage from "./cellStorage";
import reducer, {
  deleteCell,
  fetchCells,
  insertCellAfter,
  insertCellBefore,
  moveCell,
  saveCells,
  updateCell,
} from "./cellsSlice";
import { createAppStore } from "./store";
import type { Cell } from "./types";

vi.mock("./cellStorage", () => ({
  loadCellsFromStorage: vi.fn(),
  saveCellsToStorage: vi.fn(),
}));

vi.mock("../../../lib/bundler", () => ({
  bundleCode: vi.fn(),
}));

const mockedLoadCells = vi.mocked(cellStorage.loadCellsFromStorage);
const mockedSaveCells = vi.mocked(cellStorage.saveCellsToStorage);

describe("cellsSlice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts cells before and after the target cell", () => {
    let state = reducer(undefined, insertCellAfter({ id: "", type: "code" }));
    const firstId = state.order[0];

    state = reducer(state, insertCellAfter({ id: firstId, type: "text" }));
    const secondId = state.order[1];

    state = reducer(state, insertCellBefore({ id: secondId, type: "code" }));

    expect(state.order).toHaveLength(3);
    expect(state.data[state.order[0]].type).toBe("code");
    expect(state.data[state.order[1]].type).toBe("code");
    expect(state.data[state.order[2]].type).toBe("text");
  });

  it("updates and deletes a cell", () => {
    let state = reducer(undefined, insertCellAfter({ id: "", type: "text" }));
    const cellId = state.order[0];

    state = reducer(state, updateCell({ id: cellId, content: "Hello world" }));
    expect(state.data[cellId].content).toBe("Hello world");

    state = reducer(state, deleteCell(cellId));
    expect(state.order).toEqual([]);
    expect(state.data[cellId]).toBeUndefined();
  });

  it("moves cells without crossing list boundaries", () => {
    let state = reducer(undefined, insertCellAfter({ id: "", type: "code" }));
    const firstId = state.order[0];
    state = reducer(state, insertCellAfter({ id: firstId, type: "text" }));
    const secondId = state.order[1];

    state = reducer(state, moveCell({ id: firstId, direction: "up" }));
    expect(state.order).toEqual([firstId, secondId]);

    state = reducer(state, moveCell({ id: firstId, direction: "down" }));
    expect(state.order).toEqual([secondId, firstId]);

    state = reducer(state, moveCell({ id: firstId, direction: "down" }));
    expect(state.order).toEqual([secondId, firstId]);
  });

  it("fetches and normalizes persisted cells", async () => {
    const savedCells: Cell[] = [
      { id: "one", type: "code", content: "const one = 1;" },
      { id: "two", type: "text", content: "# Two" },
    ];
    mockedLoadCells.mockResolvedValue(savedCells);
    const store = createAppStore();

    await store.dispatch(fetchCells());

    expect(store.getState().cells.order).toEqual(["one", "two"]);
    expect(store.getState().cells.data.one.content).toBe("const one = 1;");
    expect(mockedLoadCells).toHaveBeenCalledTimes(1);
  });

  it("saves ordered cells through the save thunk", async () => {
    mockedSaveCells.mockResolvedValue(undefined);
    const store = createAppStore();

    store.dispatch(insertCellAfter({ id: "", type: "code" }));
    const cellId = store.getState().cells.order[0];
    store.dispatch(updateCell({ id: cellId, content: "const value = 7;" }));

    await store.dispatch(saveCells());

    expect(mockedSaveCells).toHaveBeenCalledWith([
      { id: cellId, type: "code", content: "const value = 7;" },
    ]);
  });

  it("debounces persistence after mutations", async () => {
    vi.useFakeTimers();
    mockedSaveCells.mockResolvedValue(undefined);
    const store = createAppStore();

    store.dispatch(insertCellAfter({ id: "", type: "code" }));
    const cellId = store.getState().cells.order[0];
    store.dispatch(updateCell({ id: cellId, content: "first" }));
    store.dispatch(updateCell({ id: cellId, content: "second" }));

    await vi.advanceTimersByTimeAsync(499);
    expect(mockedSaveCells).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(mockedSaveCells).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("stores a readable error when persistence fails", async () => {
    mockedSaveCells.mockRejectedValue(new Error("Disk full"));
    const store = createAppStore();

    store.dispatch(insertCellAfter({ id: "", type: "text" }));
    await store.dispatch(saveCells());

    expect(store.getState().cells.error).toContain("Unable to save your notebook");
  });
});
