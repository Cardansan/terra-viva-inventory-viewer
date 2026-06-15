"use client";

import { useMemo, useState } from "react";
import type { CatalogDay } from "@/lib/catalogTypes";
import { formatCatalogDate } from "@/lib/time";
import {
  getAdjacentMoment,
  getMomentPosition,
  getPublicMoments,
  getVideoForMoment,
} from "@/lib/videoMoments";
import { MomentNavigator } from "./MomentNavigator";
import { MomentThumbnailStrip } from "./MomentThumbnailStrip";
import { ShareCatalogButton } from "./ShareCatalogButton";
import { VideoMomentPlayer } from "./VideoMomentPlayer";
import { WhatsAppButton } from "./WhatsAppButton";

type CatalogViewerProps = {
  catalog: CatalogDay;
};

export function CatalogViewer({ catalog }: CatalogViewerProps) {
  const visibleMoments = useMemo(() => getPublicMoments(catalog), [catalog]);
  const [selectedMomentId, setSelectedMomentId] = useState(
    visibleMoments[0]?.id || ""
  );
  const [playRequest, setPlayRequest] = useState(0);
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
  const selectedIndex = getMomentPosition(visibleMoments, selectedMoment.id);
  const displayTreeNumber = selectedIndex + 1;
  const currentLabel = `\u00c1rbol ${displayTreeNumber
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
      </header>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-4">
          <VideoMomentPlayer
            moment={selectedMoment}
            playRequest={playRequest}
            video={selectedVideo}
          />
          <MomentNavigator
            currentLabel={currentLabel}
            onNext={() => selectAdjacent("next")}
            onPrevious={() => selectAdjacent("previous")}
          />
          <WhatsAppButton
            catalog={catalog}
            displayTreeNumber={displayTreeNumber}
            moment={selectedMoment}
            video={selectedVideo}
          />
          <button
            className="min-h-11 w-full rounded-lg border border-terra-moss/30 bg-white/80 px-4 text-base font-black text-terra-ink shadow-sm transition hover:bg-terra-paper"
            onClick={() => setPlayRequest((current) => current + 1)}
            type="button"
          >
            Ver video de este &aacute;rbol
          </button>
        </section>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
          <MomentThumbnailStrip
            moments={visibleMoments}
            onSelectMoment={setSelectedMomentId}
            selectedMomentId={selectedMoment.id}
          />
        </aside>
      </div>
      <footer className="mt-8 space-y-4 pb-6 text-center">
        <p className="text-sm font-bold text-terra-ink/60">
          Cat&aacute;logo actualizado: {formatCatalogDate(catalog.date)}
        </p>
        <ShareCatalogButton title={catalog.title} />
        <a
          className="inline-flex text-xs font-bold lowercase text-terra-ink/45 underline-offset-4 hover:text-terra-ink hover:underline"
          href="/admin"
        >
          admin login
        </a>
      </footer>
    </main>
  );
}
