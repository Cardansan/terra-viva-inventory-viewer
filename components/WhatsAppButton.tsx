"use client";

import type { CatalogDay, CatalogVideo, TreeMoment } from "@/lib/catalogTypes";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

type WhatsAppButtonProps = {
  catalog: CatalogDay;
  video: CatalogVideo | undefined;
  moment: TreeMoment;
  displayTreeNumber?: number;
};

export function WhatsAppButton({
  catalog,
  video,
  moment,
  displayTreeNumber
}: WhatsAppButtonProps) {
  const href = buildWhatsAppUrl(catalog, video, moment, displayTreeNumber);

  return (
    <a
      className="flex min-h-16 w-full items-center justify-center gap-3 rounded-lg bg-[#1f8f4d] px-3 text-center text-lg font-black leading-tight text-white shadow-soft transition hover:bg-[#187a40] sm:text-xl"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      <svg
        aria-hidden="true"
        className="h-6 w-6 shrink-0"
        fill="currentColor"
        viewBox="0 0 32 32"
      >
        <path d="M16.02 3.2A12.74 12.74 0 0 0 5.12 22.5L3.6 28.8l6.45-1.5A12.74 12.74 0 1 0 16.02 3.2Zm0 22.95c-2.05 0-3.96-.6-5.57-1.63l-.4-.25-3.82.9.9-3.72-.27-.4a10.14 10.14 0 1 1 9.16 5.1Zm5.8-7.6c-.32-.16-1.9-.94-2.2-1.05-.3-.1-.52-.16-.74.16-.21.32-.84 1.05-1.03 1.26-.19.21-.38.24-.7.08-.32-.16-1.36-.5-2.6-1.6-.96-.86-1.61-1.92-1.8-2.24-.19-.32-.02-.5.14-.66.15-.14.32-.38.48-.57.16-.19.21-.32.32-.54.1-.21.05-.4-.03-.56-.08-.16-.74-1.79-1.02-2.45-.27-.64-.54-.55-.74-.56h-.64c-.21 0-.56.08-.86.4-.3.32-1.13 1.1-1.13 2.68s1.16 3.12 1.32 3.33c.16.21 2.28 3.48 5.52 4.88.77.33 1.38.53 1.85.68.78.25 1.49.21 2.05.13.63-.09 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.13-.3-.21-.62-.37Z" />
      </svg>
      <span>Quiero &eacute;ste</span>
    </a>
  );
}
