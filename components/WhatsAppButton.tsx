"use client";

import type { CatalogDay, CatalogVideo, TreeMoment } from "@/lib/catalogTypes";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

type WhatsAppButtonProps = {
  catalog: CatalogDay;
  video: CatalogVideo | undefined;
  moment: TreeMoment;
};

export function WhatsAppButton({ catalog, video, moment }: WhatsAppButtonProps) {
  const isUnavailable = moment.status === "sold" || moment.status === "hidden";
  const href = buildWhatsAppUrl(catalog, video, moment);

  return (
    <a
      aria-disabled={isUnavailable}
      className={`flex min-h-16 w-full items-center justify-center rounded-lg px-5 text-center text-xl font-black shadow-soft transition ${
        isUnavailable
          ? "pointer-events-none bg-stone-300 text-stone-700"
          : "bg-[#1f8f4d] text-white hover:bg-[#187a40]"
      }`}
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {isUnavailable ? "No disponible" : "Quiero este por WhatsApp"}
    </a>
  );
}
