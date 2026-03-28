import {
  configureStore,
  createListenerMiddleware,
  isAnyOf,
  type ThunkDispatch,
  type UnknownAction,
} from "@reduxjs/toolkit";
import {
  deleteCell,
  insertCellAfter,
  insertCellBefore,
  moveCell,
  saveCells,
  updateCell,
} from "./cellsSlice";
import { rootReducer, type RootState } from "./rootReducer";

export type AppDispatch = ThunkDispatch<RootState, unknown, UnknownAction>;

export const createAppStore = (preloadedState?: Partial<RootState>) => {
  const listenerMiddleware = createListenerMiddleware<RootState, AppDispatch>();

  const store = configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState as RootState | undefined,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(listenerMiddleware.middleware),
  });

  listenerMiddleware.startListening({
    matcher: isAnyOf(
      updateCell,
      deleteCell,
      insertCellBefore,
      insertCellAfter,
      moveCell,
    ),
    effect: async (_, listenerApi) => {
      listenerApi.cancelActiveListeners();
      await listenerApi.delay(500);
      await listenerApi.dispatch(saveCells());
    },
  });

  return store;
};

export const store = createAppStore();

export type AppStore = ReturnType<typeof createAppStore>;
