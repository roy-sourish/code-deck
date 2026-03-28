import { render } from "@testing-library/react";
import type { PropsWithChildren, ReactElement } from "react";
import { Provider } from "react-redux";
import type { RootState } from "../features/notebook/state/rootReducer";
import {
  createAppStore,
  type AppStore,
} from "../features/notebook/state/store";

interface RenderWithStoreOptions {
  preloadedState?: Partial<RootState>;
  store?: AppStore;
}

export const renderWithStore = (
  ui: ReactElement,
  options: RenderWithStoreOptions = {},
) => {
  const store = options.store ?? createAppStore(options.preloadedState);

  const Wrapper = ({ children }: PropsWithChildren) => {
    return <Provider store={store}>{children}</Provider>;
  };

  return {
    store,
    ...render(ui, { wrapper: Wrapper }),
  };
};
