"use client";

import type { TreeMoment } from "@/lib/catalogTypes";
import { getPublicTreeNumber } from "@/lib/selection";
import { SelectedMomentCard } from "./SelectedMomentCard";

type SelectionPanelProps = {
  publicMoments: TreeMoment[];
  selectedMoments: TreeMoment[];
  onRemove: (momentId: string) => void;
  readOnly?: boolean;
  title?: string;
};

export function SelectionPanel({
  publicMoments,
  selectedMoments,
  onRemove,
  readOnly = false,
  title = "Mi selecci\u00f3n"
}: SelectionPanelProps) {
  return (
    <section className="space-y-3 rounded-lg bg-white/70 p-3 ring-1 ring-terra-moss/15">
      <h2 className="text-xl font-black text-terra-ink">{title}</h2>
      {selectedMoments.length === 0 ? (
        <p className="text-base font-bold text-terra-ink/60">
          A&uacute;n no has agregado &aacute;rboles.
        </p>
      ) : (
        <div className="space-y-2">
          {selectedMoments.map((moment) => (
            <SelectedMomentCard
              displayNumber={getPublicTreeNumber(publicMoments, moment.id)}
              key={moment.id}
              moment={moment}
              onRemove={onRemove}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </section>
  );
}
