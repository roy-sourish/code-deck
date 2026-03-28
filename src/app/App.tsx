import "bulmaswatch/superhero/bulmaswatch.min.css";
import { useEffect } from "react";
import "./App.css";
import CellList from "../features/notebook/components/cell-list";
import {
  useAppDispatch,
  useAppSelector,
} from "../features/notebook/state/hooks";
import { fetchCells } from "../features/notebook/state/cellsSlice";

function App() {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.cells);

  useEffect(() => {
    void dispatch(fetchCells());
  }, [dispatch]);

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <p className="app-shell__eyebrow">CodeDeck</p>
        <h1 className="app-shell__title">Interactive notebook</h1>
        <p className="app-shell__subtitle">
          Mix executable code and markdown notes, with automatic previews and
          local persistence.
        </p>
      </header>

      {loading && (
        <div className="app-shell__status">Loading your saved notebook...</div>
      )}

      {error && (
        <div className="notification is-danger is-light app-shell__error">
          {error}
        </div>
      )}

      <CellList />
    </div>
  );
}

export default App;
