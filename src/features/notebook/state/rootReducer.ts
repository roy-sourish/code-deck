import { combineReducers } from "@reduxjs/toolkit";
import bundlesReducer from "./bundlesSlice";
import cellsReducer from "./cellsSlice";

export const rootReducer = combineReducers({
  cells: cellsReducer,
  bundles: bundlesReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
