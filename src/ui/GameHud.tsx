"use client";

import { useGameState } from "@/src/state";

type GameHudProps = {
  isNotebookOpen: boolean;
  onCloseNotebook: () => void;
};

export function GameHud({ isNotebookOpen, onCloseNotebook }: GameHudProps) {
  const gameState = useGameState();

  return (
    <>
      <section className="fixed right-4 top-4 z-20 rounded-lg bg-slate-950/80 p-4 text-white shadow-lg">
        <h2 className="mb-2 text-lg font-bold">Inventory</h2>

        {gameState.inventoryItems.length > 0 ? (
          <ol className="space-y-1">
            {gameState.inventoryItems.slice(0, 9).map((item, index) => {
              const isSelected = item.id === gameState.selectedInventoryItemId;

              return (
                <li
                  key={item.id}
                  className={isSelected ? "font-bold text-cyan-300" : ""}
                >
                  <span className="mr-2">{index + 1}.</span>
                  {item.name}
                </li>
              );
            })}
          </ol>
        ) : (
          <p>No items collected.</p>
        )}
      </section>

      {isNotebookOpen ? (
        <section className="fixed inset-8 z-50 overflow-y-auto rounded-xl bg-amber-50 p-6 text-slate-950 shadow-2xl">
          <div className="mb-4 flex items-center justify-between border-b border-amber-300 pb-3">
            <h2 className="text-2xl font-bold">Lab Journal</h2>
            <button
              type="button"
              onClick={onCloseNotebook}
              className="rounded bg-slate-900 px-3 py-1 text-white"
            >
              Close
            </button>
          </div>

          {gameState.labNotebookEntries.length > 0 ? (
            <div className="space-y-4">
              {gameState.labNotebookEntries.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-lg border border-amber-300 bg-white/70 p-4"
                >
                  <h3 className="text-lg font-semibold">{entry.title}</h3>
                  <p className="mt-2 whitespace-pre-line leading-relaxed">
                    {entry.body}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="italic text-slate-600">
              No lab notes recorded yet. Solve puzzles to add observations here.
            </p>
          )}
        </section>
      ) : null}
    </>
  );
}
