"use client";

import { useEffect, useMemo, useState } from "react";
import { getDriveInboxFolderPath } from "@/lib/drivePaths";
import {
  DRIVE_SESSION_UPDATED_EVENT,
  readBrowserDriveSession,
  writeBrowserDriveSession
} from "@/lib/driveSessionBrowser";
import {
  isDriveTokenExpiredError,
  uploadVideoToDriveInbox
} from "@/lib/browserDriveClient";
import { ensureDriveBrowserSession } from "@/lib/browserDriveSessionFlow";

type StagedVideo = {
  id: string;
  file: File | null;
  fileName: string;
  sizeBytes: number;
  status:
    | "ready"
    | "warning"
    | "error"
    | "uploading"
    | "uploaded";
  message: string;
  driveFileId?: string;
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
  const [accessToken, setAccessToken] = useState("");
  const [inboxFolderId, setInboxFolderId] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const targetDriveFolder = getDriveInboxFolderPath();

  useEffect(() => {
    const storedSession = readBrowserDriveSession();
    setAccessToken(storedSession.accessToken);
    setInboxFolderId(storedSession.inboxFolderId);

    function handleDriveSessionUpdated() {
      const nextSession = readBrowserDriveSession();
      setAccessToken(nextSession.accessToken);
      setInboxFolderId(nextSession.inboxFolderId);
    }

    window.addEventListener(
      DRIVE_SESSION_UPDATED_EVENT,
      handleDriveSessionUpdated
    );

    return () => {
      window.removeEventListener(
        DRIVE_SESSION_UPDATED_EVENT,
        handleDriveSessionUpdated
      );
    };
  }, []);

  const readyCount = useMemo(
    () =>
      stagedVideos.filter(
        (video) => video.status === "ready" || video.status === "warning"
      ).length,
    [stagedVideos]
  );
  const uploadedCount = useMemo(
    () => stagedVideos.filter((video) => video.status === "uploaded").length,
    [stagedVideos]
  );

  function rememberDriveSession(nextSession: {
    accessToken: string;
    inboxFolderId: string;
    expiresAt: string;
  }) {
    setAccessToken(nextSession.accessToken);
    setInboxFolderId(nextSession.inboxFolderId);
    writeBrowserDriveSession(nextSession);
  }

  async function requestSessionForUpload() {
    const nextSession = await ensureDriveBrowserSession({
      inboxFolderId
    });
    rememberDriveSession(nextSession);
    return nextSession;
  }

  function stageVideos(files: FileList | null) {
    if (!files) {
      return;
    }

    const nextVideos = Array.from(files).map((file, index) => {
      const baseVideo: StagedVideo = {
        id: `${file.name}-${file.size}-${index}`,
        file,
        fileName: file.name,
        sizeBytes: file.size,
        status: "ready",
        message: "Listo para subir"
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
          message: "Archivo grande; se sube con cuidado"
        };
      }

      return baseVideo;
    });

    const limitedVideos = nextVideos.slice(0, MAX_VIDEO_COUNT);

    if (nextVideos.length > MAX_VIDEO_COUNT) {
      limitedVideos.push({
        id: "too-many-files",
        file: null,
        fileName: "Limite de videos",
        sizeBytes: 0,
        status: "warning",
        message: `Solo se suben ${MAX_VIDEO_COUNT} videos por catalogo`
      });
    }

    setStagedVideos(limitedVideos);
    setUploadMessage("");
  }

  async function uploadStagedVideos() {
    const pendingVideos = stagedVideos.filter(
      (video) =>
        video.file &&
        (video.status === "ready" || video.status === "warning")
    );

    if (pendingVideos.length === 0) {
      setUploadMessage("Selecciona al menos un video valido antes de subir.");
      return;
    }

    setIsUploading(true);
    setUploadMessage("");

    let successCount = 0;
    let driveSession;

    try {
      driveSession = await requestSessionForUpload();
      setUploadMessage("Conectando Google Drive para subir los videos...");
    } catch (error) {
      setIsUploading(false);
      setUploadMessage(
        error instanceof Error
          ? error.message
          : "No se pudo abrir Google Drive para continuar."
      );
      return;
    }

    for (const pendingVideo of pendingVideos) {
      const videoFile = pendingVideo.file;

      if (!videoFile) {
        continue;
      }

      setStagedVideos((currentVideos) =>
        currentVideos.map((video) =>
          video.id === pendingVideo.id
            ? {
                ...video,
                status: "uploading",
                message: "Subiendo al Inbox..."
              }
            : video
        )
      );

      try {
        let result;

        try {
          result = await uploadVideoToDriveInbox(
            driveSession.accessToken,
            driveSession.inboxFolderId,
            videoFile
          );
        } catch (error) {
          if (!isDriveTokenExpiredError(error)) {
            throw error;
          }

          setUploadMessage("La conexion vencio. Vamos a reconectar Drive...");
          writeBrowserDriveSession({
            accessToken: "",
            inboxFolderId: driveSession.inboxFolderId,
            expiresAt: ""
          });
          driveSession = await requestSessionForUpload();
          result = await uploadVideoToDriveInbox(
            driveSession.accessToken,
            driveSession.inboxFolderId,
            videoFile
          );
        }

        successCount += 1;
        setStagedVideos((currentVideos) =>
          currentVideos.map((video) =>
            video.id === pendingVideo.id
              ? {
                  ...video,
                  status: "uploaded",
                  message: "Subido al Inbox",
                  driveFileId: result.id
                }
              : video
          )
        );
      } catch (error) {
        const message = isDriveTokenExpiredError(error)
          ? "Se cerro o vencio la conexion de Google Drive durante la subida"
          : error instanceof Error
            ? error.message
            : "No se pudo subir el video";

        setStagedVideos((currentVideos) =>
          currentVideos.map((video) =>
            video.id === pendingVideo.id
              ? {
                  ...video,
                  status: "error",
                  message
                }
              : video
          )
        );
      }
    }

    setIsUploading(false);
    setUploadMessage(
      successCount > 0
        ? `${successCount} video${successCount === 1 ? "" : "s"} subido${successCount === 1 ? "" : "s"} al Inbox. Ahora ya puedes crear el borrador nuevo.`
        : "No se pudo completar la subida. Revisa los mensajes de cada video."
    );
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
              Maximo {MAX_VIDEO_COUNT} videos por tanda. Se suben directo al
              Inbox de Drive para que la laptop los procese.
            </span>
            <span className="mt-2 block rounded-md bg-white px-3 py-2 text-xs font-bold text-terra-ink/55">
              Carpeta objetivo: {targetDriveFolder}
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
                  {uploadedCount > 0
                    ? `${uploadedCount} subidos`
                    : `${readyCount} listos`}
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
                          : video.status === "uploading"
                            ? "bg-sky-50 text-sky-800 ring-1 ring-sky-700/20"
                            : video.status === "uploaded"
                              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-700/20"
                              : "bg-rose-50 text-rose-800 ring-1 ring-rose-700/20"
                    }`}
                  >
                    {video.message}
                  </span>
                </article>
              ))}
            </div>
          ) : null}

          <button
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-terra-ink px-5 text-base font-black text-white disabled:cursor-not-allowed disabled:bg-terra-moss/40"
            disabled={isUploading}
            onClick={() => void uploadStagedVideos()}
            type="button"
          >
            {isUploading ? "Subiendo videos..." : "Subir videos al Inbox"}
          </button>

          {!accessToken.trim() ? (
            <p className="text-sm font-bold text-terra-ink/60">
              Si hace falta, la web te pedira Google Drive al tocar subir.
            </p>
          ) : null}

          {uploadMessage ? (
            <p className="rounded-lg bg-white px-3 py-3 text-sm font-black text-terra-ink/75 ring-1 ring-terra-moss/15">
              {uploadMessage}
            </p>
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
