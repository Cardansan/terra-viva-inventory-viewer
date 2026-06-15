"use client";

import { useEffect, useRef, useState } from "react";
import type { CatalogVideo, TreeMoment } from "@/lib/catalogTypes";

type VideoMomentPlayerProps = {
  video: CatalogVideo | undefined;
  moment: TreeMoment;
};

const momentClipSeconds = 3;

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

  function getMomentStart(): number {
    return Math.max(0, moment.timestampSeconds);
  }

  function getMomentEnd(): number {
    return getMomentStart() + momentClipSeconds;
  }

  async function togglePlayback() {
    const element = videoRef.current;

    if (!element) {
      return;
    }

    if (element.paused) {
      const start = getMomentStart();
      const end = getMomentEnd();

      if (element.currentTime < start || element.currentTime >= end) {
        element.currentTime = start;
      }

      await element.play();
      setIsPlaying(true);
      return;
    }

    element.pause();
    element.currentTime = getMomentStart();
    setIsPlaying(false);
  }

  function keepPlaybackInsideMoment() {
    const element = videoRef.current;

    if (!element || element.paused) {
      return;
    }

    if (element.currentTime >= getMomentEnd()) {
      element.currentTime = getMomentStart();
      void element.play();
    }
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
            onLoadedMetadata={() => seekToMoment(moment)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onTimeUpdate={keepPlaybackInsideMoment}
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
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-3 pt-12">
          <div className="grid grid-cols-1">
            <button
              aria-label={isPlaying ? "Pausar video" : "Reproducir video"}
              className="min-h-14 rounded-lg bg-terra-clay px-5 text-lg font-black text-white shadow-soft transition hover:bg-[#9f5a3e]"
              onClick={togglePlayback}
              type="button"
            >
              {isPlaying ? "Pausar video" : "Play"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
