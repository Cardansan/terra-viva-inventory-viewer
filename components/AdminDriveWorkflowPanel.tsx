"use client";

import { useEffect, useMemo, useState } from "react";
import type { CatalogDay } from "@/lib/catalogTypes";
import {
  createDrivePublisherOrder,
  getLatestDrivePublisherStatuses
} from "@/lib/browserDriveClient";
import type {
  DrivePublisherOrder,
  DrivePublisherStatus,
  PublisherOrderAction
} from "@/lib/drivePublisherTypes";

const STORAGE_KEY = "terra-viva:drive-access-token";
const INBOX_ID_STORAGE_KEY = "terra-viva:drive-inbox-folder-id";
const STATUS_STORAGE_KEY = "terra-viva:drive-publisher-statuses";

type AdminDriveWorkflowPanelProps = {
  activeCatalog: CatalogDay;
  canPublishDraft: boolean;
};

export function AdminDriveWorkflowPanel({
  activeCatalog,
  canPublishDraft
}: AdminDriveWorkflowPanelProps) {
  const [accessToken, setAccessToken] = useState("");
  const [draftTokenValue, setDraftTokenValue] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isBusy, setIsBusy] = useState<PublisherOrderAction | null>(null);
  const [statuses, setStatuses] = useState<DrivePublisherStatus[]>([]);
  const [inboxFolderId, setInboxFolderId] = useState("");

  const latestStatus = statuses[0];
  const hasToken = accessToken.trim().length > 0;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedToken = window.localStorage.getItem(STORAGE_KEY) || "";
    const storedInboxFolderId =
      window.localStorage.getItem(INBOX_ID_STORAGE_KEY) || "";
    const storedStatuses = window.localStorage.getItem(STATUS_STORAGE_KEY) || "";
    setAccessToken(storedToken);
    setDraftTokenValue(storedToken);
    setInboxFolderId(storedInboxFolderId);

    if (storedStatuses) {
      try {
        setStatuses(JSON.parse(storedStatuses) as DrivePublisherStatus[]);
      } catch {
        window.localStorage.removeItem(STATUS_STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (!hasToken) {
      return;
    }

    void refreshStatuses(accessToken);
    const intervalId = window.setInterval(() => {
      void refreshStatuses(accessToken);
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [accessToken, hasToken]);

  const publishDisabledReason = useMemo(() => {
    if (!hasToken) {
      return "Pega primero un token temporal de Drive.";
    }

    if (!canPublishDraft) {
      return "Primero procesa un borrador nuevo para que pueda aprobarse.";
    }

    return "";
  }, [canPublishDraft, hasToken]);

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
          STATUS_STORAGE_KEY,
          JSON.stringify(nextStatuses)
        );
      }
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "No se pudo leer el estado del publicador."
      );
    }
  }

  function saveToken() {
    const sanitizedToken = draftTokenValue.trim();
    setAccessToken(sanitizedToken);
    if (typeof window !== "undefined") {
      if (sanitizedToken) {
        window.localStorage.setItem(STORAGE_KEY, sanitizedToken);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      if (inboxFolderId.trim()) {
        window.localStorage.setItem(
          INBOX_ID_STORAGE_KEY,
          inboxFolderId.trim()
        );
      } else {
        window.localStorage.removeItem(INBOX_ID_STORAGE_KEY);
      }
    }
    setFeedback(
      sanitizedToken
        ? "Sesion de Drive guardada en este navegador."
        : "Sesion de Drive eliminada de este navegador."
    );
  }

  async function submitOrder(action: PublisherOrderAction) {
    if (!hasToken) {
      setFeedback("Pega primero un token temporal de Drive.");
      return;
    }

    const order: DrivePublisherOrder = {
      id: crypto.randomUUID(),
      action,
      createdAt: new Date().toISOString(),
      createdBy: "admin-web",
      catalogDate: activeCatalog.date
    };

    try {
      setIsBusy(action);
      setFeedback("");
      await createDrivePublisherOrder(
        accessToken,
        order,
        inboxFolderId.trim() || undefined
      );
      setFeedback(
        action === "process_draft"
          ? "Orden enviada. La laptop puede empezar a procesar en cuanto recoja la cola."
          : "Orden enviada. La laptop puede publicar este borrador aprobado en cuanto recoja la cola."
      );
      await refreshStatuses(accessToken);
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "No se pudo enviar la orden a Drive."
      );
    } finally {
      setIsBusy(null);
    }
  }

  return (
    <section className="mb-4 rounded-lg bg-white p-4 shadow-soft ring-1 ring-terra-moss/20">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-terra-clay">
            Publicador remoto
          </p>
          <h2 className="mt-1 text-xl font-black text-terra-ink">
            Pedir procesamiento o publicacion desde esta web
          </h2>
          <p className="mt-2 text-sm font-bold text-terra-ink/60">
            Esta seccion deja una orden en Google Drive. La laptop publicadora la recoge, procesa y deja aqui el estado.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-lg bg-terra-paper/60 p-4">
          <label className="block text-sm font-black text-terra-ink">
            Token temporal de Drive
          </label>
          <textarea
            className="mt-2 min-h-28 w-full rounded-lg border border-terra-moss/25 bg-white px-3 py-3 text-sm font-bold text-terra-ink"
            onChange={(event) => setDraftTokenValue(event.target.value)}
            placeholder="Pega aqui el token temporal para esta laptop o este telefono."
            value={draftTokenValue}
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-terra-moss/30 bg-white px-4 text-sm font-black text-terra-ink"
              onClick={saveToken}
              type="button"
            >
              Guardar sesion de Drive
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-terra-moss/30 bg-white px-4 text-sm font-black text-terra-ink"
              onClick={() => {
                setDraftTokenValue("");
                setAccessToken("");
                if (typeof window !== "undefined") {
                  window.localStorage.removeItem(STORAGE_KEY);
                }
                setFeedback("Sesion de Drive eliminada de este navegador.");
              }}
              type="button"
            >
              Borrar sesion
            </button>
          </div>
          <label className="mt-4 block text-sm font-black text-terra-ink">
            Inbox folder ID
          </label>
          <input
            className="mt-2 min-h-11 w-full rounded-lg border border-terra-moss/25 bg-white px-3 text-sm font-bold text-terra-ink"
            onChange={(event) => setInboxFolderId(event.target.value)}
            placeholder="13fN49fIdYxKot07q7EeC6IWKqCFjO7IQ"
            type="text"
            value={inboxFolderId}
          />
        </div>

        <div className="rounded-lg bg-terra-paper/60 p-4">
          <p className="text-sm font-black text-terra-ink">Acciones</p>
          <p className="mt-3 text-sm font-bold text-terra-ink/65">
            El procesamiento toma todos los videos pendientes que sigan dentro del Inbox de Drive. Cuando un catalogo se publica bien, esos videos se mueven a `Procesados` para que no vuelvan a entrar en la siguiente corrida.
          </p>
          <div className="mt-3 space-y-2">
            <button
              className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-terra-clay px-5 text-base font-black text-white"
              disabled={!hasToken || isBusy !== null}
              onClick={() => submitOrder("process_draft")}
              type="button"
            >
              {isBusy === "process_draft"
                ? "Enviando orden de proceso..."
                : "Procesar videos de Drive"}
            </button>
            <button
              className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-terra-leaf px-5 text-base font-black text-white disabled:cursor-not-allowed disabled:bg-terra-moss/40"
              disabled={Boolean(publishDisabledReason) || isBusy !== null}
              onClick={() => submitOrder("publish_approved")}
              type="button"
            >
              {isBusy === "publish_approved"
                ? "Enviando orden de publicacion..."
                : "Publicar borrador aprobado"}
            </button>
            {publishDisabledReason ? (
              <p className="text-xs font-bold text-terra-ink/55">
                {publishDisabledReason}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {feedback ? (
        <p className="mt-3 text-sm font-bold text-terra-ink/65">{feedback}</p>
      ) : null}

      <div className="mt-4 rounded-lg border border-terra-moss/20 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-black uppercase tracking-[0.12em] text-terra-clay">
            Estado reciente
          </p>
          {hasToken ? (
            <button
              className="text-sm font-black text-terra-ink/60"
              onClick={() => void refreshStatuses(accessToken)}
              type="button"
            >
              Actualizar
            </button>
          ) : null}
        </div>

        {latestStatus ? (
          <article className="mt-3 rounded-lg bg-terra-paper/60 p-4">
            <p className="text-base font-black text-terra-ink">
              {getStateLabel(latestStatus.state)}
            </p>
            <p className="mt-1 text-sm font-bold text-terra-ink/65">
              {getActionLabel(latestStatus.action)}
            </p>
            <p className="mt-2 text-sm font-bold text-terra-ink/60">
              {latestStatus.message}
            </p>
            <p className="mt-2 text-xs font-bold text-terra-ink/45">
              Actualizado: {formatTimestamp(latestStatus.updatedAt)}
            </p>
            {latestStatus.result?.momentCount ? (
              <p className="mt-1 text-xs font-bold text-terra-ink/45">
                Momentos detectados: {latestStatus.result.momentCount}
              </p>
            ) : null}
            {feedback ? (
              <p className="mt-2 text-xs font-bold text-terra-clay">
                {feedback}
              </p>
            ) : null}
          </article>
        ) : (
          <p className="mt-3 text-sm font-bold text-terra-ink/55">
            {hasToken
              ? "Todavia no hay estados guardados en Drive."
              : "Guarda primero la sesion de Drive para poder ver estados."}
          </p>
        )}
      </div>
    </section>
  );
}

function getActionLabel(action: PublisherOrderAction): string {
  return action === "process_draft"
    ? "Procesar borrador desde Drive"
    : "Publicar borrador aprobado";
}

function getStateLabel(state: DrivePublisherStatus["state"]): string {
  switch (state) {
    case "queued":
      return "Orden en cola";
    case "running":
      return "Procesando en laptop";
    case "succeeded":
      return "Termino bien";
    case "failed":
      return "Hubo un error";
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
