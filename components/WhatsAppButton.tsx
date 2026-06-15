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
      className="flex min-h-16 w-full items-center justify-center rounded-lg bg-[#1f8f4d] px-3 text-center text-base font-black leading-tight text-white shadow-soft transition hover:bg-[#187a40] sm:text-xl"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      Quiero este por WhatsApp
    </a>
  );
}
