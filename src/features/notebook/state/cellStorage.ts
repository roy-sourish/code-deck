import localforage from "localforage";
import type { Cell, CellType } from "./types";

const cellStorage = localforage.createInstance({
  name: "code-deck",
});

const CELL_STORAGE_KEY = "cells";
const validCellTypes: CellType[] = ["code", "text"];

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isCell = (value: unknown): value is Cell => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.content === "string" &&
    typeof value.type === "string" &&
    validCellTypes.includes(value.type as CellType)
  );
};

export const loadCellsFromStorage = async (): Promise<Cell[]> => {
  const savedCells = await cellStorage.getItem<unknown>(CELL_STORAGE_KEY);

  if (savedCells === null) {
    return [];
  }

  if (!Array.isArray(savedCells) || !savedCells.every(isCell)) {
    throw new Error(
      "Saved notebook data is invalid. Starting with an empty notebook.",
    );
  }

  return savedCells;
};

export const saveCellsToStorage = async (cells: Cell[]) => {
  await cellStorage.setItem(CELL_STORAGE_KEY, cells);
};
