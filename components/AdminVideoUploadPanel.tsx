"use client";

import { useMemo, useState } from "react";
import { getDriveInboxFolderPath } from "@/lib/drivePaths";

type StagedVideo = {
  id: string;
  fileName: string;
  sizeBytes: number;
  status: "ready" | "warning" | "error";
  message: string;
};

const MAX_VIDEO_COUNT = 3;
const MAX_VIDEO_SIZE_BYTES = 300 * 1024 * 1024;

type AdminVideoUploadPanelProps = {
  embedded?: boolean;
};

export function AdminVideoUploadPanel({
  embedded = false
}: AdminVideoUploadPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [stagedVideos, setStagedVideos] = useState<StagedVideo[]>([]);
  const targetDriveFolder = getDriveInboxFolderPath();

  const readyCount = useMemo(
    () => stagedVideos.filter((video) => video.status === "ready").length,
    [stagedVideos]
  );

  function stageVideos(files: FileList | null) {
    if (!files) {
      return;
    }

    const nextVideos = Array.from(files).map((file, index) => {
      const baseVideo: StagedVideo = {
        id: `${file.name}-${file.size}-${index}`,
        fileName: file.name,
        sizeBytes: file.size,
        status: "ready",
        message: "Listo para revisar"
      };

      if (!file.type.startsWith("video/")) {
        return {
          ...baseVideo,
          status: "error" as const,
          message: "No parece ser un video"
        };
      }

      if (file.size > MAX_VIDEO_SIZE_BYTES) {
        return {
          ...baseVideo,
          status: "warning" as const,
          message: "Archivo grande; confirmar antes de subir"
        };
      }

      return baseVideo;
    });

    const limitedVideos = nextVideos.slice(0, MAX_VIDEO_COUNT);

    if (nextVideos.length > MAX_VIDEO_COUNT) {
      limitedVideos.push({
        id: "too-many-files",
        fileName: "Limite de videos",
        sizeBytes: 0,
        status: "warning",
        message: `Solo se preparan ${MAX_VIDEO_COUNT} videos por catalogo`
      });
    }

    setStagedVideos(limitedVideos);
  }

  return (
    <section
      className={
        embedded
          ? "rounded-lg border border-terra-moss/20 bg-white/80"
          : "mb-4 rounded-lg bg-white shadow-soft ring-1 ring-terra-moss/20"
      }
    >
      <button
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span>
          {!embedded ? (
            <span className="block text-sm font-black uppercase tracking-[0.16em] text-terra-clay">
              Videos del dia
            </span>
          ) : null}
          <span className="mt-1 block text-lg font-black text-terra-ink">
            Cargar videos para preparar catalogo
          </span>
        </span>
        <span className="rounded-full bg-terra-paper px-3 py-1 text-sm font-black text-terra-ink">
          {isOpen ? "Cerrar" : "Abrir"}
        </span>
      </button>

      {isOpen ? (
        <div className="space-y-4 border-t border-terra-moss/15 p-4">
          <label className="block rounded-lg border border-dashed border-terra-moss/50 bg-terra-paper/70 p-4 text-center">
            <span className="block text-base font-black text-terra-ink">
              Seleccionar videos
            </span>
            <span className="mt-1 block text-sm font-bold text-terra-ink/60">
              Maximo {MAX_VIDEO_COUNT} videos. En esta fase quedan preparados
              localmente; el publicador toma Drive Inbox despues.
            </span>
            <span className="mt-2 block rounded-md bg-white px-3 py-2 text-xs font-bold text-terra-ink/55">
              Carpeta futura: {targetDriveFolder}
            </span>
            <input
              accept="video/*"
              className="mt-3 w-full rounded-lg bg-white p-2 text-sm font-bold text-terra-ink"
              multiple
              onChange={(event) => stageVideos(event.target.files)}
              type="file"
            />
          </label>

          {stagedVideos.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-black text-terra-ink">
                  Videos preparados
                </h2>
                <span className="text-sm font-bold text-terra-ink/60">
                  {readyCount} listos
                </span>
              </div>
              {stagedVideos.map((video) => (
                <article
                  className="flex items-center justify-between gap-3 rounded-lg bg-terra-paper/80 p-3"
                  key={video.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-terra-ink">
                      {video.fileName}
                    </p>
                    <p className="text-xs font-bold text-terra-ink/55">
                      {formatFileSize(video.sizeBytes)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
                      video.status === "ready"
                        ? "bg-green-50 text-green-800 ring-1 ring-green-700/20"
                        : video.status === "warning"
                          ? "bg-amber-50 text-amber-900 ring-1 ring-amber-700/20"
                          : "bg-rose-50 text-rose-800 ring-1 ring-rose-700/20"
                    }`}
                  >
                    {video.message}
                  </span>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes === 0) {
    return "-";
  }

  const sizeMb = sizeBytes / (1024 * 1024);

  return `${sizeMb.toFixed(sizeMb >= 10 ? 0 : 1)} MB`;
}
