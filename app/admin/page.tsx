import { AdminCatalogEditor } from "@/components/AdminCatalogEditor";
import { getAdminCatalogHistory } from "@/lib/catalogRepository";

export default function AdminPage() {
  const { activeCatalog, backupCatalogs } = getAdminCatalogHistory();

  return (
    <AdminCatalogEditor
      initialActiveCatalog={activeCatalog}
      initialBackupCatalogs={backupCatalogs}
    />
  );
}
