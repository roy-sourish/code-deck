import { beforeEach, describe, expect, it, vi } from "vitest";
import * as bundler from "../../../lib/bundler";
import { createBundle } from "./bundlesSlice";
import { createAppStore } from "./store";

vi.mock("../../../lib/bundler", () => ({
  bundleCode: vi.fn(),
}));

const mockedBundleCode = vi.mocked(bundler.bundleCode);

describe("bundlesSlice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores separate bundle results per cell", async () => {
    mockedBundleCode
      .mockResolvedValueOnce({ code: "compiled one", err: "" })
      .mockResolvedValueOnce({ code: "compiled two", err: "" });

    const store = createAppStore();

    await store.dispatch(createBundle({ cellId: "one", input: "const one = 1;" }));
    await store.dispatch(createBundle({ cellId: "two", input: "const two = 2;" }));

    expect(store.getState().bundles.data.one.code).toBe("compiled one");
    expect(store.getState().bundles.data.two.code).toBe("compiled two");
  });

  it("marks bundle state as loading while bundling", async () => {
    let resolveBundle: ((value: { code: string; err: string }) => void) | undefined;
    mockedBundleCode.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveBundle = resolve;
        }),
    );

    const store = createAppStore();
    const actionPromise = store.dispatch(
      createBundle({ cellId: "loading-cell", input: "const loading = true;" }),
    );

    expect(store.getState().bundles.data["loading-cell"].loading).toBe(true);

    resolveBundle?.({ code: "done", err: "" });
    await actionPromise;

    expect(store.getState().bundles.data["loading-cell"].loading).toBe(false);
  });

  it("captures rejected bundle errors", async () => {
    mockedBundleCode.mockRejectedValue(new Error("Bundle exploded"));
    const store = createAppStore();

    await store.dispatch(createBundle({ cellId: "bad", input: "throw 1" }));

    expect(store.getState().bundles.data.bad.err).toBe("Bundle exploded");
  });

  it("keeps the newest bundle result when requests resolve out of order", async () => {
    let resolveFirst: ((value: { code: string; err: string }) => void) | undefined;
    let resolveSecond: ((value: { code: string; err: string }) => void) | undefined;

    mockedBundleCode
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );

    const store = createAppStore();

    const firstRequest = store.dispatch(
      createBundle({ cellId: "race", input: "first" }),
    );
    const secondRequest = store.dispatch(
      createBundle({ cellId: "race", input: "second" }),
    );

    resolveSecond?.({ code: "second result", err: "" });
    await secondRequest;

    resolveFirst?.({ code: "stale result", err: "" });
    await firstRequest;

    expect(store.getState().bundles.data.race.code).toBe("second result");
  });
});
