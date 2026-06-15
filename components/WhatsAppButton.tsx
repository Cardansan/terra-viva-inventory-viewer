"use client";

import type { CatalogDay, CatalogVideo, TreeMoment } from "@/lib/catalogTypes";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

type WhatsAppButtonProps = {
  catalog: CatalogDay;
  video: CatalogVideo | undefined;
  moment: TreeMoment;
};

export function WhatsAppButton({ catalog, video, moment }: WhatsAppButtonProps) {
  const href = buildWhatsAppUrl(catalog, video, moment);

  return (
    <a
      className="flex min-h-16 w-full items-center justify-center rounded-lg bg-[#1f8f4d] px-5 text-center text-xl font-black text-white shadow-soft transition hover:bg-[#187a40]"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      Quiero este por WhatsApp
    </a>
  );
}
