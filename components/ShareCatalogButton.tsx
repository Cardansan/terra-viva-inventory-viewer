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
        className="min-h-11 rounded-lg border border-terra-moss/30 bg-white/80 px-5 text-sm font-black text-terra-ink shadow-sm transition hover:bg-terra-paper"
        onClick={shareCatalog}
        type="button"
      >
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
