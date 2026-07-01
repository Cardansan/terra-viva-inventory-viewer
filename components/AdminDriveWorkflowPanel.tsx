"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from "react";
import type { CatalogDay } from "@/lib/catalogTypes";
import {
  DRIVE_SESSION_UPDATED_EVENT,
  DRIVE_STATUS_STORAGE_KEY,
  getOrCreateDrivePublisherSourceSessionId,
  readBrowserDriveSession,
  writeBrowserDriveSession
} from "@/lib/driveSessionBrowser";
import {
  createDrivePublisherOrder,
  getLatestDrivePublisherStatuses,
  isDriveTokenExpiredError
} from "@/lib/browserDriveClient";
import { ensureDriveBrowserSession } from "@/lib/browserDriveSessionFlow";
import { getPublicDriveInboxFolderId } from "@/lib/publicDriveConfig";
import type {
  DrivePublisherOrder,
  DrivePublisherStatus,
  PublisherOrderAction
} from "@/lib/drivePublisherTypes";
import {
  DRIVE_PUBLISHER_ORDER_SCHEMA,
  DRIVE_PUBLISHER_STATUS_SCHEMA
} from "@/lib/drivePublisherTypes";
import { AdminVideoUploadPanel } from "./AdminVideoUploadPanel";

type AdminDriveWorkflowPanelProps = {
  activeCatalog: CatalogDay;
  canPublishDraft: boolean;
  onPublishStatusChange?: (status: DrivePublisherStatus | null) => void;
};

export type AdminDriveWorkflowPanelHandle = {
  publishApproved: () => Promise<boolean>;
};

export const AdminDriveWorkflowPanel = forwardRef<
  AdminDriveWorkflowPanelHandle,
  AdminDriveWorkflowPanelProps
