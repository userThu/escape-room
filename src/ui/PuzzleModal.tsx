"use client";

type PuzzleModalProps = {
  isOpen: boolean;
  title: string;
  body: string;
  onComplete: () => void;
  onClose: () => void;
};

export function PuzzleModal({
  isOpen,
  title,
  body,
  onComplete,
  onClose,
}: PuzzleModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <section className="fixed left-1/2 top-1/2 z-30 flex w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded border border-white/15 bg-zinc-950/95 text-white shadow-2xl backdrop-blur">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          className="rounded border border-white/15 px-3 py-1.5 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </header>
      <div className="px-5 py-4">
        <p className="text-sm leading-6 text-white/70">{body}</p>
      </div>
      <footer className="flex justify-end gap-3 border-t border-white/10 px-5 py-4">
        <button
          className="rounded border border-white/15 px-3 py-1.5 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded border border-amber-300/60 bg-amber-300/15 px-3 py-1.5 text-sm font-medium text-amber-100 transition hover:bg-amber-300/25"
          onClick={onComplete}
          type="button"
        >
          Complete
        </button>
      </footer>
    </section>
  );
}
