import "./text-editor.css";
import MDEditor from "@uiw/react-md-editor";
import { useEffect, useRef, useState } from "react";
import { updateCell } from "../state/cellsSlice";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { selectCellById } from "../state/selectors";

interface TextEditorProps {
  cellId: string;
}

export default function TextEditor({ cellId }: TextEditorProps) {
  const dispatch = useAppDispatch();
  const cell = useAppSelector((state) => selectCellById(state, cellId));
  const [editing, setEditing] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (
        ref.current &&
        event.target &&
        ref.current.contains(event.target as Node)
      ) {
        return;
      }

      setEditing(false);
    };
    document.addEventListener("click", listener, { capture: true });

    return () => {
      document.removeEventListener("click", listener, { capture: true });
    };
  }, []);

  if (!cell) {
    return null;
  }

  if (editing) {
    return (
      <div ref={ref} data-color-mode="dark">
        <MDEditor
          value={cell.content}
          onChange={(value) => {
            dispatch(updateCell({ id: cellId, content: value ?? "" }));
          }}
        />
      </div>
    );
  }

  return (
    <div className="card text-editor-card" onClick={() => setEditing(true)}>
      <div className="card-content">
        <div className="content">
          <MDEditor.Markdown
            source={cell.content || "Click to add notes to this cell."}
            style={{ whiteSpace: "pre-wrap" }}
          />
        </div>
      </div>
    </div>
  );
}
