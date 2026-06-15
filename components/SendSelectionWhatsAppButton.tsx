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

  return (
    <a
      className="flex min-h-14 w-full items-center justify-center rounded-lg bg-[#1f8f4d] px-4 text-center text-base font-black leading-tight text-white shadow-soft transition hover:bg-[#187a40] sm:text-lg"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      Enviar selecci&oacute;n por WhatsApp
    </a>
  );
}
