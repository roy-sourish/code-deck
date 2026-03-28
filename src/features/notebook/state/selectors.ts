import type { RootState } from "./rootReducer";
import type { Bundle } from "./types";

const emptyBundle: Bundle = {
  loading: false,
  code: "",
  err: "",
  requestId: undefined,
};

export const selectOrderedCellIds = (state: RootState) => state.cells.order;

export const selectCellById = (state: RootState, cellId: string) => {
  return state.cells.data[cellId];
};

export const selectBundleByCellId = (state: RootState, cellId: string) => {
  return state.bundles.data[cellId] ?? emptyBundle;
};
