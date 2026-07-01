"use client";

import {
  readBrowserDriveSession,
  tokenHasExpired,
  type BrowserDriveSession,
  writeBrowserDriveSession
} from "./driveSessionBrowser";
import { requestGoogleDriveAccessToken } from "./googleIdentityBrowser";
import {
  getPublicDriveClientId,
  getPublicDriveInboxFolderId
} from "./publicDriveConfig";

type EnsureDriveBrowserSessionOptions = {
  inboxFolderId?: string;
};

export async function ensureDriveBrowserSession(
  options: EnsureDriveBrowserSessionOptions = {}
): Promise<BrowserDriveSession> {
  const storedSession = readBrowserDriveSession();
  const configuredInboxFolderId =
    options.inboxFolderId?.trim() || getPublicDriveInboxFolderId();
  const inboxFolderId =
    configuredInboxFolderId || storedSession.inboxFolderId.trim();

  if (!inboxFolderId) {
    throw new Error(
      "Falta configurar la carpeta Inbox de Drive para continuar."
    );
  }

  if (
    storedSession.accessToken.trim() &&
    storedSession.expiresAt.trim() &&
    !tokenHasExpired(storedSession.expiresAt)
  ) {
    if (storedSession.inboxFolderId.trim() !== inboxFolderId) {
      const nextSession = {
        ...storedSession,
        inboxFolderId
      };
      writeBrowserDriveSession(nextSession);
      return nextSession;
    }

    return {
      ...storedSession,
      inboxFolderId
    };
  }

  const clientId = getPublicDriveClientId();

  if (!clientId.trim()) {
    throw new Error(
      "Falta configurar el acceso de Google Drive para este sitio."
    );
  }

  const tokenSession = await requestGoogleDriveAccessToken(clientId);
  const nextSession: BrowserDriveSession = {
    accessToken: tokenSession.accessToken,
    expiresAt: tokenSession.expiresAt,
    inboxFolderId
  };

  writeBrowserDriveSession(nextSession);
  return nextSession;
}