>(function AdminDriveWorkflowPanel(
  { activeCatalog, canPublishDraft, onPublishStatusChange },
  ref
) {
  const [accessToken, setAccessToken] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isBusy, setIsBusy] = useState<PublisherOrderAction | null>(null);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [statuses, setStatuses] = useState<DrivePublisherStatus[]>([]);
  const [inboxFolderId, setInboxFolderId] = useState("");
  const [lastStatusCheckedAt, setLastStatusCheckedAt] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [isStepOneOpen, setIsStepOneOpen] = useState(!canPublishDraft);
  const latestStatusSectionRef = useRef<HTMLElement | null>(null);

  const latestStatus = statuses[0];
  const latestPublishStatus =
    statuses.find((status) => status.action === "publish_approved") || null;
  const defaultInboxFolderId = getPublicDriveInboxFolderId();
  const latestStatusSignal = latestStatus
    ? getStatusSignal(latestStatus)
    : null;
  const hasToken = accessToken.trim().length > 0;
  const hasInboxFolderId = inboxFolderId.trim().length > 0;
  const hasDriveSession = hasToken && hasInboxFolderId;
  const canCancelDraft =
    canPublishDraft ||
    (latestStatus?.action === "process_draft" &&
      (latestStatus.state === "queued" || latestStatus.state === "running"));
  const shouldShowDraftReadyCard = canPublishDraft;
  const shouldShowLatestStatusCard = !(
    latestStatus?.action === "process_draft" &&
    latestStatus.state === "succeeded" &&
    canPublishDraft
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem("terra-viva:drive-publisher-statuses");

    const storedSession = readBrowserDriveSession();
    const storedStatuses =
      window.localStorage.getItem(DRIVE_STATUS_STORAGE_KEY) || "";
    setAccessToken(storedSession.accessToken);
    setInboxFolderId(defaultInboxFolderId || storedSession.inboxFolderId);

    if (storedStatuses) {
      try {
        const parsedStatuses = JSON.parse(storedStatuses) as DrivePublisherStatus[];
        const nextStatuses = parsedStatuses.filter((status) =>
          shouldKeepCachedStatus(status, Boolean(storedSession.accessToken))
        );

        setStatuses(nextStatuses);

        if (nextStatuses.length > 0) {
          window.localStorage.setItem(
            DRIVE_STATUS_STORAGE_KEY,
            JSON.stringify(nextStatuses)
          );
        } else {
          window.localStorage.removeItem(DRIVE_STATUS_STORAGE_KEY);
        }
      } catch {
        window.localStorage.removeItem(DRIVE_STATUS_STORAGE_KEY);
      }
    }

    function handleDriveSessionUpdated() {
      const nextStoredSession = readBrowserDriveSession();
      setAccessToken(nextStoredSession.accessToken);
      setInboxFolderId(defaultInboxFolderId || nextStoredSession.inboxFolderId);
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
  }, [defaultInboxFolderId]);

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

  useEffect(() => {
    onPublishStatusChange?.(
      latestPublishStatus
    );
  }, [latestPublishStatus, onPublishStatusChange]);

  useEffect(() => {
    if (!canPublishDraft) {
      setIsStepOneOpen(true);
    }
  }, [canPublishDraft]);

  const publishDisabledReason = useMemo(() => {
    if (!canPublishDraft) {
      return "Primero prepara un borrador nuevo.";
    }

    return "";
  }, [canPublishDraft]);

  useImperativeHandle(
    ref,
    () => ({
      publishApproved: () => submitOrder("publish_approved")
    }),
    [activeCatalog, canPublishDraft, accessToken, inboxFolderId, hasToken]
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
      setLastStatusCheckedAt(new Date().toISOString());
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          DRIVE_STATUS_STORAGE_KEY,
          JSON.stringify(nextStatuses)
        );
      }
      return nextStatuses;
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
      return null;
    }
  }

  async function handleRefreshStatuses() {
    if (!hasToken || isRefreshingStatus) {
      return;
    }

    try {
      setIsRefreshingStatus(true);
      const previousStatus = latestStatus;
      const previousUpdatedAt = latestStatus?.updatedAt || "";
      const nextStatuses = await refreshStatuses(accessToken);

      if (!nextStatuses) {
        return;
      }

      if (previousStatus && nextStatuses.length === 0) {
        setFeedback(
          "Drive ya no reporta una orden activa. Se limpio el estado anterior en este navegador."
        );
        return;
      }

      const nextUpdatedAt = nextStatuses[0]?.updatedAt || "";
      setFeedback(
        previousUpdatedAt && previousUpdatedAt === nextUpdatedAt
          ? "Se consultó Drive, pero no hubo cambios nuevos en el estado."
          : "Estado actualizado con información nueva."
      );
    } finally {
      setIsRefreshingStatus(false);
    }
  }

  async function submitOrder(action: PublisherOrderAction): Promise<boolean> {
    const order: DrivePublisherOrder = {
      schema: DRIVE_PUBLISHER_ORDER_SCHEMA,
      orderId: crypto.randomUUID(),
      action,
      createdAt: new Date().toISOString(),
      createdBy: "admin-web",
      catalogDate: activeCatalog.date,
      sourceSessionId: getOrCreateDrivePublisherSourceSessionId(),
      approvalCatalog: action === "publish_approved" ? activeCatalog : undefined,
      approvalCatalogSignature:
        action === "publish_approved"
          ? JSON.stringify({
              id: activeCatalog.id,
              date: activeCatalog.date,
              title: activeCatalog.title,
              moments: activeCatalog.moments.map((moment) => ({
                id: moment.id,
                treeNumber: moment.treeNumber,
                timestampSeconds: moment.timestampSeconds,
                sectionLabel: moment.sectionLabel,
                status: moment.status,
                notes: moment.notes || "",
                crop: moment.crop || null
              }))
            })
          : undefined
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
          : action === "cancel_draft"
            ? "Listo. Se envió la cancelación del borrador actual."
          : "Listo. La laptop ya empezó la publicación local con los cambios que acabas de revisar."
      );
      await refreshStatuses(driveSession.accessToken);
      return true;
    } catch (error) {
      if (isDriveTokenExpiredError(error)) {
        setFeedback(
          "La conexión de Google Drive se cerró antes de terminar. Intenta otra vez y la web la abrirá de nuevo."
        );
        return false;
      }
      setFeedback(
        error instanceof Error
          ? error.message
          : "No se pudo enviar la orden de publicación."
      );
      return false;
    } finally {
      setIsBusy(null);
    }
  }

  async function handleCreateDraftClick() {
    setIsStepOneOpen(false);
    latestStatusSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
    await submitOrder("process_draft");
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
          onToggle={(event) =>
            setIsStepOneOpen((event.currentTarget as HTMLDetailsElement).open)
          }
          open={isStepOneOpen}
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
            <p className="text-sm font-bold text-terra-ink/65">
              Usa esta opción solo cuando ya llegaron videos nuevos y hace falta
              crear el siguiente borrador.
            </p>
            <div className="mt-3">
              <AdminVideoUploadPanel embedded />
            </div>
            <button
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-terra-clay px-5 text-base font-black text-white disabled:cursor-not-allowed disabled:bg-terra-moss/40"
              disabled={isBusy !== null}
              onClick={() => {
                void handleCreateDraftClick();
              }}
              type="button"
            >
              {isBusy === "process_draft"
                ? "Preparando borrador..."
                : "Crear borrador nuevo"}
            </button>
            {canCancelDraft ? (
              <button
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-terra-clay/30 bg-white px-5 text-sm font-black text-terra-clay disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isBusy !== null}
                onClick={() => {
                  const confirmed = window.confirm(
                    "Esto cancelará el borrador actual y dejará de usarse para esta revisión. ¿Quieres continuar?"
                  );

                  if (!confirmed) {
                    return;
                  }

                  void submitOrder("cancel_draft");
                }}
                type="button"
              >
                {isBusy === "cancel_draft"
                  ? "Cancelando borrador..."
                  : "Cancelar borrador"}
              </button>
            ) : null}
            {!hasDriveSession ? (
              <p className="mt-3 text-sm font-bold text-terra-ink/60">
                Si hace falta, la web te pedirá Google Drive al tocar este
                botón.
              </p>
            ) : null}
          </div>
        </details>

        <details className="rounded-2xl bg-terra-ink text-white shadow-sm" open>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4">
            <span className="flex items-center gap-3">
              <span className="rounded-md bg-[#f2d0b1] px-2 py-1 text-xs font-black uppercase tracking-[0.14em] text-terra-ink">
                Paso 2
              </span>
              <span className="text-base font-black sm:text-lg">
                Publicar cuando ya termine la revisión
              </span>
            </span>
            <span aria-hidden="true" className="text-lg text-white/70">
              ▾
            </span>
          </summary>
          <div className="border-t border-white/10 px-4 pb-4 pt-4">
            <button
              className="inline-flex min-h-14 w-full items-center justify-center rounded-xl bg-terra-leaf px-5 text-lg font-black text-white disabled:cursor-not-allowed disabled:bg-white/25"
              disabled={Boolean(publishDisabledReason) || isBusy !== null}
              onClick={() => {
                void submitOrder("publish_approved");
              }}
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
              <div className="mt-3 space-y-2">
                <p className="text-sm font-bold text-white/75">
                  Se publica el catálogo exactamente como lo dejaste en esta
                  revisión.
                </p>
                <p className="text-sm font-bold text-white/75">
                  Este boton solo manda la orden a la laptop. Si el estado se
                  queda igual varios minutos, casi siempre significa que la
                  laptop no ha tomado la orden o perdio su sesion de Drive.
                </p>
              </div>
            )}
          </div>
        </details>

        <section
          className="rounded-2xl bg-terra-paper/55"
          ref={latestStatusSectionRef}
        >
          <div className="px-4 py-4 text-base font-black text-terra-ink">
            Ver último avance
          </div>
          <div className="border-t border-terra-moss/10 px-4 py-4">
            {shouldShowDraftReadyCard ? (
              <article className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-terra-moss/15">
                <p className="text-sm font-black uppercase tracking-[0.14em] text-terra-clay">
                  Borrador listo
                </p>
                <p className="mt-2 text-base font-black text-terra-ink">
                  {activeCatalog.moments.length} árboles listos para revisar y
                  publicar.
                </p>
                <p className="mt-1 text-sm font-bold text-terra-ink/65">
                  Ya puedes revisarlo en la sección de abajo y luego publicarlo
                  cuando termines.
                </p>
              </article>
            ) : null}
            {latestStatus && shouldShowLatestStatusCard ? (
              <article className="rounded-2xl bg-white p-4 ring-1 ring-terra-moss/15">
                <p className="text-base font-black text-terra-ink">
                  {latestStatusSignal?.title || getStateLabel(latestStatus.state)}
                </p>
                <p className="mt-1 text-sm font-black text-terra-clay">
                  {getActionLabel(latestStatus.action)}
                </p>
                <p className="mt-2 text-sm font-bold text-terra-ink/65">
                  {latestStatus.message}
                </p>
                {latestStatus.action === "publish_approved" &&
                latestStatus.state === "succeeded" ? (
                  <div className="mt-3 rounded-2xl bg-[#fff7ef] px-4 py-3 text-terra-ink ring-1 ring-terra-clay/25">
                    <p className="text-sm font-black">
                      La publicación local sí terminó.
                    </p>
                    <p className="mt-1 text-sm font-bold text-terra-ink/70">
                      {latestStatus.result?.deployment?.pushed
                        ? "La laptop ya empujo el catalogo nuevo a GitHub. Pages deberia reflejarlo en cuanto termine su deploy."
                        : "Si la pagina publica todavia enseña una fecha anterior, normalmente falta redeployar GitHub Pages con estos archivos nuevos."}
                    </p>
                  </div>
                ) : null}
                {latestStatusSignal ? (
                  <div
                    className={`mt-3 rounded-2xl px-4 py-3 ring-1 ${
                      latestStatusSignal.severity === "error"
                        ? "bg-[#fff7ef] text-terra-ink ring-terra-clay/25"
                        : "bg-[#f7fbf7] text-terra-ink ring-terra-leaf/20"
                    }`}
                  >
                    <p className="text-sm font-black text-terra-ink">
                      {latestStatusSignal.summary}
                    </p>
                    <p className="mt-1 text-sm font-bold text-terra-ink/70">
                      {latestStatusSignal.details}
                    </p>
                  </div>
                ) : null}
                <p className="mt-2 text-xs font-bold text-terra-ink/45">
                  Último cambio del proceso: {formatTimestamp(latestStatus.updatedAt)}
                </p>
                {lastStatusCheckedAt ? (
                  <p className="mt-1 text-xs font-bold text-terra-ink/45">
                    Última consulta a Drive: {formatTimestamp(lastStatusCheckedAt)}
                  </p>
                ) : null}
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
});

