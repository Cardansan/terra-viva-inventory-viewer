"use client";

type SendSelectionWhatsAppButtonProps = {
  href: string;
  selectedCount: number;
};

export function SendSelectionWhatsAppButton({
  href,
  selectedCount
}: SendSelectionWhatsAppButtonProps) {
  if (selectedCount === 0) {
    return null;
  }

  const countLabel =
    selectedCount === 1 ? "(1 arbol)" : `(${selectedCount} arboles)`;

  return (
    <a
      className="flex min-h-14 w-full items-center justify-center gap-3 rounded-lg bg-[#1f8f4d] px-4 text-center text-base font-black leading-tight text-white shadow-soft transition hover:bg-[#187a40] sm:text-lg"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      <svg
        aria-hidden="true"
        className="h-6 w-6 shrink-0"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M19.1 4.9A9.8 9.8 0 0 0 3.7 16.7L2.4 21.5l4.9-1.3a9.8 9.8 0 0 0 4.7 1.2h.1a9.8 9.8 0 0 0 7-16.5Zm-7 14.8H12a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3a8.1 8.1 0 1 1 6.8 3.6Zm4.4-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.5.6.2 1.2.1 1.6.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.2-.3-.2-.5-.3Z" />
      </svg>
      <span>
        Enviar selecci&oacute;n por WhatsApp {countLabel}
      </span>
    </a>
  );
}
