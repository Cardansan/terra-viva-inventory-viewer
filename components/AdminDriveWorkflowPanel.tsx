"use client";

import { useEffect, useMemo, useState } from "react";
import type { CatalogDay } from "@/lib/catalogTypes";
import {
  DRIVE_SESSION_UPDATED_EVENT,
  DRIVE_STATUS_STORAGE_KEY,
  readBrowserDriveSession,
  writeBrowserDriveSession
} from "@/lib/driveSessionBrowser";
import {
  createDrivePublisherOrder,
  getLatestDrivePublisherStatuses,
  isDriveTokenExpiredError
} from "@/lib/browserDriveClient";
import { ensureDriveBrowserSession } from "@/lib/browserDriveSessionFlow";
import type {
  DrivePublisherOrder,
  DrivePublisherStatus,
  PublisherOrderAction
} from "@/lib/drivePublisherTypes";
import { AdminVideoUploadPanel } from "./AdminVideoUploadPanel";

type AdminDriveWorkflowPanelProps = {
  activeCatalog: CatalogDay;
  canPublishDraft: boolean;
  selectedCatalogId: string;
  draftCatalogId?: string;
  publishedCatalogId?: string;
  onSelectDraft?: () => void;
  onSelectPublished?: () => void;
};

export function AdminDriveWorkflowPanel({
  activeCatalog,
  canPublishDraft,
  selectedCatalogId,
  draftCatalogId,
  publishedCatalogId,
  onSelectDraft,
  onSelectPublished
}: AdminDriveWorkflowPanelProps) {
  const [accessToken, setAccessToken] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isBusy, setIsBusy] = useState<PublisherOrderAction | null>(null);
  const [statuses, setStatuses] = useState<DrivePublisherStatus[]>([]);
  const [inboxFolderId, setInboxFolderId] = useState("");

  const latestStatus = statuses[0];
  const hasToken = accessToken.trim().length > 0;
  const hasInboxFolderId = inboxFolderId.trim().length > 0;
  const hasDriveSession = hasToken && hasInboxFolderId;
  const isDraftSelected = Boolean(draftCatalogId && selectedCatalogId === draftCatalogId);
  const isPublishedSelected = Boolean(
    publishedCatalogId && selectedCatalogId === publishedCatalogId
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedSession = readBrowserDriveSession();
    const storedStatuses =
      window.localStorage.getItem(DRIVE_STATUS_STORAGE_KEY) || "";
    setAccessToken(storedSession.accessToken);
    setInboxFolderId(storedSession.inboxFolderId);

    if (storedStatuses) {
      try {
        setStatuses(JSON.parse(storedStatuses) as DrivePublisherStatus[]);
      } catch {
        window.localStorage.removeItem(DRIVE_STATUS_STORAGE_KEY);
      }
    }

    function handleDriveSessionUpdated() {
      const nextStoredSession = readBrowserDriveSession();
      setAccessToken(nextStoredSession.accessToken);
      setInboxFolderId(nextStoredSession.inboxFolderId);
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

  useEffect(() => {
    if (!hasDriveSession) {
      return;
    }

    void refreshStatuses(accessToken);
    const intervalId = window.setInterval(() => {
      void refreshStatuses(accessToken);
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [accessToken, hasDriveSession, inboxFolderId]);

  const publishDisabledReason = useMemo(() => {
    if (!canPublishDraft) {
      return "Primero prepara un borrador nuevo.";
    }

    return "";
  }, [canPublishDraft]);

  function rememberDriveSession(nextSession: {
    accessToken: string;
    inboxFolderId: string;
    expiresAt: string;
  }) {
    setAccessToken(nextSession.accessToken);
    setInboxFolderId(nextSession.inboxFolderId);
    writeBrowserDriveSession(nextSession);
  }

  async function requestSessionForAction() {
    const nextSession = await ensureDriveBrowserSession({
      inboxFolderId
    });
    rememberDriveSession(nextSession);
    return nextSession;
  }

  async function refreshStatuses(token: string) {
    try {
      const nextStatuses = await getLatestDrivePublisherStatuses(
        token,
        inboxFolderId,
        8
      );
      setStatuses(nextStatuses);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          DRIVE_STATUS_STORAGE_KEY,
          JSON.stringify(nextStatuses)
        );
      }
    } catch (error) {
      if (isDriveTokenExpiredError(error)) {
        writeBrowserDriveSession({
          accessToken: "",
          inboxFolderId,
          expiresAt: ""
        });
        setAccessToken("");
        setFeedback(
          "La conexion de Google Drive vencio. Cuando sigas con una accion, la web la abrira otra vez."
        );
        return;
      }
      setFeedback(
        error instanceof Error
          ? error.message
          : "No se pudo leer el estado de publicacion."
      );
    }
  }

  async function submitOrder(action: PublisherOrderAction) {
    const order: DrivePublisherOrder = {
      id: crypto.randomUUID(),
      action,
      createdAt: new Date().toISOString(),
      createdBy: "admin-web",
      catalogDate: activeCatalog.date,
      approvalCatalog: action === "publish_approved" ? activeCatalog : undefined
    };

    try {
      setIsBusy(action);
      setFeedback("");
      let driveSession = await requestSessionForAction();

      if (!hasToken) {
        setFeedback("Vamos a conectar Google Drive para continuar.");
      }

      try {
        await createDrivePublisherOrder(
          driveSession.accessToken,
          order,
          driveSession.inboxFolderId.trim() || undefined
        );
      } catch (error) {
        if (!isDriveTokenExpiredError(error)) {
          throw error;
        }

        setFeedback("La conexion vencio. Vamos a reconectar Google Drive...");
        writeBrowserDriveSession({
          accessToken: "",
          inboxFolderId: driveSession.inboxFolderId,
          expiresAt: ""
        });
        driveSession = await requestSessionForAction();
        await createDrivePublisherOrder(
          driveSession.accessToken,
          order,
          driveSession.inboxFolderId.trim() || undefined
        );
      }
      setFeedback(
        action === "process_draft"
          ? "Listo. Ya se empezo a preparar un borrador nuevo."
          : "Listo. El catalogo se envio a publicacion con los cambios que acabas de revisar."
      );
      await refreshStatuses(driveSession.accessToken);
    } catch (error) {
      if (isDriveTokenExpiredError(error)) {
        setFeedback(
          "La conexion de Google Drive se cerro antes de terminar. Intenta otra vez y la web la abrira de nuevo."
        );
        return;
      }
      setFeedback(
        error instanceof Error
          ? error.message
          : "No se pudo enviar la orden de publicacion."
      );
    } finally {
      setIsBusy(null);
    }
  }

  return (
    <section className="mb-4 overflow-hidden rounded-[24px] bg-white shadow-soft ring-1 ring-terra-moss/20">
      <div className="bg-[linear-gradient(135deg,#f8f3e8_0%,#eef6ef_100%)] px-4 py-5 sm:px-5">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-terra-clay">
          Flujo principal
        </p>
        <h2 className="mt-2 text-2xl font-black leading-tight text-terra-ink">
          Revisar y publicar catalogo
        </h2>
        <p className="mt-2 max-w-2xl text-base font-bold text-terra-ink/70">
          Abre el borrador de hoy, marca que arboles se muestran y publicalo
          cuando ya este listo.
        </p>

        <div
          className={`mt-4 rounded-2xl px-4 py-4 ring-1 ${
            canPublishDraft
              ? "bg-white/85 text-terra-ink ring-terra-moss/15"
              : "bg-amber-50 text-amber-950 ring-amber-200"
          }`}
        >
          <p className="text-sm font-black uppercase tracking-[0.14em] text-terra-clay">
            {canPublishDraft ? "Borrador listo" : "Sin borrador nuevo"}
          </p>
          <p className="mt-2 text-base font-black">
            {canPublishDraft
              ? `${activeCatalog.moments.length} arboles listos para revisar y publicar.`
              : "Todavia no hay un borrador nuevo para revisar."}
          </p>
          <p className="mt-1 text-sm font-bold text-terra-ink/65">
            {canPublishDraft
              ? "Empieza tocando Revisar borrador y, cuando termines, usa Publicar catalogo."
              : "Si hoy llegaron videos nuevos, usa la opcion de abajo para preparar el siguiente borrador."}
          </p>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
          <div className="rounded-2xl bg-white/85 p-4 ring-1 ring-terra-moss/15">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-terra-clay">
              Paso 1
            </p>
            <h3 className="mt-1 text-lg font-black text-terra-ink">
              Elegir que quieres revisar
            </h3>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {draftCatalogId ? (
                <button
                  className={`inline-flex min-h-12 items-center justify-center rounded-xl px-4 text-base font-black ${
                    isDraftSelected
                      ? "bg-terra-clay text-white"
                      : "bg-terra-paper text-terra-ink ring-1 ring-terra-clay/20"
                  }`}
                  onClick={onSelectDraft}
                  type="button"
                >
                  {isDraftSelected ? "Revisando borrador" : "Revisar borrador"}
                </button>
              ) : null}
              {publishedCatalogId ? (
                <button
                  className={`inline-flex min-h-12 items-center justify-center rounded-xl px-4 text-base font-black ${
                    isPublishedSelected
                      ? "bg-terra-leaf text-white"
                      : "bg-white text-terra-ink ring-1 ring-terra-moss/20"
                  }`}
                  onClick={onSelectPublished}
                  type="button"
                >
                  {isPublishedSelected
                    ? "Viendo catalogo actual"
                    : "Ver catalogo actual"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl bg-terra-ink p-4 text-white shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-[#f2d0b1]">
              Paso 2
            </p>
            <h3 className="mt-1 text-lg font-black">
              Publicar cuando ya termine la revision
            </h3>
            <button
              className="mt-4 inline-flex min-h-14 w-full items-center justify-center rounded-xl bg-terra-leaf px-5 text-lg font-black text-white disabled:cursor-not-allowed disabled:bg-white/25"
              disabled={Boolean(publishDisabledReason) || isBusy !== null}
              onClick={() => submitOrder("publish_approved")}
              type="button"
            >
              {isBusy === "publish_approved"
                ? "Publicando catalogo..."
                : "Publicar catalogo"}
            </button>
            {publishDisabledReason ? (
              <p className="mt-3 text-sm font-bold text-white/75">
                {publishDisabledReason}
              </p>
            ) : (
              <p className="mt-3 text-sm font-bold text-white/75">
                Se publica el catalogo exactamente como lo dejaste en esta
                revision.
              </p>
            )}
          </div>
        </div>
      </div>

      {feedback ? (
        <div className="border-t border-terra-moss/10 bg-white px-4 py-4 sm:px-5">
          <p className="rounded-xl bg-terra-paper/70 px-4 py-3 text-sm font-black text-terra-ink/75">
            {feedback}
          </p>
        </div>
      ) : null}

      <div className="space-y-3 border-t border-terra-moss/10 bg-white px-4 py-4 sm:px-5">
        <details
          className="rounded-2xl bg-terra-paper/55"
          open={!canPublishDraft}
        >
          <summary className="cursor-pointer list-none px-4 py-4 text-base font-black text-terra-ink">
            Preparar un borrador nuevo
          </summary>
          <div className="border-t border-terra-moss/10 px-4 py-4">
            <p className="text-sm font-bold text-terra-ink/65">
              Usa esta opcion solo cuando ya llegaron videos nuevos y hace falta
              crear el siguiente borrador.
            </p>
            <div className="mt-3">
              <AdminVideoUploadPanel embedded />
            </div>
            <button
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-terra-clay px-5 text-base font-black text-white disabled:cursor-not-allowed disabled:bg-terra-moss/40"
              disabled={isBusy !== null}
              onClick={() => submitOrder("process_draft")}
              type="button"
            >
              {isBusy === "process_draft"
                ? "Preparando borrador..."
                : "Crear borrador nuevo"}
            </button>
            {!hasDriveSession ? (
              <p className="mt-3 text-sm font-bold text-terra-ink/60">
                Si hace falta, la web te pedira Google Drive al tocar este
                boton.
              </p>
            ) : null}
          </div>
        </details>

        <details className="rounded-2xl bg-terra-paper/55">
          <summary className="cursor-pointer list-none px-4 py-4 text-base font-black text-terra-ink">
            Ver ultimo avance
          </summary>
          <div className="border-t border-terra-moss/10 px-4 py-4">
            {latestStatus ? (
              <article className="rounded-2xl bg-white p-4 ring-1 ring-terra-moss/15">
                <p className="text-base font-black text-terra-ink">
                  {getStateLabel(latestStatus.state)}
                </p>
                <p className="mt-1 text-sm font-black text-terra-clay">
                  {getActionLabel(latestStatus.action)}
                </p>
                <p className="mt-2 text-sm font-bold text-terra-ink/65">
                  {latestStatus.message}
                </p>
                <p className="mt-2 text-xs font-bold text-terra-ink/45">
                  Actualizado: {formatTimestamp(latestStatus.updatedAt)}
                </p>
                {latestStatus.result?.momentCount ? (
                  <p className="mt-1 text-xs font-bold text-terra-ink/45">
                    Arboles detectados: {latestStatus.result.momentCount}
                  </p>
                ) : null}
                {hasToken ? (
                  <button
                    className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-terra-moss/20 bg-white px-4 text-sm font-black text-terra-ink"
                    onClick={() => void refreshStatuses(accessToken)}
                    type="button"
                  >
                    Actualizar estado
                  </button>
                ) : null}
              </article>
            ) : (
              <p className="text-sm font-bold text-terra-ink/55">
                {hasDriveSession
                  ? "Todavia no hay avances guardados."
                  : "Cuando empieces una accion, la web conectara Google Drive si hace falta."}
              </p>
            )}
          </div>
        </details>
      </div>
    </section>
  );
}

function getActionLabel(action: PublisherOrderAction): string {
  return action === "process_draft"
    ? "Preparando borrador"
    : "Publicando catalogo";
}

function getStateLabel(state: DrivePublisherStatus["state"]): string {
  switch (state) {
    case "queued":
      return "En espera";
    case "running":
      return "Trabajando";
    case "succeeded":
      return "Terminado";
    case "failed":
      return "Necesita revision";
    default:
      return state;
  }
}

function formatTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
