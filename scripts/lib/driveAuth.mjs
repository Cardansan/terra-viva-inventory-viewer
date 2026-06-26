import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const localConfigPath = path.join(
  process.cwd(),
  "terra-viva.publisher.local.json"
);
const tokenEndpoint = "https://oauth2.googleapis.com/token";
const tokenRefreshBufferMs = 5 * 60 * 1000;

function tokenExpiresSoon(expiresAt) {
  if (!expiresAt) {
    return true;
  }

  const parsed = Date.parse(expiresAt);

  if (Number.isNaN(parsed)) {
    return true;
  }

  return parsed <= Date.now() + tokenRefreshBufferMs;
}

async function readLocalConfig() {
  try {
    return JSON.parse(await readFile(localConfigPath, "utf8"));
  } catch {
    return {};
  }
}

async function writeLocalConfig(nextConfig) {
  const currentConfig = await readLocalConfig();

  await writeFile(
    localConfigPath,
    `${JSON.stringify({ ...currentConfig, ...nextConfig }, null, 2)}\n`,
    "utf8"
  );
}

async function refreshGoogleDriveAccessToken(config) {
  if (
    !config.googleDriveRefreshToken ||
    !config.googleDriveClientId ||
    !config.googleDriveClientSecret
  ) {
    throw new Error(
      "Faltan googleDriveRefreshToken, googleDriveClientId o googleDriveClientSecret para renovar Drive automaticamente."
    );
  }

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: config.googleDriveClientId,
      client_secret: config.googleDriveClientSecret,
      refresh_token: config.googleDriveRefreshToken,
      grant_type: "refresh_token"
    })
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `No se pudo renovar el token local de Drive (${response.status}): ${body}`
    );
  }

  const payload = JSON.parse(body);
  const expiresInSeconds =
    typeof payload.expires_in === "number" && Number.isFinite(payload.expires_in)
      ? payload.expires_in
      : 3600;
  const nextConfig = {
    ...config,
    googleDriveAccessToken: payload.access_token || "",
    googleDriveAccessTokenExpiresAt: new Date(
      Date.now() + expiresInSeconds * 1000
    ).toISOString()
  };

  await writeLocalConfig({
    googleDriveAccessToken: nextConfig.googleDriveAccessToken,
    googleDriveAccessTokenExpiresAt: nextConfig.googleDriveAccessTokenExpiresAt
  });

  process.env.GOOGLE_DRIVE_ACCESS_TOKEN = nextConfig.googleDriveAccessToken;

  return nextConfig;
}

export async function ensureGoogleDriveAccessToken(forceRefresh = false) {
  const config = await readLocalConfig();
  const envToken = process.env.GOOGLE_DRIVE_ACCESS_TOKEN?.trim() || "";
  const configToken = config.googleDriveAccessToken?.trim() || "";
  const activeToken = envToken || configToken;

  if (!activeToken) {
    throw new Error(
      "Falta GOOGLE_DRIVE_ACCESS_TOKEN. Ejecuta con --use-placeholder-media para probar sin Drive real."
    );
  }

  if (
    forceRefresh ||
    (configToken && tokenExpiresSoon(config.googleDriveAccessTokenExpiresAt))
  ) {
    const refreshedConfig = await refreshGoogleDriveAccessToken(config);
    return refreshedConfig.googleDriveAccessToken;
  }

  process.env.GOOGLE_DRIVE_ACCESS_TOKEN = activeToken;
  return activeToken;
}
