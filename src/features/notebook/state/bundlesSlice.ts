import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { bundleCode } from "../../../lib/bundler";
import { deleteCell } from "./cellsSlice";
import type { Bundle, BundlesState } from "./types";

interface CreateBundlePayload {
  cellId: string;
  input: string;
}

interface BundleResult {
  cellId: string;
  code: string;
  err: string;
}

interface BundleError {
  cellId: string;
  err: string;
}

const initialBundle: Bundle = {
  loading: false,
  code: "",
  err: "",
  requestId: undefined,
};

const initialState: BundlesState = {
  data: {},
};

export const createBundle = createAsyncThunk<
  BundleResult,
  CreateBundlePayload,
  { rejectValue: BundleError }
>("bundles/create", async ({ cellId, input }, { rejectWithValue }) => {
  try {
    const result = await bundleCode(input);
    return {
      cellId,
      code: result.code,
      err: result.err,
    };
  } catch (error) {
    return rejectWithValue({
      cellId,
      err: error instanceof Error ? error.message : "Unable to bundle code.",
    });
  }
});

const bundlesSlice = createSlice({
  name: "bundles",
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(createBundle.pending, (state, action) => {
        state.data[action.meta.arg.cellId] = {
          ...(state.data[action.meta.arg.cellId] ?? initialBundle),
          loading: true,
          err: "",
          requestId: action.meta.requestId,
        };
      })
      .addCase(createBundle.fulfilled, (state, action) => {
        const currentBundle = state.data[action.payload.cellId];

        if (currentBundle?.requestId !== action.meta.requestId) {
          return;
        }

        state.data[action.payload.cellId] = {
          loading: false,
          code: action.payload.code,
          err: action.payload.err,
          requestId: undefined,
        };
      })
      .addCase(createBundle.rejected, (state, action) => {
        const cellId = action.payload?.cellId ?? action.meta.arg.cellId;
        const currentBundle = state.data[cellId];

        if (currentBundle?.requestId !== action.meta.requestId) {
          return;
        }

        state.data[cellId] = {
          ...(state.data[cellId] ?? initialBundle),
          loading: false,
          err: action.payload?.err ?? "Unable to bundle code.",
          requestId: undefined,
        };
      })
      .addCase(deleteCell, (state, action) => {
        delete state.data[action.payload];
      });
  },
});

export default bundlesSlice.reducer;