function getActionLabel(action: PublisherOrderAction): string {
  return action === "process_draft"
    ? "Preparando borrador"
    : action === "cancel_draft"
      ? "Cancelando borrador"
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
    case "cancelled":
      return "Cancelado";
    default:
      return state;
  }
}

function getStatusSignal(status: DrivePublisherStatus): {
  severity: "warning" | "error";
  title: string;
  summary: string;
  details: string;
} | null {
  const updatedAtMs = Date.parse(status.updatedAt);

  if (!Number.isFinite(updatedAtMs)) {
    return null;
  }

  const elapsedMs = Date.now() - updatedAtMs;

  if (elapsedMs < 0) {
    return null;
  }

  const elapsedLabel = formatElapsed(elapsedMs);

  if (status.state === "queued" && elapsedMs >= 10 * 60 * 1000) {
    return {
      severity: "error",
      title: "Parece atorado",
      summary: `La orden sigue en espera desde hace ${elapsedLabel}.`,
      details:
        "La web ya mando la orden, pero la laptop todavia no la toma. Suele pasar cuando el worker local esta detenido o cuando la laptop perdio su sesion de Google Drive."
    };
  }

  if (status.state === "queued" && elapsedMs >= 3 * 60 * 1000) {
    return {
      severity: "warning",
      title: "Sigue en cola",
      summary: `La orden sigue en espera desde hace ${elapsedLabel}.`,
      details:
        "Todavia depende de que la laptop lea la cola de Drive. Si no cambia pronto a 'Trabajando', conviene revisar la laptop."
    };
  }

  if (status.state === "running" && elapsedMs >= 20 * 60 * 1000) {
    return {
      severity: "warning",
      title: "Tardando mas de lo normal",
      summary: `La laptop reporto actividad hace ${elapsedLabel}.`,
      details:
        "Si no cambia pronto a 'Terminado', conviene revisar los logs locales por si el publicador quedo esperando Drive o ffmpeg."
    };
  }

  if (status.state === "failed") {
    return {
      severity: "error",
      title: "Necesita revision",
      summary: "La laptop devolvio un error y la accion no termino.",
      details:
        "Revisa el mensaje del estado y despues confirma en la laptop los logs del worker local para destrabarlo."
    };
  }

  return null;
}

