"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getAllowedAdminGoogleGateEmails,
  getPublicAdminGoogleGateClientId
} from "@/lib/adminAccessConfig";
import {
  adminGateSessionHasExpired,
  clearAdminGateSession,
  readAdminGateSession,
  writeAdminGateSession
} from "@/lib/adminGateSessionBrowser";
import { loadGoogleIdentityScript } from "@/lib/googleIdentityBrowser";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdConfiguration = {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  use_fedcm_for_prompt?: boolean;
};

type GoogleIdButtonOptions = {
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  shape?: "rectangular" | "pill" | "circle" | "square";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  width?: number;
  locale?: string;
};

type GoogleIdentityWindow = Window & {
  google?: {
    accounts?: {
      id?: {
        initialize: (config: GoogleIdConfiguration) => void;
        renderButton: (
          element: HTMLElement,
          options: GoogleIdButtonOptions
        ) => void;
      };
    };
  };
};

type GoogleGateIdentity = {
  email: string;
  name?: string;
  picture?: string;
  expiresAt: string;
  emailVerified: boolean;
};

type AdminGoogleGateProps = {
  children: React.ReactNode;
};

function getGoogleIdentityWindow(): GoogleIdentityWindow {
  return window as GoogleIdentityWindow;
}

function decodeJwtPayloadSegment(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );

  return decodeURIComponent(
    window
      .atob(padded)
      .split("")
      .map((character) =>
        `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`
      )
      .join("")
  );
}

function parseGoogleGateCredential(credential: string): GoogleGateIdentity {
  const parts = credential.split(".");

  if (parts.length < 2) {
    throw new Error("Google no devolvio una credencial valida.");
  }

  const payload = JSON.parse(
    decodeJwtPayloadSegment(parts[1])
  ) as Record<string, unknown>;
  const email = typeof payload.email === "string" ? payload.email : "";
  const expiresAtSeconds =
    typeof payload.exp === "number" && Number.isFinite(payload.exp)
      ? payload.exp
      : 0;

  if (!email || !expiresAtSeconds) {
    throw new Error("Google no devolvio el correo esperado para entrar.");
  }

  return {
    email: email.toLowerCase(),
    name: typeof payload.name === "string" ? payload.name : undefined,
    picture:
      typeof payload.picture === "string" ? payload.picture : undefined,
    expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
    emailVerified: payload.email_verified === true
  };
}

export function AdminGoogleGate({ children }: AdminGoogleGateProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const allowedEmails = useMemo(() => getAllowedAdminGoogleGateEmails(), []);
  const clientId = useMemo(() => getPublicAdminGoogleGateClientId(), []);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const storedSession = readAdminGateSession();

    if (
      storedSession &&
      !adminGateSessionHasExpired(storedSession.expiresAt) &&
      allowedEmails.includes(storedSession.email.toLowerCase())
    ) {
      setIsAuthorized(true);
      setIsChecking(false);
      return;
    }

    clearAdminGateSession();
    setIsChecking(false);
  }, [allowedEmails]);

  useEffect(() => {
    if (isChecking || isAuthorized || !buttonRef.current) {
      return;
    }

    if (!clientId) {
      setFeedback(
        "Falta configurar el client ID publico para activar el acceso con Google."
      );
      return;
    }

    let cancelled = false;

    async function prepareButton() {
      try {
        await loadGoogleIdentityScript();

        if (cancelled || !buttonRef.current) {
          return;
        }

        const googleIdentity = getGoogleIdentityWindow().google?.accounts?.id;

        if (!googleIdentity) {
          throw new Error(
            "Google no termino de cargar el acceso ligero para esta pagina."
          );
        }

        buttonRef.current.innerHTML = "";
        googleIdentity.initialize({
          client_id: clientId,
          callback: (response) => {
            try {
              const credential = response.credential || "";
              const identity = parseGoogleGateCredential(credential);

              if (!identity.emailVerified) {
                throw new Error(
                  "Google no confirmo ese correo. Usa una cuenta verificada."
                );
              }

              if (!allowedEmails.includes(identity.email)) {
                throw new Error(
                  `La cuenta ${identity.email} no esta autorizada para esta pagina.`
                );
              }

              writeAdminGateSession({
                email: identity.email,
                name: identity.name,
                picture: identity.picture,
                expiresAt: identity.expiresAt
              });
              setFeedback("");
              setIsAuthorized(true);
            } catch (error) {
              clearAdminGateSession();
              setFeedback(
                error instanceof Error
                  ? error.message
                  : "No se pudo validar la cuenta de Google."
              );
            }
          },
          auto_select: false,
          use_fedcm_for_prompt: true
        });
        googleIdentity.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: "continue_with",
          width: 320,
          locale: "es"
        });
      } catch (error) {
        setFeedback(
          error instanceof Error
            ? error.message
            : "No se pudo preparar el acceso con Google."
        );
      }
    }

    void prepareButton();

    return () => {
      cancelled = true;
      if (buttonRef.current) {
        buttonRef.current.innerHTML = "";
      }
    };
  }, [allowedEmails, clientId, isAuthorized, isChecking]);

  if (isAuthorized) {
    return <>{children}</>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-8">
      <section className="w-full rounded-[28px] bg-white p-6 shadow-soft ring-1 ring-terra-moss/20 sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-terra-clay">
          Edicion de catalogo
        </p>
        <h1 className="mt-2 text-3xl font-black text-terra-ink">
          Entrar con Google
        </h1>
        <p className="mt-3 text-base font-bold text-terra-ink/70">
          Esta barrera reduce accesos casuales al panel de edicion. No reemplaza
          autenticacion real de servidor porque GitHub Pages sigue siendo un
          sitio estatico.
        </p>
        <p className="mt-3 text-sm font-bold text-terra-ink/60">
          Cuentas preparadas: {allowedEmails.join(", ")}
        </p>

        <div className="mt-6 rounded-2xl bg-terra-paper/55 p-4 ring-1 ring-terra-moss/15">
          <p className="text-sm font-black text-terra-ink">
            Usa una cuenta autorizada para continuar.
          </p>
          <p className="mt-2 text-sm font-bold text-terra-ink/60">
            El acceso a Drive para subir, crear borrador y publicar sigue
            ocurriendo solo dentro de esos botones operativos.
          </p>
          <div
            className="mt-4 flex min-h-14 items-center justify-center"
            ref={buttonRef}
          >
            {isChecking ? (
              <span className="text-sm font-bold text-terra-ink/55">
                Preparando acceso con Google...
              </span>
            ) : null}
          </div>
          {feedback ? (
            <p className="mt-4 rounded-xl bg-[#fff7ef] px-4 py-3 text-sm font-black text-terra-ink ring-1 ring-terra-clay/20">
              {feedback}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

