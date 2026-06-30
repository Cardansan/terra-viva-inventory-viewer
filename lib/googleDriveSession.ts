import {
  readPublisherSessionConfig,
  writePublisherSessionConfig,
  type PublisherSessionConfig
} from "./publisherLocalConfig";

type DriveSessionSeverity = "info" | "warning" | "error";

export type DriveSessionDiagnostics = {
  driveFolderId: string;
  driveRootFolderId: string;
  googleDriveAccessToken: string;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  canAutoRefresh: boolean;
  severity: DriveSessionSeverity;
  message: string;
};

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

async function probeDriveFolderAccess(sessionConfig: PublisherSessionConfig) {
  if (!sessionConfig.driveFolderId) {
    throw new Error(
      "La configuracion local no tiene driveFolderId para validar la carpeta de Drive."
    );
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${sessionConfig.driveFolderId}?fields=${encodeURIComponent(
      "id,name,capabilities(canEdit,canAddChildren)"
    )}`,
    {
      headers: {
        Authorization: `Bearer ${sessionConfig.googleDriveAccessToken}`
      }
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `No se pudo validar el acceso real a Drive (${response.status}): ${body}`
    );
  }

  return (await response.json()) as {
    capabilities?: {
      canAddChildren?: boolean;
      canEdit?: boolean;
    };
    name?: string;
  };
}

function tokenExpiresSoon(expiresAt: string): boolean {
  if (!expiresAt) {
    return true;
  }

  const parsed = Date.parse(expiresAt);

  if (Number.isNaN(parsed)) {
    return true;
  }

  return parsed <= Date.now() + TOKEN_REFRESH_BUFFER_MS;
}

async function refreshGoogleDriveAccessToken(
  sessionConfig: PublisherSessionConfig
) {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: sessionConfig.googleDriveClientId,
      client_secret: sessionConfig.googleDriveClientSecret,
      refresh_token: sessionConfig.googleDriveRefreshToken,
      grant_type: "refresh_token"
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `No se pudo renovar la sesion de Drive automaticamente (${response.status}): ${body}`
    );
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token) {
    throw new Error(
      "Google no devolvio un access token nuevo al intentar renovar Drive."
    );
  }

  const expiresInSeconds =
    typeof payload.expires_in === "number" && Number.isFinite(payload.expires_in)
      ? payload.expires_in
      : 3600;
  const nextConfig: PublisherSessionConfig = {
    ...sessionConfig,
    googleDriveAccessToken: payload.access_token,
    googleDriveAccessTokenExpiresAt: new Date(
      Date.now() + expiresInSeconds * 1000
    ).toISOString()
  };

  await writePublisherSessionConfig(nextConfig);

  return nextConfig;
}

export async function resolveDriveSessionDiagnostics(): Promise<DriveSessionDiagnostics> {
  let sessionConfig = await readPublisherSessionConfig();
  const hasAccessToken = Boolean(sessionConfig.googleDriveAccessToken);
  const hasRefreshToken = Boolean(sessionConfig.googleDriveRefreshToken);
  const canAutoRefresh = Boolean(
    sessionConfig.googleDriveRefreshToken &&
      sessionConfig.googleDriveClientId &&
      sessionConfig.googleDriveClientSecret
  );

  if (canAutoRefresh && tokenExpiresSoon(sessionConfig.googleDriveAccessTokenExpiresAt)) {
    try {
      sessionConfig = await refreshGoogleDriveAccessToken(sessionConfig);
    } catch (error) {
      return {
        driveFolderId: sessionConfig.driveFolderId,
        driveRootFolderId: sessionConfig.driveRootFolderId,
        googleDriveAccessToken: sessionConfig.googleDriveAccessToken,
        hasAccessToken,
        hasRefreshToken,
        canAutoRefresh,
        severity: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo renovar automaticamente la sesion de Drive."
      };
    }
  }

  if (!sessionConfig.googleDriveAccessToken) {
    return {
      driveFolderId: sessionConfig.driveFolderId,
      driveRootFolderId: sessionConfig.driveRootFolderId,
      googleDriveAccessToken: "",
      hasAccessToken: false,
      hasRefreshToken,
      canAutoRefresh,
      severity: "error",
      message:
        "La laptop no tiene una sesion activa de Drive. Revisa la configuracion local del publicador."
    };
  }

  try {
    const driveProbe = await probeDriveFolderAccess(sessionConfig);

    if (!driveProbe.capabilities?.canAddChildren && !driveProbe.capabilities?.canEdit) {
      return {
        driveFolderId: sessionConfig.driveFolderId,
        driveRootFolderId: sessionConfig.driveRootFolderId,
        googleDriveAccessToken: sessionConfig.googleDriveAccessToken,
        hasAccessToken: true,
        hasRefreshToken,
        canAutoRefresh,
        severity: "warning",
        message:
          "La sesion de Drive puede leer la carpeta, pero no confirma permisos de escritura sobre el Inbox configurado."
      };
    }
  } catch (error) {
    if (canAutoRefresh) {
      try {
        sessionConfig = await refreshGoogleDriveAccessToken(sessionConfig);
        await probeDriveFolderAccess(sessionConfig);
      } catch (refreshError) {
        return {
          driveFolderId: sessionConfig.driveFolderId,
          driveRootFolderId: sessionConfig.driveRootFolderId,
          googleDriveAccessToken: sessionConfig.googleDriveAccessToken,
          hasAccessToken: true,
          hasRefreshToken,
          canAutoRefresh,
          severity: "error",
          message:
            refreshError instanceof Error
              ? refreshError.message
              : "No se pudo validar la sesion real de Drive."
        };
      }
    } else {
      return {
        driveFolderId: sessionConfig.driveFolderId,
        driveRootFolderId: sessionConfig.driveRootFolderId,
        googleDriveAccessToken: sessionConfig.googleDriveAccessToken,
        hasAccessToken: true,
        hasRefreshToken,
        canAutoRefresh,
        severity: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo validar la sesion real de Drive."
      };
    }
  }

  if (canAutoRefresh) {
    return {
      driveFolderId: sessionConfig.driveFolderId,
      driveRootFolderId: sessionConfig.driveRootFolderId,
      googleDriveAccessToken: sessionConfig.googleDriveAccessToken,
      hasAccessToken: true,
      hasRefreshToken: true,
      canAutoRefresh: true,
      severity: "info",
      message:
        "La laptop tiene sesion de Drive y la renovacion automatica esta activa."
    };
  }

  if (hasRefreshToken) {
    return {
      driveFolderId: sessionConfig.driveFolderId,
      driveRootFolderId: sessionConfig.driveRootFolderId,
      googleDriveAccessToken: sessionConfig.googleDriveAccessToken,
      hasAccessToken: true,
      hasRefreshToken: true,
      canAutoRefresh: false,
      severity: "warning",
      message:
        "La laptop tiene token de Drive, pero la renovacion automatica todavia no esta completa porque faltan googleDriveClientId y googleDriveClientSecret en la configuracion local."
    };
  }

  return {
    driveFolderId: sessionConfig.driveFolderId,
    driveRootFolderId: sessionConfig.driveRootFolderId,
    googleDriveAccessToken: sessionConfig.googleDriveAccessToken,
    hasAccessToken: true,
    hasRefreshToken: false,
    canAutoRefresh: false,
    severity: "warning",
    message:
      "La laptop tiene access token de Drive, pero no tiene refresh token configurado para renovarlo automaticamente."
  };
}
