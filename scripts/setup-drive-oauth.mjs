#!/usr/bin/env node
import http from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const localConfigPath = path.join(projectRoot, "terra-viva.publisher.local.json");
const tempDir = path.join(projectRoot, ".tmp");
const sessionStatePath = path.join(tempDir, "drive-oauth-session.json");
const tokenEndpoint = "https://oauth2.googleapis.com/token";
const driveScope = "https://www.googleapis.com/auth/drive";

function openBrowser(url) {
  if (!url) {
    return false;
  }

  try {
    if (process.platform === "win32") {
      const child = spawn("rundll32.exe", ["url.dll,FileProtocolHandler", url], {
        detached: true,
        stdio: "ignore"
      });
      child.unref();
      return true;
    }

    if (process.platform === "darwin") {
      const child = spawn("open", [url], {
        detached: true,
        stdio: "ignore"
      });
      child.unref();
      return true;
    }

    const child = spawn("xdg-open", [url], {
      detached: true,
      stdio: "ignore"
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

function base64Url(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createCodeVerifier() {
  return base64Url(crypto.randomBytes(48));
}

function createCodeChallenge(codeVerifier) {
  return base64Url(crypto.createHash("sha256").update(codeVerifier).digest());
}

async function readLocalConfig() {
  return JSON.parse(await readFile(localConfigPath, "utf8"));
}

async function writeSessionState(payload) {
  await mkdir(tempDir, { recursive: true });
  await writeFile(sessionStatePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function updateLocalConfigWithTokens(config, tokenPayload) {
  const expiresInSeconds =
    typeof tokenPayload.expires_in === "number" && Number.isFinite(tokenPayload.expires_in)
      ? tokenPayload.expires_in
      : 3600;

  const nextConfig = {
    ...config,
    googleDriveAccessToken: tokenPayload.access_token || "",
    googleDriveRefreshToken:
      tokenPayload.refresh_token || config.googleDriveRefreshToken || "",
    googleDriveAccessTokenExpiresAt: new Date(
      Date.now() + expiresInSeconds * 1000
    ).toISOString()
  };

  await writeFile(localConfigPath, `${JSON.stringify(nextConfig, null, 2)}\n`, "utf8");

  return nextConfig;
}

async function exchangeCodeForTokens({
  clientId,
  clientSecret,
  code,
  codeVerifier,
  redirectUri
}) {
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    })
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `No se pudieron intercambiar los tokens con Google (${response.status}): ${body}`
    );
  }

  return JSON.parse(body);
}

async function verifyDriveAccess(accessToken, driveFolderId) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${driveFolderId}?fields=${encodeURIComponent(
      "id,name,capabilities(canEdit,canAddChildren)"
    )}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `Google devolvio error al validar acceso a Drive (${response.status}): ${body}`
    );
  }

  return JSON.parse(body);
}

