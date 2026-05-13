import { useSyncExternalStore } from "react";

export type PuzzleCompletion = {
  id: string;
  completedAt: number;
};

export type InventoryItem = {
  id: string;
  name: string;
  description?: string;
};

export type DoorLockState = "locked" | "unlocked";

export type RecordedResponse = {
  id: string;
  promptId: string;
  response: string;
  recordedAt: number;
};

export type LabNotebookEntry = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
};

export type GameState = {
  completedPuzzles: Record<string, PuzzleCompletion>;
  inventoryItems: InventoryItem[];
  selectedInventoryItemId: string | null;
  doorLockStates: Record<string, DoorLockState>;
  attempts: Record<string, number>;
  recordedResponses: RecordedResponse[];
  labNotebookEntries: LabNotebookEntry[];
};

const initialGameState: GameState = {
  completedPuzzles: {},
  inventoryItems: [],
  selectedInventoryItemId: null,
  doorLockStates: {},
  attempts: {},
  recordedResponses: [],
  labNotebookEntries: [],
};

let gameState = initialGameState;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function setGameState(updater: (state: GameState) => GameState) {
  gameState = updater(gameState);
  emitChange();
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return gameState;
}

export function getGameState() {
  return gameState;
}

export function useGameState() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function completePuzzle(puzzleId: string) {
  setGameState((state) => ({
    ...state,
    completedPuzzles: {
      ...state.completedPuzzles,
      [puzzleId]: {
        id: puzzleId,
        completedAt: Date.now(),
      },
    },
  }));
}

export function addInventoryItem(item: InventoryItem) {
  setGameState((state) => {
    if (state.inventoryItems.some(({ id }) => id === item.id)) {
      return state;
    }

    return {
      ...state,
      inventoryItems: [...state.inventoryItems, item],
      selectedInventoryItemId: state.selectedInventoryItemId ?? item.id,
    };
  });
}

export function selectInventoryItemByIndex(index: number) {
  setGameState((state) => ({
    ...state,
    selectedInventoryItemId: state.inventoryItems[index]?.id ?? null,
  }));
}

export function unlockDoor(doorId: string) {
  setGameState((state) => ({
    ...state,
    doorLockStates: {
      ...state.doorLockStates,
      [doorId]: "unlocked",
    },
  }));
}

export function recordResponse(promptId: string, response: string) {
  const recordedAt = Date.now();

  setGameState((state) => ({
    ...state,
    attempts: {
      ...state.attempts,
      [promptId]: (state.attempts[promptId] ?? 0) + 1,
    },
    recordedResponses: [
      ...state.recordedResponses,
      {
        id: `${promptId}-${recordedAt}`,
        promptId,
        response,
        recordedAt,
      },
    ],
  }));
}

export function addLabNotebookEntry(title: string, body: string) {
  const createdAt = Date.now();

  setGameState((state) => ({
    ...state,
    labNotebookEntries: [
      {
        id: `${title.toLowerCase().replaceAll(" ", "-")}-${createdAt}`,
        title,
        body,
        createdAt,
      },
      ...state.labNotebookEntries,
    ],
  }));
}
