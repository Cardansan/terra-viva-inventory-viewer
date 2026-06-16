"use client";

import type { TreeMoment } from "@/lib/catalogTypes";

type SelectedMomentCardProps = {
  displayNumber: number;
  moment: TreeMoment;
  onRemove: (momentId: string) => void;
  readOnly?: boolean;
};

export function SelectedMomentCard({
  displayNumber,
  moment,
  onRemove,
  readOnly = false
}: SelectedMomentCardProps) {
  return (
    <article className="flex min-w-0 items-center gap-3 rounded-lg bg-white p-2 shadow-sm ring-1 ring-terra-moss/20">
      <div
        className="h-16 w-16 shrink-0 rounded-md bg-cover bg-center"
        style={{ backgroundImage: `url(${moment.thumbnailUrl})` }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-base font-black text-terra-ink">
          &Aacute;rbol #{displayNumber.toString().padStart(2, "0")}
        </p>
        <p className="text-sm font-bold text-terra-ink/55">Seleccionado</p>
      </div>
      {readOnly ? null : (
        <button
          className="min-h-10 rounded-lg border border-terra-moss/30 bg-terra-paper px-3 text-sm font-black text-terra-ink"
          onClick={() => onRemove(moment.id)}
          type="button"
        >
          Quitar
        </button>
      )}
    </article>
  );
}
