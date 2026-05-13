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

export type EvidenceLabState = {
  evidenceVerified: boolean;
  loadedReactants: {
    bakingSoda: boolean;
    vinegar: boolean;
  };
  pressureTestComplete: boolean;
};

export type FinalMatterChamberId = "bubble" | "sieve" | "spiral";

export type FinalMatterChamberState = {
  slots: [string | null, string | null];
  stabilized: boolean;
};

export type FinalMatterReactorState = {
  chambers: Record<FinalMatterChamberId, FinalMatterChamberState>;
  finalAccessGranted: boolean;
  particleDisplaysEnabled: boolean;
};

export type GameState = {
  completedPuzzles: Record<string, PuzzleCompletion>;
  inventoryItems: InventoryItem[];
  selectedInventoryItemId: string | null;
  doorLockStates: Record<string, DoorLockState>;
  attempts: Record<string, number>;
  recordedResponses: RecordedResponse[];
  labNotebookEntries: LabNotebookEntry[];
  evidenceLab: EvidenceLabState;
  finalMatterReactor: FinalMatterReactorState;
};

const initialGameState: GameState = {
  completedPuzzles: {},
  inventoryItems: [],
  selectedInventoryItemId: null,
  doorLockStates: {},
  attempts: {},
  recordedResponses: [],
  labNotebookEntries: [],
  evidenceLab: {
    evidenceVerified: false,
    loadedReactants: {
      bakingSoda: false,
      vinegar: false,
    },
    pressureTestComplete: false,
  },
  finalMatterReactor: {
    chambers: {
      bubble: {
        slots: [null, null],
        stabilized: false,
      },
      sieve: {
        slots: [null, null],
        stabilized: false,
      },
      spiral: {
        slots: [null, null],
        stabilized: false,
      },
    },
    finalAccessGranted: false,
    particleDisplaysEnabled: false,
  },
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

export function removeInventoryItem(itemId: string) {
  setGameState((state) => {
    const inventoryItems = state.inventoryItems.filter(
      ({ id }) => id !== itemId,
    );

    return {
      ...state,
      inventoryItems,
      selectedInventoryItemId:
        state.selectedInventoryItemId === itemId
          ? (inventoryItems[0]?.id ?? null)
          : state.selectedInventoryItemId,
    };
  });
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

export function loadEvidenceReactant(reactant: keyof EvidenceLabState["loadedReactants"]) {
  setGameState((state) => ({
    ...state,
    evidenceLab: {
      ...state.evidenceLab,
      loadedReactants: {
        ...state.evidenceLab.loadedReactants,
        [reactant]: true,
      },
    },
  }));
}

export function markEvidencePressureTestComplete() {
  setGameState((state) => ({
    ...state,
    evidenceLab: {
      ...state.evidenceLab,
      pressureTestComplete: true,
    },
  }));
}

export function markEvidenceVerified() {
  setGameState((state) => ({
    ...state,
    evidenceLab: {
      ...state.evidenceLab,
      evidenceVerified: true,
    },
  }));
}

export function insertFinalMatterReactorItem(
  chamberId: FinalMatterChamberId,
  slotIndex: 0 | 1,
  itemId: string,
) {
  setGameState((state) => {
    const chamber = state.finalMatterReactor.chambers[chamberId];

    if (chamber.slots[slotIndex]) {
      return state;
    }

    const slots: [string | null, string | null] = [...chamber.slots] as [
      string | null,
      string | null,
    ];
    slots[slotIndex] = itemId;

    return {
      ...state,
      finalMatterReactor: {
        ...state.finalMatterReactor,
        chambers: {
          ...state.finalMatterReactor.chambers,
          [chamberId]: {
            ...chamber,
            slots,
          },
        },
      },
    };
  });
}

export function retrieveFinalMatterReactorItem(
  chamberId: FinalMatterChamberId,
  slotIndex: 0 | 1,
): string | null {
  let retrievedItemId: string | null = null;

  setGameState((state) => {
    const chamber = state.finalMatterReactor.chambers[chamberId];
    retrievedItemId = chamber.slots[slotIndex];

    if (!retrievedItemId) {
      return state;
    }

    const slots: [string | null, string | null] = [...chamber.slots] as [
      string | null,
      string | null,
    ];
    slots[slotIndex] = null;

    return {
      ...state,
      finalMatterReactor: {
        ...state.finalMatterReactor,
        chambers: {
          ...state.finalMatterReactor.chambers,
          [chamberId]: {
            ...chamber,
            slots,
            stabilized: false,
          },
        },
      },
    };
  });

  return retrievedItemId;
}

export function stabilizeFinalMatterReactorChamber(
  chamberId: FinalMatterChamberId,
) {
  setGameState((state) => ({
    ...state,
    finalMatterReactor: {
      ...state.finalMatterReactor,
      chambers: {
        ...state.finalMatterReactor.chambers,
        [chamberId]: {
          ...state.finalMatterReactor.chambers[chamberId],
          stabilized: true,
        },
      },
    },
  }));
}

export function grantFinalMatterAccess() {
  setGameState((state) => ({
    ...state,
    finalMatterReactor: {
      ...state.finalMatterReactor,
      finalAccessGranted: true,
    },
  }));
}

export function enableFinalMatterParticleDisplays() {
  setGameState((state) => ({
    ...state,
    finalMatterReactor: {
      ...state.finalMatterReactor,
      particleDisplaysEnabled: true,
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