async function main() {
  const config = await readLocalConfig();

  if (!config.googleDriveClientId || !config.googleDriveClientSecret) {
    throw new Error(
      "Faltan googleDriveClientId y googleDriveClientSecret en terra-viva.publisher.local.json."
    );
  }

  if (!config.driveFolderId) {
    throw new Error("Falta driveFolderId en terra-viva.publisher.local.json.");
  }

  const state = crypto.randomUUID();
  const codeVerifier = createCodeVerifier();
  const codeChallenge = createCodeChallenge(codeVerifier);

  const server = http.createServer();

  const listening = await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve(server.address());
    });
  });

  if (!listening || typeof listening === "string") {
    throw new Error("No se pudo abrir el servidor local para OAuth.");
  }

  const redirectUri = `http://127.0.0.1:${listening.port}/oauth2callback`;
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", config.googleDriveClientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", driveScope);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  await writeSessionState({
    authUrl: authUrl.toString(),
    browserOpened: openBrowser(authUrl.toString()),
    pid: process.pid,
    startedAt: new Date().toISOString(),
    state: "awaiting_browser_consent",
    status: "pending"
  });

  const timeout = setTimeout(async () => {
    await writeSessionState({
      authUrl: authUrl.toString(),
      finishedAt: new Date().toISOString(),
      message: "Se agoto el tiempo esperando la autorizacion en el navegador.",
      state: "timed_out",
      status: "failed"
    });
    server.close();
    process.exitCode = 1;
  }, 10 * 60 * 1000);

  server.on("request", async (request, response) => {
    if (!request.url) {
      response.statusCode = 400;
      response.end("Solicitud invalida.");
      return;
    }

    const requestUrl = new URL(request.url, redirectUri);

    if (requestUrl.pathname !== "/oauth2callback") {
      response.statusCode = 404;
      response.end("Ruta no encontrada.");
      return;
    }

    const returnedState = requestUrl.searchParams.get("state") || "";
    const code = requestUrl.searchParams.get("code") || "";
    const error = requestUrl.searchParams.get("error") || "";

    if (error) {
      await writeSessionState({
        authUrl: authUrl.toString(),
        finishedAt: new Date().toISOString(),
        message: `Google devolvio error durante el consentimiento: ${error}`,
        state: "oauth_error",
        status: "failed"
      });
      response.statusCode = 200;
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end("<h1>Terra Viva</h1><p>Google devolvio un error. Puedes cerrar esta ventana.</p>");
      clearTimeout(timeout);
      server.close();
      process.exitCode = 1;
      return;
    }

    if (!code || returnedState !== state) {
      await writeSessionState({
        authUrl: authUrl.toString(),
        finishedAt: new Date().toISOString(),
        message: "La respuesta de Google no trajo un codigo valido.",
        state: "invalid_callback",
        status: "failed"
      });
      response.statusCode = 200;
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end("<h1>Terra Viva</h1><p>La respuesta de Google no fue valida. Puedes cerrar esta ventana.</p>");
      clearTimeout(timeout);
      server.close();
      process.exitCode = 1;
      return;
    }

    try {
      const tokenPayload = await exchangeCodeForTokens({
        clientId: config.googleDriveClientId,
        clientSecret: config.googleDriveClientSecret,
        code,
        codeVerifier,
        redirectUri
      });

      if (!tokenPayload.refresh_token) {
        throw new Error(
          "Google no devolvio refresh_token. Reintenta el consentimiento con prompt=consent."
        );
      }

      const nextConfig = await updateLocalConfigWithTokens(config, tokenPayload);
      const driveProbe = await verifyDriveAccess(
        nextConfig.googleDriveAccessToken,
        nextConfig.driveFolderId
      );

      await writeSessionState({
        finishedAt: new Date().toISOString(),
        folderId: nextConfig.driveFolderId,
        folderName: driveProbe.name || "",
        message: "OAuth de Drive configurado correctamente y acceso validado.",
        state: "completed",
        status: "succeeded"
      });

      response.statusCode = 200;
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end("<h1>Terra Viva</h1><p>Drive quedo autorizado correctamente. Ya puedes cerrar esta ventana.</p>");
      clearTimeout(timeout);
      server.close();
      return;
    } catch (setupError) {
      await writeSessionState({
        authUrl: authUrl.toString(),
        finishedAt: new Date().toISOString(),
        message:
          setupError instanceof Error
            ? setupError.message
            : "No se pudo completar la configuracion OAuth de Drive.",
        state: "token_exchange_failed",
        status: "failed"
      });
      response.statusCode = 200;
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end("<h1>Terra Viva</h1><p>No se pudo completar la autorizacion. Revisa el archivo de estado local.</p>");
      clearTimeout(timeout);
      server.close();
      process.exitCode = 1;
    }
  });

  console.log(`Drive OAuth esperando autorizacion en ${redirectUri}`);
  console.log(`Auth URL: ${authUrl.toString()}`);
}

main().catch(async (error) => {
  await writeSessionState({
    finishedAt: new Date().toISOString(),
    message:
      error instanceof Error
        ? error.message
        : "No se pudo iniciar la configuracion OAuth de Drive.",
    state: "startup_failed",
    status: "failed"
  });
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