function shouldKeepCachedStatus(
  status: DrivePublisherStatus,
  hasActiveDriveSession: boolean
): boolean {
  if (
    !status ||
    status.schema !== DRIVE_PUBLISHER_STATUS_SCHEMA ||
    !status.orderId ||
    !status.action ||
    !status.state ||
    !status.createdAt ||
    !status.updatedAt ||
    !status.message
  ) {
    return false;
  }

  if (
    status.action === "publish_approved" &&
    !status.result?.approvalCatalogSignature &&
    (status.state === "queued" ||
      status.state === "running" ||
      status.state === "succeeded")
  ) {
    return false;
  }

  if (hasActiveDriveSession) {
    return true;
  }

  const updatedAtMs = Date.parse(status.updatedAt || "");

  if (Number.isNaN(updatedAtMs)) {
    return false;
  }

  const ageMs = Date.now() - updatedAtMs;

  if (status.state === "queued") {
    return ageMs < 10 * 60 * 1000;
  }

  if (status.state === "running") {
    return ageMs < 30 * 60 * 1000;
  }

  if (status.state === "succeeded" || status.state === "failed") {
    return ageMs < 12 * 60 * 60 * 1000;
  }

  return false;
}

function formatElapsed(elapsedMs: number): string {
  const totalMinutes = Math.max(1, Math.round(elapsedMs / 60000));

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes} min`;
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
