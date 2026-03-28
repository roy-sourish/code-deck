export type CellType = "code" | "text";

export interface Cell {
  id: string;
  type: CellType;
  content: string;
}

export interface CellsState {
  loading: boolean;
  error: string | null;
  order: string[];
  data: Record<string, Cell>;
}

export interface Bundle {
  loading: boolean;
  code: string;
  err: string;
  requestId?: string;
}

export interface BundlesState {
  data: Record<string, Bundle>;
}
