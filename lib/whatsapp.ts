import type { CatalogDay, CatalogVideo, TreeMoment } from "./catalogTypes";
import { formatTimestamp } from "./time";

const DEFAULT_WHATSAPP_NUMBER = "5212220000000";

export function getWhatsAppNumber(): string {
  return (
    process.env.NEXT_PUBLIC_TERRA_VIVA_WHATSAPP_NUMBER ||
    DEFAULT_WHATSAPP_NUMBER
  );
}

export function buildWhatsAppMessage(
  catalog: CatalogDay,
  video: CatalogVideo | undefined,
  moment: TreeMoment,
  displayTreeNumber = moment.treeNumber
): string {
  return [
    "Hola, me interesa este \u00e1rbol de Terra Viva:",
    `\u00c1rbol #${displayTreeNumber.toString().padStart(2, "0")}`,
    `Cat\u00e1logo: ${catalog.date}`,
    `Video: ${video?.title || moment.sectionLabel}`,
    `Tiempo: ${formatTimestamp(moment.timestampSeconds)}`,
    "\u00bfSigue disponible?"
  ].join("\n");
}

export function buildWhatsAppUrl(
  catalog: CatalogDay,
  video: CatalogVideo | undefined,
  moment: TreeMoment,
  displayTreeNumber?: number
): string {
  const number = getWhatsAppNumber();
  const message = buildWhatsAppMessage(
    catalog,
    video,
    moment,
    displayTreeNumber
  );

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
