import { useEffect } from "react";
import "./code-cell.css";
import CodeEditor from "./code-editor";
import Preview from "./preview";
import Resizable from "./resizeable";
import { createBundle } from "../state/bundlesSlice";
import { updateCell } from "../state/cellsSlice";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { selectBundleByCellId, selectCellById } from "../state/selectors";

interface CodeCellProps {
  cellId: string;
  position: number;
}

function CodeCell({ cellId, position }: CodeCellProps) {
  const dispatch = useAppDispatch();
  const cell = useAppSelector((state) => selectCellById(state, cellId));
  const bundle = useAppSelector((state) => selectBundleByCellId(state, cellId));

  useEffect(() => {
    if (!cell) {
      return;
    }

    const timer = window.setTimeout(() => {
      void dispatch(createBundle({ cellId, input: cell.content }));
    }, 800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [cell, cellId, dispatch]);

  if (!cell) {
    return null;
  }

  return (
    <Resizable direction="vertical">
      <div className="code-cell">
        {bundle.loading && <div className="code-cell__status">Bundling...</div>}
        <Resizable direction="horizontal">
          <CodeEditor
            editorInstanceKey={`${cellId}-${position}`}
            value={cell.content}
            onChange={(value) => {
              dispatch(updateCell({ id: cellId, content: value }));
            }}
          />
        </Resizable>
        <Preview code={bundle.code} err={bundle.err} />
      </div>
    </Resizable>
  );
}

export default CodeCell;
