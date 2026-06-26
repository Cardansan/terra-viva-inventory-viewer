"use client";

import { useEffect, useState } from "react";
import {
  clearBrowserDriveSession,
  readBrowserDriveSession,
  tokenHasExpired,
  writeBrowserDriveSession
} from "@/lib/driveSessionBrowser";
import {
  isDriveTokenExpiredError,
  probeDrivePublisherSession,
  type DriveSessionProbe
} from "@/lib/browserDriveClient";
import {
  requestGoogleDriveAccessToken,
  revokeGoogleDriveAccessToken
} from "@/lib/googleIdentityBrowser";
import {
  getPublicDriveClientId,
  getPublicDriveInboxFolderId
} from "@/lib/publicDriveConfig";

type SessionSeverity = "info" | "warning" | "error";

type SessionInfo = {
  severity: SessionSeverity;
  message: string;
  probe?: DriveSessionProbe;
};

export function AdminDriveSessionPanel() {
  const publicDriveClientId = getPublicDriveClientId();
  const defaultInboxFolderId = getPublicDriveInboxFolderId();
  const [accessToken, setAccessToken] = useState("");
  const [inboxFolderId, setInboxFolderId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  useEffect(() => {
    const storedSession = readBrowserDriveSession();
    setAccessToken(storedSession.accessToken);
    setInboxFolderId(storedSession.inboxFolderId || defaultInboxFolderId);
    setExpiresAt(storedSession.expiresAt);
    void validateSession(
      storedSession.accessToken,
      storedSession.inboxFolderId || defaultInboxFolderId,
      storedSession.expiresAt
    );
  }, []);

  async function validateSession(
    token = accessToken,
    folderId = inboxFolderId,
    tokenExpiresAt = expiresAt
  ) {
    const trimmedToken = token.trim();
    const trimmedFolderId = folderId.trim();

    setIsLoading(true);

    try {
      if (!trimmedToken && !trimmedFolderId) {
        setSessionInfo({
          severity: "warning",
          message:
            "Pega aqui el token temporal de Drive y el ID del Inbox para activar carga, proceso y publicacion automatica."
        });
        return;
      }

      if (!trimmedToken) {
        setSessionInfo({
          severity: "warning",
          message:
            publicDriveClientId
              ? "Toca Conectar con Google Drive para activar la carga y las ordenes automaticas."
              : "Falta el token temporal de Drive. Sin eso la web no puede subir videos ni dejar ordenes."
        });
        return;
      }

      if (tokenHasExpired(tokenExpiresAt)) {
        setSessionInfo({
          severity: "warning",
          message:
            "La sesion de Drive ya vencio en este navegador. Toca Conectar con Google Drive otra vez."
        });
        return;
      }

      if (!trimmedFolderId) {
        setSessionInfo({
          severity: "warning",
          message:
            "Falta el ID de la carpeta Inbox. Sin eso la web no sabe donde subir videos ni donde dejar la orden."
        });
        return;
      }

      const probe = await probeDrivePublisherSession(
        trimmedToken,
        trimmedFolderId
      );
      const hasWritePermission = probe.canAddChildren || probe.canEdit;

      setSessionInfo({
        severity: hasWritePermission ? "info" : "warning",
        message: hasWritePermission
          ? `Conexion lista. La web puede usar la carpeta "${probe.folderName}" para subir videos y coordinar el flujo automatico.`
          : `La carpeta "${probe.folderName}" abre bien, pero Drive no confirma permisos de escritura para subir videos o guardar ordenes.`,
        probe
      });
    } catch (error) {
      setSessionInfo({
        severity: "error",
        message: isDriveTokenExpiredError(error)
          ? "El token temporal de Drive ya vencio. Pega uno nuevo y vuelve a probar."
          : error instanceof Error
            ? error.message
            : "No se pudo revisar la conexion automatica de publicacion."
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function saveSession() {
    const nextSession = {
      accessToken: accessToken.trim(),
      inboxFolderId: inboxFolderId.trim(),
      expiresAt: expiresAt.trim()
    };

    setIsSaving(true);

    try {
      writeBrowserDriveSession(nextSession);
      await validateSession(nextSession.accessToken, nextSession.inboxFolderId);
    } finally {
      setIsSaving(false);
    }
  }

  async function connectWithGoogleDrive() {
    setIsAuthorizing(true);

    try {
      const session = await requestGoogleDriveAccessToken(publicDriveClientId);
      const nextInboxFolderId = inboxFolderId.trim() || defaultInboxFolderId;
      setAccessToken(session.accessToken);
      setExpiresAt(session.expiresAt);
      setInboxFolderId(nextInboxFolderId);
      writeBrowserDriveSession({
        accessToken: session.accessToken,
        inboxFolderId: nextInboxFolderId,
        expiresAt: session.expiresAt
      });
      await validateSession(
        session.accessToken,
        nextInboxFolderId,
        session.expiresAt
      );
    } catch (error) {
      setSessionInfo({
        severity: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo abrir la conexion con Google Drive."
      });
      setIsLoading(false);
    } finally {
      setIsAuthorizing(false);
    }
  }

  async function clearSession() {
    const previousToken = accessToken.trim();

    setAccessToken("");
    setInboxFolderId(defaultInboxFolderId);
    setExpiresAt("");
    clearBrowserDriveSession();
    await revokeGoogleDriveAccessToken(previousToken);
    setSessionInfo({
      severity: "warning",
      message:
        "La conexion de Drive se borro de este navegador. Puedes pegarla otra vez cuando haga falta."
    });
    setIsLoading(false);
  }

  const hasAccessToken = accessToken.trim().length > 0;
  const hasInboxFolderId = inboxFolderId.trim().length > 0;
  const hasClientId = publicDriveClientId.trim().length > 0;
  const expiresSoon = tokenHasExpired(expiresAt);
  const hasWritePermission = Boolean(
    sessionInfo?.probe?.canAddChildren || sessionInfo?.probe?.canEdit
  );
  const severityStyles =
    sessionInfo?.severity === "error"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : sessionInfo?.severity === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-terra-moss/20 bg-terra-paper/45 text-terra-ink";

  return (
    <section className="rounded-lg border border-terra-moss/20 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-terra-clay">
            Conexion de publicacion
          </p>
          <p className="mt-2 text-sm font-bold text-terra-ink/60">
            Esta conexion se guarda solo en este navegador para subir videos al
            Inbox y dejar ordenes a la laptop publicadora.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {hasClientId ? (
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-terra-clay px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-terra-moss/50"
              disabled={isAuthorizing}
              onClick={() => void connectWithGoogleDrive()}
              type="button"
            >
              {isAuthorizing
                ? "Conectando..."
                : hasAccessToken && !expiresSoon
                  ? "Cambiar cuenta de Google"
                  : "Conectar con Google Drive"}
            </button>
          ) : null}
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-terra-moss/30 bg-white px-4 text-sm font-black text-terra-ink"
            onClick={() => void validateSession()}
            type="button"
          >
            Probar conexion
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-terra-ink px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-terra-moss/50"
            disabled={isSaving}
            onClick={() => void saveSession()}
            type="button"
          >
            {isSaving ? "Guardando..." : "Guardar conexion"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-2">
          <span className="text-sm font-black text-terra-ink">
            Token temporal de Drive
          </span>
          <textarea
            className="min-h-28 rounded-lg border border-terra-moss/25 bg-white px-3 py-3 text-sm font-bold text-terra-ink"
            onChange={(event) => setAccessToken(event.target.value)}
            placeholder="Pega aqui el access token temporal"
            spellCheck={false}
            value={accessToken}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-black text-terra-ink">
            ID de la carpeta Inbox
          </span>
          <input
            className="min-h-12 rounded-lg border border-terra-moss/25 bg-white px-3 text-sm font-bold text-terra-ink"
            onChange={(event) => setInboxFolderId(event.target.value)}
            placeholder="Ejemplo: 13fN49fIdYxKot07q7EeC6IWKqCFjO7IQ"
            spellCheck={false}
            type="text"
            value={inboxFolderId}
          />
        </label>
      </div>

      <div
        className={`mt-4 rounded-lg border px-4 py-4 text-sm font-bold ${severityStyles}`}
      >
        <p>
          {isLoading
            ? "Revisando la conexion de Drive..."
            : sessionInfo?.message || "No hay mensaje de estado disponible."}
        </p>
        {sessionInfo?.probe ? (
          <p className="mt-2 text-xs font-black text-current/70">
            Carpeta encontrada: {sessionInfo.probe.folderName} | ID:{" "}
            {sessionInfo.probe.folderId}
          </p>
        ) : null}
        {expiresAt && !expiresSoon ? (
          <p className="mt-2 text-xs font-black text-current/70">
            Sesion activa hasta:{" "}
            {new Intl.DateTimeFormat("es-MX", {
              dateStyle: "medium",
              timeStyle: "short"
            }).format(new Date(expiresAt))}
          </p>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <span className="rounded-lg bg-terra-paper px-3 py-2 text-xs font-black text-terra-ink">
          Token temporal:{" "}
          {hasAccessToken ? (expiresSoon ? "vencido" : "listo") : "pendiente"}
        </span>
        <span className="rounded-lg bg-terra-paper px-3 py-2 text-xs font-black text-terra-ink">
          Inbox de Drive: {hasInboxFolderId ? "listo" : "pendiente"}
        </span>
        <span className="rounded-lg bg-terra-paper px-3 py-2 text-xs font-black text-terra-ink">
          Escritura web: {hasWritePermission ? "lista" : "pendiente"}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-terra-moss/30 bg-white px-4 text-sm font-black text-terra-ink"
          onClick={() => void clearSession()}
          type="button"
        >
          Borrar conexion de este navegador
        </button>
        <p className="text-sm font-bold text-terra-ink/55">
          Si el token vence, pega uno nuevo y vuelve a guardar.
        </p>
      </div>
    </section>
  );
}
