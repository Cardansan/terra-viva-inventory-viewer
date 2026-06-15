type MomentNavigatorProps = {
  currentLabel: string;
  onPrevious: () => void;
  onNext: () => void;
};

export function MomentNavigator({
  currentLabel,
  onPrevious,
  onNext
}: MomentNavigatorProps) {
  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)_64px] items-center gap-2 sm:grid-cols-[72px_minmax(0,1fr)_72px] sm:gap-3">
      <button
        aria-label="Ver árbol anterior"
        className="flex h-16 w-full items-center justify-center rounded-lg bg-white text-4xl font-black text-terra-leaf shadow-soft ring-1 ring-terra-moss/25 transition hover:bg-terra-paper"
        onClick={onPrevious}
        type="button"
      >
        ‹
      </button>
      <div className="min-w-0 px-1 py-2 text-center sm:px-3">
        <p className="break-words text-xl font-black leading-tight text-terra-ink sm:text-3xl">
          {currentLabel}
        </p>
      </div>
      <button
        aria-label="Ver siguiente árbol"
        className="flex h-16 w-full items-center justify-center rounded-lg bg-white text-4xl font-black text-terra-leaf shadow-soft ring-1 ring-terra-moss/25 transition hover:bg-terra-paper"
        onClick={onNext}
        type="button"
      >
        ›
      </button>
    </div>
  );
}
