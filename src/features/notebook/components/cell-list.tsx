import "./cell-list.css";
import { Fragment } from "react";
import AddCell from "./add-cell";
import CellListItem from "./cell-list-item";
import { useAppSelector } from "../state/hooks";
import { selectOrderedCellIds } from "../state/selectors";

export default function CellList() {
  const cellIds = useAppSelector(selectOrderedCellIds);

  return (
    <div className="cell-list">
      <AddCell forceVisible nextCellId={cellIds[0]} />

      {cellIds.length === 0 && (
        <p className="cell-list__empty">
          Your notebook is empty. Add a code or text cell to get started.
        </p>
      )}

      {cellIds.map((cellId, index) => (
        <Fragment key={cellId}>
          <CellListItem cellId={cellId} position={index} />
          <AddCell previousCellId={cellId} />
        </Fragment>
      ))}
    </div>
  );
}
