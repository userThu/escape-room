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
      <aside className="pointer-events-none fixed right-5 top-5 z-20 w-72 rounded border border-white/15 bg-black/40 p-4 text-white/90 backdrop-blur">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
            Inventory
          </h2>
        </div>
        {gameState.inventoryItems.length > 0 ? (
          <ol className="space-y-2">
            {gameState.inventoryItems.slice(0, 9).map((item, index) => {
              const isSelected =
                item.id === gameState.selectedInventoryItemId;

              return (
                <li
                  className={`rounded border px-3 py-2 text-sm ${
                    isSelected
                      ? "border-amber-300/70 bg-amber-300/15 text-white"
                      : "border-white/10 bg-white/5 text-white/70"
                  }`}
                  key={item.id}
                >
                  <span className="mr-2 text-xs text-white/45">
                    {index + 1}
                  </span>
                  {item.name}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-white/55">No items collected.</p>
        )}
      </aside>

      {isNotebookOpen ? (
        <section className="fixed inset-y-8 left-1/2 z-30 flex w-[min(56rem,calc(100vw-2rem))] -translate-x-1/2 flex-col rounded border border-white/15 bg-zinc-950/95 text-white shadow-2xl backdrop-blur">
          <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold">Lab Journal</h2>
            <button
              className="pointer-events-auto rounded border border-white/15 px-3 py-1.5 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
              onClick={onCloseNotebook}
              type="button"
            >
              Close
            </button>
          </header>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-5 md:grid-cols-2">
            <div className="min-h-96 rounded border border-white/15 bg-zinc-100 shadow-inner" />
            <div className="min-h-96 rounded border border-white/15 bg-zinc-100 shadow-inner" />
          </div>
        </section>
      ) : null}
    </>
  );
}
