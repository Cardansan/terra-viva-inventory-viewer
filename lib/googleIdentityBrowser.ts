"use client";

const GOOGLE_IDENTITY_SCRIPT_URL = "https://accounts.google.com/gsi/client";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const GOOGLE_IDENTITY_SCRIPT_ID = "terra-viva-google-identity-script";

type TokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
  expires_in?: number;
  scope?: string;
};

type TokenErrorResponse = {
  type?: string;
};

type OverridableTokenClientConfig = {
  prompt?: "" | "consent" | "select_account";
};

type TokenClient = {
  requestAccessToken: (overrideConfig?: OverridableTokenClientConfig) => void;
};

type TokenClientConfig = {
  client_id: string;
  scope: string;
  callback: (response: TokenResponse) => void;
  error_callback?: (response: TokenErrorResponse) => void;
};

type GoogleIdentityWindow = Window & {
  google?: {
    accounts?: {
      oauth2?: {
        initTokenClient: (config: TokenClientConfig) => TokenClient;
        revoke: (token: string, callback?: () => void) => void;
      };
    };
  };
};

let googleIdentityScriptPromise: Promise<void> | null = null;

function getGoogleIdentityWindow(): GoogleIdentityWindow {
  return window as GoogleIdentityWindow;
}

export function getDriveBrowserScope(): string {
  return DRIVE_SCOPE;
}

export async function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Google Drive solo puede conectarse desde el navegador.");
  }

  const existingGoogle = getGoogleIdentityWindow().google;
  if (existingGoogle?.accounts?.oauth2) {
    return;
  }

  if (!googleIdentityScriptPromise) {
    googleIdentityScriptPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.getElementById(
        GOOGLE_IDENTITY_SCRIPT_ID
      ) as HTMLScriptElement | null;

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), {
          once: true
        });
        existingScript.addEventListener(
          "error",
          () =>
            reject(
              new Error(
                "No se pudo cargar la libreria de acceso de Google Drive."
              )
            ),
          { once: true }
        );
        return;
      }

      const script = document.createElement("script");
      script.id = GOOGLE_IDENTITY_SCRIPT_ID;
      script.src = GOOGLE_IDENTITY_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(
          new Error(
            "No se pudo cargar la libreria de acceso de Google Drive."
          )
        );
      document.head.appendChild(script);
    });
  }

  await googleIdentityScriptPromise;

  if (!getGoogleIdentityWindow().google?.accounts?.oauth2) {
    throw new Error(
      "Google Drive no termino de cargar correctamente en este navegador."
    );
  }
}

export async function requestGoogleDriveAccessToken(
  clientId: string
): Promise<{ accessToken: string; expiresAt: string }> {
  if (!clientId.trim()) {
    throw new Error(
      "Falta configurar el client ID publico de Google Drive para la web."
    );
  }

  await loadGoogleIdentityScript();

  const googleOauth = getGoogleIdentityWindow().google?.accounts?.oauth2;

  if (!googleOauth) {
    throw new Error(
      "Google Drive no termino de cargar correctamente en este navegador."
    );
  }

  return new Promise((resolve, reject) => {
    const tokenClient = googleOauth.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(
            new Error(
              response.error_description ||
                `Google devolvio un error de acceso: ${response.error}`
            )
          );
          return;
        }

        if (!response.access_token) {
          reject(
            new Error("Google no devolvio un token de acceso para Drive.")
          );
          return;
        }

        const expiresInSeconds =
          typeof response.expires_in === "number" &&
          Number.isFinite(response.expires_in)
            ? response.expires_in
            : 3600;

        resolve({
          accessToken: response.access_token,
          expiresAt: new Date(
            Date.now() + expiresInSeconds * 1000
          ).toISOString()
        });
      },
      error_callback: (response) => {
        if (response.type === "popup_closed") {
          reject(new Error("Se cerro la ventana de Google antes de terminar."));
          return;
        }

        if (response.type === "popup_failed_to_open") {
          reject(
            new Error(
              "El navegador bloqueo la ventana de Google. Revisa pop-ups e intenta de nuevo."
            )
          );
          return;
        }

        reject(
          new Error(
            "No se pudo abrir el acceso de Google Drive en este navegador."
          )
        );
      }
    });

    tokenClient.requestAccessToken({
      prompt: "select_account"
    });
  });
}

export async function revokeGoogleDriveAccessToken(
  accessToken: string
): Promise<void> {
  if (!accessToken.trim()) {
    return;
  }

  await loadGoogleIdentityScript();

  const googleOauth = getGoogleIdentityWindow().google?.accounts?.oauth2;

  if (!googleOauth) {
    return;
  }

  await new Promise<void>((resolve) => {
    googleOauth.revoke(accessToken, () => resolve());
  });
}
