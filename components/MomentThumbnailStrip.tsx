"use client";

import type { TreeMoment } from "@/lib/catalogTypes";
import { formatTimestamp } from "@/lib/time";
import { StatusBadge } from "./StatusBadge";

type MomentThumbnailStripProps = {
  moments: TreeMoment[];
  selectedMomentId: string;
  onSelectMoment: (momentId: string) => void;
};

export function MomentThumbnailStrip({
  moments,
  selectedMomentId,
  onSelectMoment
}: MomentThumbnailStripProps) {
  if (moments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-terra-moss/50 bg-white/70 p-5 text-center text-terra-ink/75">
        No hay árboles visibles en este catálogo.
      </div>
    );
  }

  return (
    <section aria-label="Miniaturas de árboles" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black text-terra-ink">Todos los Árboles</h2>
        <span className="text-sm font-bold text-terra-ink/65">
          {moments.length} visibles
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {moments.map((moment) => {
          const isSelected = moment.id === selectedMomentId;

          return (
            <button
              aria-label={`Seleccionar árbol ${moment.treeNumber}`}
              className={`min-w-[142px] rounded-lg bg-white p-2 text-left shadow-sm ring-2 transition ${
                isSelected
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
                  #{moment.treeNumber.toString().padStart(2, "0")}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-terra-ink">
                  {formatTimestamp(moment.timestampSeconds)}
                </span>
                <StatusBadge compact status={moment.status} />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
