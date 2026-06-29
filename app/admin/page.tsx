import { notFound } from "next/navigation";
import { buildNoIndexMetadata } from "@/lib/pageMetadata";

export const metadata = buildNoIndexMetadata({
  title: "Ruta desactivada | Terra Viva",
  description: "Ruta antigua del panel interno desactivada."
});

export default function LegacyAdminPage() {
  notFound();
}
