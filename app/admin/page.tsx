import { AdminCatalogEditor } from "@/components/AdminCatalogEditor";
import { getAdminCatalogHistory } from "@/lib/catalogRepository";

export default function AdminPage() {
  const { activeCatalog, backupCatalogs, publishedCatalog, draftCatalog } =
    getAdminCatalogHistory();

  return (
    <AdminCatalogEditor
      initialActiveCatalog={activeCatalog}
      initialBackupCatalogs={backupCatalogs}
      initialDraftCatalog={draftCatalog}
      initialPublishedCatalog={publishedCatalog}
    />
  );
}
