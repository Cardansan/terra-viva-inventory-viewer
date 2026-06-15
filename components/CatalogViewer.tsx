"use client";

import { useMemo, useState } from "react";
import type { CatalogDay } from "@/lib/catalogTypes";
import { formatTimestamp } from "@/lib/time";
import {
  getAdjacentMoment,
  getMomentPosition,
  getVideoForMoment,
  getVisibleMoments
} from "@/lib/videoMoments";
import { MomentNavigator } from "./MomentNavigator";
import { MomentThumbnailStrip } from "./MomentThumbnailStrip";
import { StatusBadge } from "./StatusBadge";
import { VideoMomentPlayer } from "./VideoMomentPlayer";
import { WhatsAppButton } from "./WhatsAppButton";

type CatalogViewerProps = {
  catalog: CatalogDay;
};

export function CatalogViewer({ catalog }: CatalogViewerProps) {
  const visibleMoments = useMemo(() => getVisibleMoments(catalog), [catalog]);
  const [selectedMomentId, setSelectedMomentId] = useState(
    visibleMoments[0]?.id || ""
  );
  const selectedMoment =
    visibleMoments.find((moment) => moment.id === selectedMomentId) ||
    visibleMoments[0];

  if (!selectedMoment) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-6 text-center">
        <section className="rounded-lg border border-terra-moss/30 bg-white/85 p-6 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-terra-clay">
            Terra Viva
          </p>
          <h1 className="mt-3 text-3xl font-bold">Catálogo sin árboles</h1>
          <p className="mt-3 text-lg text-terra-ink/75">
            Este catalogo existe, pero todavia no tiene momentos visibles.
          </p>
        </section>
      </main>
    );
  }

  const selectedVideo = getVideoForMoment(catalog, selectedMoment);
  const selectedIndex = getMomentPosition(visibleMoments, selectedMoment.id);
  const currentLabel = `Árbol ${selectedMoment.treeNumber
    .toString()
    .padStart(2, "0")} de ${visibleMoments.length}`;

  function selectAdjacent(direction: "previous" | "next") {
    const nextMoment = getAdjacentMoment(
      visibleMoments,
      selectedMoment.id,
      direction
    );

    if (nextMoment) {
      setSelectedMomentId(nextMoment.id);
    }
  }

  return (
    <main className="safe-bottom mx-auto min-h-screen w-full max-w-6xl px-4 py-4 sm:px-6 lg:py-8">
      <header className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.20em] text-terra-clay">
            Terra Viva
          </p>
          <h1 className="mt-1 text-2xl font-black text-terra-ink sm:text-4xl">
            Catálogo de Árboles
          </h1>
          <p className="mt-1 text-base font-bold text-terra-ink/65">
            {catalog.date}
          </p>
        </div>
        <a
          className="hidden min-h-11 items-center rounded-lg border border-terra-moss/30 bg-white px-4 text-sm font-bold text-terra-ink shadow-sm sm:inline-flex"
          href="/admin"
        >
          Admin
        </a>
      </header>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-4">
          <VideoMomentPlayer moment={selectedMoment} video={selectedVideo} />
          <MomentNavigator
            currentLabel={currentLabel}
            onNext={() => selectAdjacent("next")}
            onPrevious={() => selectAdjacent("previous")}
          />
          <div className="lg:hidden">
            <WhatsAppButton
              catalog={catalog}
              moment={selectedMoment}
              video={selectedVideo}
            />
          </div>
          <section className="rounded-lg bg-white/90 p-4 shadow-soft ring-1 ring-terra-moss/20">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-lg font-black text-terra-ink">
                  {selectedMoment.sectionLabel}
                </p>
                <p className="mt-1 text-base font-bold text-terra-ink/65">
                  {selectedVideo?.title || "Video placeholder"} ·{" "}
                  {formatTimestamp(selectedMoment.timestampSeconds)}
                </p>
              </div>
              <div className="shrink-0">
                <StatusBadge status={selectedMoment.status} />
              </div>
            </div>
            {selectedMoment.notes ? (
              <p className="mt-3 rounded-md bg-terra-paper p-3 text-base text-terra-ink/80">
                {selectedMoment.notes}
              </p>
            ) : null}
          </section>
        </section>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-lg bg-white p-4 shadow-soft ring-1 ring-terra-moss/20">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-terra-clay">
              Seleccion actual
            </p>
            <p className="mt-2 text-4xl font-black text-terra-ink">
              #{selectedMoment.treeNumber.toString().padStart(2, "0")}
            </p>
            <p className="mt-1 text-base font-bold text-terra-ink/65">
              {selectedIndex + 1} de {visibleMoments.length}
            </p>
            <div className="mt-4">
              <WhatsAppButton
                catalog={catalog}
                moment={selectedMoment}
                video={selectedVideo}
              />
            </div>
          </section>
          <MomentThumbnailStrip
            moments={visibleMoments}
            onSelectMoment={setSelectedMomentId}
            selectedMomentId={selectedMoment.id}
          />
        </aside>
      </div>
    </main>
  );
}
