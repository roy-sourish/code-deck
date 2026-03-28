import "./add-cell.css";
import type { CellType } from "../state/types";
import { insertCellAfter, insertCellBefore } from "../state/cellsSlice";
import { useAppDispatch } from "../state/hooks";

interface AddCellProps {
  previousCellId?: string;
  nextCellId?: string;
  forceVisible?: boolean;
}

export default function AddCell({
  previousCellId,
  nextCellId,
  forceVisible = false,
}: AddCellProps) {
  const dispatch = useAppDispatch();

  const onAddCell = (type: CellType) => {
    if (nextCellId) {
      dispatch(insertCellBefore({ id: nextCellId, type }));
      return;
    }

    dispatch(insertCellAfter({ id: previousCellId ?? "", type }));
  };

  return (
    <div className={`add-cell ${forceVisible ? "add-cell--force-visible" : ""}`}>
      <div className="add-cell__line" />
      <div className="add-cell__buttons">
        <button
          type="button"
          className="button is-small is-primary"
          onClick={() => onAddCell("code")}
        >
          + Code
        </button>
        <button
          type="button"
          className="button is-small is-link"
          onClick={() => onAddCell("text")}
        >
          + Text
        </button>
      </div>
    </div>
  );
}
