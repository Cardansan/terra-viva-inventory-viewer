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
      <div className="relative h-[280px] w-full bg-terra-ink sm:aspect-[4/3] sm:h-auto">
        {video && !hasVideoError ? (
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
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
      </div>
      <div className="flex flex-col items-stretch justify-between gap-3 bg-white p-3 sm:flex-row sm:items-center">
        <button
          aria-label={isPlaying ? "Pausar video" : "Reproducir video"}
          className="min-h-14 w-full rounded-lg bg-terra-clay px-5 text-lg font-black text-white transition hover:bg-[#9f5a3e] sm:flex-1"
          onClick={togglePlayback}
          type="button"
        >
          {isPlaying ? "Pausa clara" : "Play"}
        </button>
        <button
          aria-label="Regresar al momento seleccionado"
          className="min-h-14 w-full rounded-lg border border-terra-moss/40 bg-terra-paper px-4 text-base font-bold text-terra-ink sm:w-auto"
          onClick={() => seekToMoment(moment)}
          type="button"
        >
          Ver momento
        </button>
      </div>
    </section>
  );
}
