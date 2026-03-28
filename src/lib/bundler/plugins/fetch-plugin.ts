import * as esbuild from "esbuild-wasm";
import axios from "axios";
import localforage from "localforage";

const fileCache = localforage.createInstance({
  name: "filecache",
});

export const fetchPlugin = (inputCode: string) => {
  return {
    name: "fetch-plugin",
    setup(build: esbuild.PluginBuild) {
      build.onLoad(
        { filter: /(^index\.js$)/ },
        async (args: esbuild.OnLoadArgs) => {
          if (args.path === "index.js") {
            return {
              loader: "jsx",
              contents: `
                import React from "react";
                import { createRoot } from "react-dom/client";

                const rootElement = document.querySelector("#root");

                if (!rootElement) {
                  throw new Error("Preview root element was not found.");
                }

                let reactRoot;
                let hasRendered = false;

                const renderValue = (value) => {
                  if (React.isValidElement(value) || typeof value === "function") {
                    if (!reactRoot) {
                      reactRoot = createRoot(rootElement);
                    }

                    const element = React.isValidElement(value)
                      ? value
                      : React.createElement(value);

                    reactRoot.render(element);
                    hasRendered = true;
                    return;
                  }

                  if (typeof value === "object") {
                    rootElement.innerHTML = "<pre>" + JSON.stringify(value, null, 2) + "</pre>";
                    hasRendered = true;
                    return;
                  }

                  rootElement.innerHTML = String(value);
                  hasRendered = true;
                };

                const show = (value) => {
                  renderValue(value);
                };

                window.show = show;

                const start = async () => {
                  const userModule = await import("__codedeck_user_input__");
                  const exportedComponent = userModule.default;

                  if (!hasRendered && exportedComponent) {
                    renderValue(exportedComponent);
                  }
                };

                start().catch(show);
              `,
            };
          }
        },
      );

      build.onLoad(
        { filter: /(^__codedeck_user_input__$)/ },
        async (args: esbuild.OnLoadArgs) => {
          if (args.path === "__codedeck_user_input__") {
            return {
              loader: "jsx",
              contents: inputCode,
            };
          }
        },
      );

      build.onLoad(
        { filter: /.*/, namespace: "a" },
        async (args: esbuild.OnLoadArgs) => {
          const cachedResult = await fileCache.getItem<esbuild.OnLoadResult>(
            args.path,
          );
          if (cachedResult) return cachedResult;
        },
      );

      // CSS handler
      build.onLoad(
        { filter: /\.css$/, namespace: "a" },
        async (args: esbuild.OnLoadArgs) => {
          const cachedResult = await fileCache.getItem<esbuild.OnLoadResult>(
            args.path,
          );
          if (cachedResult) return cachedResult;

          const { data, request } = await axios.get(args.path);

          const contents = `
          const style = document.createElement('style');
          style.innerText = \`${data}\`;
          document.head.appendChild(style);
          export default {};
        `;

          const result: esbuild.OnLoadResult = {
            loader: "jsx",
            contents,
            resolveDir: new URL("./", request.responseURL).pathname,
          };

          await fileCache.setItem(args.path, result);

          return result;
        },
      );

      // Generic Catch all Loader for plain js files
      build.onLoad(
        { filter: /.*/, namespace: "a" },
        async (args: esbuild.OnLoadArgs) => {
          const { data, request } = await axios.get(args.path);

          const result: esbuild.OnLoadResult = {
            loader: "jsx",
            contents: data,
            resolveDir: new URL("./", request.responseURL).pathname,
          };

          await fileCache.setItem(args.path, result);

          return result;
        },
      );
    },
  };
};
