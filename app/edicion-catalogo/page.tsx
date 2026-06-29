import { AdminCatalogAccessShell } from "@/components/AdminCatalogAccessShell";
import { getAdminCatalogHistory } from "@/lib/catalogRepository";
import { buildNoIndexMetadata } from "@/lib/pageMetadata";

export const metadata = buildNoIndexMetadata({
  title: "Edicion de catalogo | Terra Viva",
  description: "Panel interno para revisar, cargar y publicar catalogos Terra Viva."
});

export default function EditCatalogPage() {
  const { activeCatalog, backupCatalogs, publishedCatalog, draftCatalog } =
    getAdminCatalogHistory();

  return (
    <AdminCatalogAccessShell
      initialActiveCatalog={activeCatalog}
      initialBackupCatalogs={backupCatalogs}
      initialDraftCatalog={draftCatalog}
      initialPublishedCatalog={publishedCatalog}
    />
  );
}
