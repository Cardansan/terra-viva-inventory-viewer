"use client";

import { useEffect, useRef, useState } from "react";
import type { CatalogVideo, TreeMoment } from "@/lib/catalogTypes";
import { canPlayVideoInline } from "@/lib/videoLinks";

type VideoMomentPlayerProps = {
  video: CatalogVideo | undefined;
  moment: TreeMoment;
  playRequest: number;
};

const momentClipSeconds = 3;

export function VideoMomentPlayer({
  video,
  moment,
  playRequest
}: VideoMomentPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const shouldRenderInlineVideo = canPlayVideoInline(video);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setHasVideoError(false);
    seekToMoment(moment);
  }, [moment.id, moment.timestampSeconds, video?.id]);

  useEffect(() => {
    if (playRequest > 0) {
      void playMomentClip();
    }
  }, [isMounted, playRequest, video?.id]);

  function seekToMoment(nextMoment: TreeMoment) {
    const element = videoRef.current;

    if (!element) {
      return;
    }

    element.currentTime = Math.max(0, nextMoment.timestampSeconds);
    element.pause();
  }

  function getMomentStart(): number {
    return Math.max(0, moment.timestampSeconds);
  }

  function getMomentEnd(): number {
    return getMomentStart() + momentClipSeconds;
  }

  async function playMomentClip() {
    const element = videoRef.current;

    if (!element) {
      return;
    }

    const start = getMomentStart();

    element.currentTime = start;
    await element.play();
  }

  async function toggleVideoPlayback() {
    const element = videoRef.current;

    if (!element) {
      return;
    }

    if (element.paused) {
      await playMomentClip();
      return;
    }

    element.pause();
    element.currentTime = getMomentStart();
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
        {isMounted && shouldRenderInlineVideo && video && !hasVideoError ? (
          <video
            aria-label="Pausar o reproducir video de este arbol"
            ref={videoRef}
            className="h-full w-full object-contain"
            muted
            onError={() => setHasVideoError(true)}
            onLoadedMetadata={() => seekToMoment(moment)}
            onTimeUpdate={keepPlaybackInsideMoment}
            onClick={() => void toggleVideoPlayback()}
            poster={moment.thumbnailUrl}
            playsInline
            preload="metadata"
            src={video.url}
          />
        ) : (
          <div
            aria-label="Vista previa del arbol seleccionado"
            className="h-full w-full bg-cover bg-center"
            style={{
              backgroundImage: `url(${moment.thumbnailUrl})`
            }}
          />
        )}
      </div>
    </section>
  );
}
