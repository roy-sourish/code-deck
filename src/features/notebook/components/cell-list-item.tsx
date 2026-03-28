import "./cell-list-item.css";
import ActionBar from "./action-bar";
import CodeCell from "./code-cell";
import TextEditor from "./text-editor";
import { useAppSelector } from "../state/hooks";
import { selectCellById } from "../state/selectors";

interface CellListItemProps {
  cellId: string;
  position: number;
}

export default function CellListItem({ cellId, position }: CellListItemProps) {
  const cell = useAppSelector((state) => selectCellById(state, cellId));

  if (!cell) {
    return null;
  }

  return (
    <div
      className={`cell-list-item cell-list-item--${cell.type}`}
      data-testid={`cell-${cell.id}`}
    >
      <ActionBar cellId={cellId} />
      <div className="cell-list-item__content">
        {cell.type === "code" ? (
          <CodeCell cellId={cellId} position={position} />
        ) : (
          <TextEditor cellId={cellId} />
        )}
      </div>
    </div>
  );
}
