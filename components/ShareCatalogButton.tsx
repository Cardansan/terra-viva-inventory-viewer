"use client";

import { useState } from "react";

type ShareStatus = "idle" | "shared" | "copied";

type ShareCatalogButtonProps = {
  title: string;
};

export function ShareCatalogButton({ title }: ShareCatalogButtonProps) {
  const [status, setStatus] = useState<ShareStatus>("idle");

  async function shareCatalog() {
    const url = window.location.href;

    try {
      if (typeof navigator === "undefined") {
        setStatus("copied");
        return;
      }

      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title,
          url
        });
        setStatus("shared");
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        copyWithTemporaryTextArea(url);
      }

      setStatus("copied");
    } catch {
      setStatus("idle");
    }
  }

  function copyWithTemporaryTextArea(value: string) {
    const textArea = document.createElement("textarea");

    try {
      textArea.value = value;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      if (typeof document.execCommand === "function") {
        document.execCommand("copy");
      }
    } catch {
      // Some browser automation sandboxes disable legacy clipboard APIs.
    } finally {
      try {
        if (document.body.contains(textArea)) {
          document.body.removeChild(textArea);
        }
      } catch {
        // Ignore cleanup errors in restricted browser sandboxes.
      }
    }
  }

  const feedback =
    status === "shared"
      ? "Catalogo compartido"
      : status === "copied"
        ? "Link copiado"
        : null;

  return (
    <div className="space-y-2 text-center">
      <button
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-terra-moss/30 bg-white/80 px-5 text-sm font-black text-terra-ink shadow-sm transition hover:bg-terra-paper"
        onClick={shareCatalog}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
          viewBox="0 0 24 24"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 4" />
          <path d="m15.4 6.5-6.8 4" />
        </svg>
        Compartir cat&aacute;logo
      </button>
      {feedback ? (
        <p className="text-sm font-bold text-terra-leaf" role="status">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
