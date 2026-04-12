import * as esbuild from "esbuild-wasm";
import { fetchPlugin } from "./plugins/fetch-plugin";
import { unpkgPathPlugin } from "./plugins/unpkg-path-plugin";

let initializedPromise: Promise<void> | null = null;

export const startService = async () => {
  if (!initializedPromise) {
    initializedPromise = esbuild.initialize({
      worker: true,
      wasmURL: "/esbuild.wasm",
    });
  }

  return initializedPromise;
};

export const bundleCode = async (input: string) => {
  await startService();

  try {
    const result = await esbuild.build({
      entryPoints: ["index.js"],
      bundle: true,
      write: false,
      plugins: [unpkgPathPlugin(), fetchPlugin(input)], // executed left to right
      define: {
        "process.env.NODE_ENV": '"production"',
        global: "window",
      },
    });
    return { code: result.outputFiles[0].text, err: "" };
  } catch (error) {
    return {
      code: "",
      err: error instanceof Error ? error.message : String(error),
    };
  }
};
