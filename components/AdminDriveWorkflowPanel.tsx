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
};

export function AdminDriveWorkflowPanel({
  activeCatalog,
  canPublishDraft
}: AdminDriveWorkflowPanelProps) {
  const [accessToken, setAccessToken] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isBusy, setIsBusy] = useState<PublisherOrderAction | null>(null);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [statuses, setStatuses] = useState<DrivePublisherStatus[]>([]);
  const [inboxFolderId, setInboxFolderId] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const latestStatus = statuses[0];
  const hasToken = accessToken.trim().length > 0;
  const hasInboxFolderId = inboxFolderId.trim().length > 0;
  const hasDriveSession = hasToken && hasInboxFolderId;

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

  useEffect(() => {
    if (!feedback) {
      setToastVisible(false);
      return;
    }

    setToastVisible(true);
    const timeoutId = window.setTimeout(() => {
      setToastVisible(false);
    }, 6000);

    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

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
          "La conexión de Google Drive venció. Cuando sigas con una acción, la web la abrirá otra vez."
        );
        return;
      }
      setFeedback(
        error instanceof Error
          ? error.message
          : "No se pudo leer el estado de publicación."
      );
    }
  }

  async function handleRefreshStatuses() {
    if (!hasToken || isRefreshingStatus) {
      return;
    }

    try {
      setIsRefreshingStatus(true);
      await refreshStatuses(accessToken);
      setFeedback("Estado actualizado.");
    } finally {
      setIsRefreshingStatus(false);
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

        setFeedback("La conexión venció. Vamos a reconectar Google Drive...");
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
          ? "Listo. Ya se empezó a preparar un borrador nuevo."
          : "Listo. El catálogo se envió a publicación con los cambios que acabas de revisar."
      );
      await refreshStatuses(driveSession.accessToken);
    } catch (error) {
      if (isDriveTokenExpiredError(error)) {
        setFeedback(
          "La conexión de Google Drive se cerró antes de terminar. Intenta otra vez y la web la abrirá de nuevo."
        );
        return;
      }
      setFeedback(
        error instanceof Error
          ? error.message
          : "No se pudo enviar la orden de publicación."
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
          Revisar y publicar catálogo
        </h2>
        <p className="mt-2 max-w-2xl text-base font-bold text-terra-ink/70">
          Abre el borrador de hoy, marca qué árboles se muestran y publícalo
          cuando ya esté listo.
        </p>
      </div>

      <div className="space-y-3 border-t border-terra-moss/10 bg-white px-4 py-4 sm:px-5">
        <details
          className="rounded-2xl bg-terra-paper/55"
          open={!canPublishDraft}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-base font-black text-terra-ink">
            <span className="inline-flex items-center gap-3">
              <span className="rounded-md bg-terra-clay px-2 py-1 text-xs font-black uppercase tracking-[0.14em] text-white">
                Paso 1
              </span>
              <span>Preparar un borrador nuevo</span>
            </span>
            <span aria-hidden="true" className="text-lg text-terra-ink/55">
              ▾
            </span>
          </summary>
          <div className="border-t border-terra-moss/10 px-4 py-4">
            <div
              className={`rounded-2xl px-4 py-4 ring-1 ${
                canPublishDraft
                  ? "bg-white text-terra-ink ring-terra-moss/15"
                  : "bg-amber-50 text-amber-950 ring-amber-200"
              }`}
            >
              <p className="text-sm font-black uppercase tracking-[0.14em] text-terra-clay">
                {canPublishDraft ? "Borrador listo" : "Sin borrador nuevo"}
              </p>
              <p className="mt-2 text-base font-black">
                {canPublishDraft
                  ? `${activeCatalog.moments.length} árboles listos para revisar y publicar.`
                  : "Todavía no hay un borrador nuevo para revisar."}
              </p>
              <p className="mt-1 text-sm font-bold text-terra-ink/65">
                {canPublishDraft
                  ? "Ya puedes revisarlo en la sección de abajo y luego publicarlo cuando termines."
                  : "Si hoy llegaron videos nuevos, usa esta opción para preparar el siguiente borrador."}
              </p>
            </div>
            <p className="mt-4 text-sm font-bold text-terra-ink/65">
              Usa esta opción solo cuando ya llegaron videos nuevos y hace falta
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
                Si hace falta, la web te pedirá Google Drive al tocar este
                botón.
              </p>
            ) : null}
          </div>
        </details>

        <section className="rounded-2xl bg-terra-ink p-4 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-[#f2d0b1] px-2 py-1 text-xs font-black uppercase tracking-[0.14em] text-terra-ink">
              Paso 2
            </span>
            <h3 className="text-base font-black sm:text-lg">
              Publicar cuando ya termine la revisión
            </h3>
          </div>
          <button
            className="mt-4 inline-flex min-h-14 w-full items-center justify-center rounded-xl bg-terra-leaf px-5 text-lg font-black text-white disabled:cursor-not-allowed disabled:bg-white/25"
            disabled={Boolean(publishDisabledReason) || isBusy !== null}
            onClick={() => submitOrder("publish_approved")}
            type="button"
          >
            {isBusy === "publish_approved"
              ? "Publicando catálogo..."
              : "Publicar catálogo"}
          </button>
          {publishDisabledReason ? (
            <p className="mt-3 text-sm font-bold text-white/75">
              {publishDisabledReason}
            </p>
          ) : (
            <p className="mt-3 text-sm font-bold text-white/75">
              Se publica el catálogo exactamente como lo dejaste en esta
              revisión.
            </p>
          )}
        </section>

        <section className="rounded-2xl bg-terra-paper/55">
          <div className="px-4 py-4 text-base font-black text-terra-ink">
            Ver último avance
          </div>
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
                    Árboles detectados: {latestStatus.result.momentCount}
                  </p>
                ) : null}
                {hasToken ? (
                  <button
                    className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-terra-moss/20 bg-white px-4 text-sm font-black text-terra-ink disabled:cursor-wait disabled:opacity-70"
                    disabled={isRefreshingStatus}
                    onClick={() => void handleRefreshStatuses()}
                    type="button"
                  >
                    {isRefreshingStatus ? "Actualizando estado..." : "Actualizar estado"}
                  </button>
                ) : null}
              </article>
            ) : (
              <p className="text-sm font-bold text-terra-ink/55">
                {hasDriveSession
                  ? "Todavía no hay avances guardados."
                  : "Cuando empieces una acción, la web conectará Google Drive si hace falta."}
              </p>
            )}
          </div>
        </section>
      </div>

      {toastVisible && feedback ? (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div
            className={`pointer-events-auto w-full max-w-2xl rounded-2xl px-4 py-3 shadow-soft ring-1 ${
              feedback.startsWith("Listo.")
                ? "bg-white text-terra-ink ring-terra-leaf/25"
                : "bg-[#fff7ef] text-terra-ink ring-terra-clay/25"
            }`}
            role="status"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.14em] text-terra-clay">
                  {feedback.startsWith("Listo.") ? "Acción completada" : "Aviso"}
                </p>
                <p className="mt-1 text-sm font-black">{feedback}</p>
              </div>
              <button
                className="rounded-lg border border-terra-moss/20 bg-white px-3 py-2 text-xs font-black text-terra-ink"
                onClick={() => setToastVisible(false)}
                type="button"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function getActionLabel(action: PublisherOrderAction): string {
  return action === "process_draft"
    ? "Preparando borrador"
    : "Publicando catálogo";
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
      return "Necesita revisión";
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
