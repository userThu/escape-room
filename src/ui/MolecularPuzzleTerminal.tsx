"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { molecularPuzzleEntries } from "@/src/game/molecularStructuresRoom";

type MolecularPuzzleTerminalProps = {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};

function normalizeFormula(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

export function MolecularPuzzleTerminal({
  isOpen,
  onClose,
  onComplete,
}: MolecularPuzzleTerminalProps) {
  const initialAnswers = useMemo(
    () =>
      Object.fromEntries(
        molecularPuzzleEntries.map((entry) => [entry.id, ""]),
      ) as Record<string, string>,
    [],
  );
  const [answers, setAnswers] = useState(initialAnswers);
  const [status, setStatus] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = () => {
    const incomplete = molecularPuzzleEntries.some(
      (entry) => !answers[entry.id]?.trim(),
    );

    if (incomplete) {
      setStatus("Entries saved. Complete every field to run verification.");
      return;
    }

    const hasMismatch = molecularPuzzleEntries.some(
      (entry) =>
        normalizeFormula(answers[entry.id]) !== normalizeFormula(entry.answer),
    );

    if (hasMismatch) {
      setStatus("One or more formula assignments are incorrect.");
      return;
    }

    setStatus(null);
    onComplete();
  };

  return (
    <section className="fixed left-1/2 top-1/2 z-30 flex max-h-[min(44rem,calc(100vh-2rem))] w-[min(52rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded border border-cyan-300/25 bg-slate-950/95 text-cyan-50 shadow-2xl shadow-cyan-950/40 backdrop-blur">
      <header className="flex items-center justify-between border-b border-cyan-300/15 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">Molecular Structures Terminal</h2>
          <p className="mt-1 text-xs text-cyan-100/55">
            Match each observed structure to its formula.
          </p>
        </div>
        <button
          className="rounded border border-cyan-200/20 px-3 py-1.5 text-sm text-cyan-100/75 transition hover:bg-cyan-100/10 hover:text-cyan-50"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </header>
      <div className="min-h-0 overflow-y-auto p-5">
        <div className="grid gap-3">
          {molecularPuzzleEntries.map((entry, index) => (
            <label
              className="grid grid-cols-[4.5rem_1fr] items-center gap-4 rounded border border-cyan-200/10 bg-cyan-50/[0.03] p-3 sm:grid-cols-[5rem_1fr_12rem]"
              key={entry.id}
            >
              <span className="flex h-16 items-center justify-center rounded bg-slate-900/80 p-2">
                <Image
                  alt=""
                  className="max-h-full max-w-full grayscale opacity-35 contrast-75"
                  height={56}
                  src={entry.texturePath}
                  width={56}
                />
              </span>
              <span className="text-sm text-cyan-100/70">
                Structure {index + 1}
              </span>
              <input
                className="rounded border border-cyan-200/20 bg-slate-950 px-3 py-2 font-mono text-sm text-cyan-50 outline-none transition placeholder:text-cyan-100/25 focus:border-cyan-200/60"
                onChange={(event) =>
                  setAnswers((current) => ({
                    ...current,
                    [entry.id]: event.target.value,
                  }))
                }
                placeholder="Enter"
                value={answers[entry.id]}
              />
            </label>
          ))}
        </div>
        {status ? (
          <p className="mt-4 rounded border border-amber-300/25 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
            {status}
          </p>
        ) : null}
      </div>
      <footer className="flex justify-end gap-3 border-t border-cyan-300/15 px-5 py-4">
        <button
          className="rounded border border-cyan-200/20 px-3 py-1.5 text-sm text-cyan-100/75 transition hover:bg-cyan-100/10 hover:text-cyan-50"
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded border border-cyan-200/50 bg-cyan-200/15 px-3 py-1.5 text-sm font-medium text-cyan-50 transition hover:bg-cyan-200/25"
          onClick={handleSubmit}
          type="button"
        >
          Submit formulas
        </button>
      </footer>
    </section>
  );
}
