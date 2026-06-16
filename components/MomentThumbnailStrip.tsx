"use client";

import type { TreeMoment } from "@/lib/catalogTypes";

type MomentThumbnailStripProps = {
  moments: TreeMoment[];
  numberingMoments?: TreeMoment[];
  selectedMomentIds?: string[];
  selectedMomentId: string;
  title?: string;
  onSelectMoment: (momentId: string) => void;
};

export function MomentThumbnailStrip({
  moments,
  numberingMoments = moments,
  selectedMomentIds = [],
  selectedMomentId,
  title = "Todos los \u00c1rboles",
  onSelectMoment
}: MomentThumbnailStripProps) {
  if (moments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-terra-moss/50 bg-white/70 p-5 text-center text-terra-ink/75">
        No hay &aacute;rboles visibles en este cat&aacute;logo.
      </div>
    );
  }

  return (
    <section aria-label="Miniaturas de arboles" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black text-terra-ink">{title}</h2>
        <span className="text-sm font-bold text-terra-ink/65">
          {moments.length}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {moments.map((moment, index) => {
          const isSelected = moment.id === selectedMomentId;
          const isInSelection = selectedMomentIds.includes(moment.id);
          const publicIndex = numberingMoments.findIndex(
            (numberingMoment) => numberingMoment.id === moment.id
          );
          const displayNumber = publicIndex >= 0 ? publicIndex + 1 : index + 1;

          return (
            <button
              aria-label={`Seleccionar arbol ${displayNumber}`}
              className={`min-w-[132px] rounded-lg bg-white p-2 text-left shadow-sm ring-2 transition ${
                isSelected || isInSelection
                  ? "ring-terra-clay"
                  : "ring-transparent hover:ring-terra-moss/40"
              }`}
              key={moment.id}
              onClick={() => onSelectMoment(moment.id)}
              type="button"
            >
              <div
                className="relative aspect-[4/3] overflow-hidden rounded-md bg-cover bg-center"
                style={{ backgroundImage: `url(${moment.thumbnailUrl})` }}
              >
                <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-1 text-sm font-black text-terra-ink">
                  #{displayNumber.toString().padStart(2, "0")}
                </span>
                {isInSelection ? (
                  <span className="absolute bottom-2 right-2 rounded-full bg-[#1f8f4d] px-2 py-1 text-xs font-black text-white">
                    {"\u2713"}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
