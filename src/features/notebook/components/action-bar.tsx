import "./action-bar.css";
import { deleteCell, moveCell } from "../state/cellsSlice";
import { useAppDispatch, useAppSelector } from "../state/hooks";
import { selectOrderedCellIds } from "../state/selectors";

interface ActionBarProps {
  cellId: string;
}

export default function ActionBar({ cellId }: ActionBarProps) {
  const dispatch = useAppDispatch();
  const cellOrder = useAppSelector(selectOrderedCellIds);
  const currentIndex = cellOrder.indexOf(cellId);

  const isFirst = currentIndex <= 0;
  const isLast = currentIndex === cellOrder.length - 1;

  return (
    <div className="action-bar">
      <button
        type="button"
        className="button is-small is-dark"
        aria-label="Move cell up"
        disabled={isFirst}
        onClick={() => dispatch(moveCell({ id: cellId, direction: "up" }))}
      >
        Up
      </button>
      <button
        type="button"
        className="button is-small is-dark"
        aria-label="Move cell down"
        disabled={isLast}
        onClick={() => dispatch(moveCell({ id: cellId, direction: "down" }))}
      >
        Down
      </button>
      <button
        type="button"
        className="button is-small is-danger"
        aria-label="Delete cell"
        onClick={() => dispatch(deleteCell(cellId))}
      >
        Delete
      </button>
    </div>
  );
}
