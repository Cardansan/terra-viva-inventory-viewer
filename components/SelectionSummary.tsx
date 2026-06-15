"use client";

type SelectionSummaryProps = {
  count: number;
};

export function SelectionSummary({ count }: SelectionSummaryProps) {
  const label =
    count === 0
      ? "0 seleccionados"
      : count === 1
        ? "1 seleccionado"
        : `${count} seleccionados`;

  return (
    <p className="text-center text-base font-black text-terra-ink/70">
      {label}
    </p>
  );
}
