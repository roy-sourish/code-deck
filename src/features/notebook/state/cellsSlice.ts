import {
  createAsyncThunk,
  createSlice,
  nanoid,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { loadCellsFromStorage, saveCellsToStorage } from "./cellStorage";
import type { RootState } from "./rootReducer";
import type { Cell, CellsState, CellType } from "./types";

interface UpdateCellPayload {
  id: string;
  content: string;
}

interface InsertCellPayload {
  id: string;
  type: CellType;
}

interface MoveCellPayload {
  id: string;
  direction: "up" | "down";
}

interface NormalizedCells {
  order: string[];
  data: Record<string, Cell>;
}

const initialState: CellsState = {
  loading: false,
  error: null,
  order: [],
  data: {},
};

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : "Something went wrong.";
};

const createCell = (type: CellType): Cell => {
  return {
    id: nanoid(),
    type,
    content: "",
  };
};

const normalizeCells = (cells: Cell[]): NormalizedCells => {
  return cells.reduce<NormalizedCells>(
    (accumulator, cell) => {
      accumulator.order.push(cell.id);
      accumulator.data[cell.id] = cell;
      return accumulator;
    },
    { order: [], data: {} },
  );
};

export const fetchCells = createAsyncThunk<Cell[], void, { rejectValue: string }>(
  "cells/fetch",
  async (_, { rejectWithValue }) => {
    try {
      return await loadCellsFromStorage();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const saveCells = createAsyncThunk<
  void,
  void,
  { state: RootState; rejectValue: string }
>("cells/save", async (_, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const orderedCells = state.cells.order
      .map((cellId) => state.cells.data[cellId])
      .filter((cell): cell is Cell => Boolean(cell));

    await saveCellsToStorage(orderedCells);
  } catch (error) {
    return rejectWithValue(
      `Unable to save your notebook. ${getErrorMessage(error)}`,
    );
  }
});

const cellsSlice = createSlice({
  name: "cells",
  initialState,
  reducers: {
    updateCell(state, action: PayloadAction<UpdateCellPayload>) {
      const cell = state.data[action.payload.id];

      if (!cell) {
        return;
      }

      cell.content = action.payload.content;
      state.error = null;
    },
    deleteCell(state, action: PayloadAction<string>) {
      delete state.data[action.payload];
      state.order = state.order.filter((cellId) => cellId !== action.payload);
      state.error = null;
    },
    insertCellBefore(state, action: PayloadAction<InsertCellPayload>) {
      const newCell = createCell(action.payload.type);
      state.data[newCell.id] = newCell;

      const index = state.order.findIndex((cellId) => cellId === action.payload.id);

      if (index < 0) {
        state.order.unshift(newCell.id);
      } else {
        state.order.splice(index, 0, newCell.id);
      }

      state.error = null;
    },
    insertCellAfter(state, action: PayloadAction<InsertCellPayload>) {
      const newCell = createCell(action.payload.type);
      state.data[newCell.id] = newCell;

      const index = state.order.findIndex((cellId) => cellId === action.payload.id);

      if (index < 0) {
        state.order.push(newCell.id);
      } else {
        state.order.splice(index + 1, 0, newCell.id);
      }

      state.error = null;
    },
    moveCell(state, action: PayloadAction<MoveCellPayload>) {
      const index = state.order.findIndex((cellId) => cellId === action.payload.id);

      if (index < 0) {
        return;
      }

      const targetIndex =
        action.payload.direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= state.order.length) {
        return;
      }

      [state.order[index], state.order[targetIndex]] = [
        state.order[targetIndex],
        state.order[index],
      ];
      state.error = null;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(fetchCells.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCells.fulfilled, (state, action) => {
        const normalized = normalizeCells(action.payload);
        state.loading = false;
        state.error = null;
        state.order = normalized.order;
        state.data = normalized.data;
      })
      .addCase(fetchCells.rejected, (state, action) => {
        state.loading = false;
        state.order = [];
        state.data = {};
        state.error =
          action.payload ??
          "Unable to load your notebook. Starting with an empty notebook.";
      })
      .addCase(saveCells.fulfilled, (state) => {
        state.error = null;
      })
      .addCase(saveCells.rejected, (state, action) => {
        state.error = action.payload ?? "Unable to save your notebook.";
      });
  },
});

export const {
  updateCell,
  deleteCell,
  insertCellBefore,
  insertCellAfter,
  moveCell,
} = cellsSlice.actions;

export default cellsSlice.reducer;
