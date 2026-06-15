"use client";

import { useEffect, useRef, useState } from "react";
import type { CatalogVideo, TreeMoment } from "@/lib/catalogTypes";
import { formatTimestamp } from "@/lib/time";

type VideoMomentPlayerProps = {
  video: CatalogVideo | undefined;
  moment: TreeMoment;
};

export function VideoMomentPlayer({ video, moment }: VideoMomentPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);

  useEffect(() => {
    seekToMoment(moment);
  }, [moment.id, moment.timestampSeconds, video?.id]);

  function seekToMoment(nextMoment: TreeMoment) {
    const element = videoRef.current;

    if (!element) {
      return;
    }

    element.currentTime = Math.max(0, nextMoment.timestampSeconds);
    element.pause();
    setIsPlaying(false);
  }

  async function togglePlayback() {
    const element = videoRef.current;

    if (!element) {
      return;
    }

    if (element.paused) {
      await element.play();
      setIsPlaying(true);
      return;
    }

    element.pause();
    setIsPlaying(false);
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-lg bg-terra-ink shadow-soft">
      <div className="relative aspect-[9/16] max-h-[68vh] min-h-[420px] w-full bg-terra-ink sm:aspect-[4/3] sm:max-h-[640px] sm:min-h-0 lg:aspect-video">
        {video && !hasVideoError ? (
          <video
            ref={videoRef}
            className="h-full w-full object-contain"
            muted
            onError={() => setHasVideoError(true)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            poster={moment.thumbnailUrl}
            playsInline
            preload="metadata"
            src={video.url}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[url('/placeholder-tree.svg')] bg-cover bg-center p-6 text-center">
            <div className="rounded-lg bg-white/90 p-4 text-terra-ink shadow-soft">
              <p className="text-lg font-black">Vista placeholder</p>
              <p className="mt-1 text-sm">
                El catalogo sigue funcionando aunque el video no cargue.
              </p>
            </div>
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-full bg-white/95 px-4 py-2 text-base font-black text-terra-ink shadow">
          {formatTimestamp(moment.timestampSeconds)}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-3 pt-12">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <button
              aria-label={isPlaying ? "Pausar video" : "Reproducir video"}
              className="min-h-14 rounded-lg bg-terra-clay px-5 text-lg font-black text-white shadow-soft transition hover:bg-[#9f5a3e]"
              onClick={togglePlayback}
              type="button"
            >
              {isPlaying ? "Pausa clara" : "Play"}
            </button>
            <button
              aria-label="Regresar al momento seleccionado"
              className="min-h-14 rounded-lg border border-white/70 bg-white/95 px-4 text-base font-black text-terra-ink shadow-soft"
              onClick={() => seekToMoment(moment)}
              type="button"
            >
              Ver momento
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
