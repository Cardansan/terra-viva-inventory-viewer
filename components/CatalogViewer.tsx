"use client";

import { useMemo, useState } from "react";
import type { CatalogDay } from "@/lib/catalogTypes";
import {
  getAdjacentMoment,
  getVideoForMoment,
  getVisibleMoments
} from "@/lib/videoMoments";
import { MomentNavigator } from "./MomentNavigator";
import { MomentThumbnailStrip } from "./MomentThumbnailStrip";
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
          <h1 className="mt-3 text-3xl font-bold">
            Cat&aacute;logo sin &aacute;rboles
          </h1>
          <p className="mt-3 text-lg text-terra-ink/75">
            Este catalogo existe, pero todavia no tiene momentos visibles.
          </p>
        </section>
      </main>
    );
  }

  const selectedVideo = getVideoForMoment(catalog, selectedMoment);
  const currentLabel = `\u00c1rbol ${selectedMoment.treeNumber
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
            Cat&aacute;logo de &Aacute;rboles
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
          <WhatsAppButton
            catalog={catalog}
            moment={selectedMoment}
            video={selectedVideo}
          />
        </section>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
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
