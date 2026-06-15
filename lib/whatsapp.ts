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
  moment: TreeMoment
): string {
  return [
    "Hola, me interesa este árbol de Terra Viva:",
    `Árbol #${moment.treeNumber.toString().padStart(2, "0")}`,
    `Catálogo: ${catalog.date}`,
    `Video: ${video?.title || moment.sectionLabel}`,
    `Tiempo: ${formatTimestamp(moment.timestampSeconds)}`,
    "¿Sigue disponible?"
  ].join("\n");
}

export function buildWhatsAppUrl(
  catalog: CatalogDay,
  video: CatalogVideo | undefined,
  moment: TreeMoment
): string {
  const number = getWhatsAppNumber();
  const message = buildWhatsAppMessage(catalog, video, moment);

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
