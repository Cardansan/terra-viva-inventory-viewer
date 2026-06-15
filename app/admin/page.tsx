import { AdminCatalogEditor } from "@/components/AdminCatalogEditor";
import { getLatestCatalogForAdmin } from "@/lib/mockCatalogData";

export default function AdminPage() {
  const catalog = getLatestCatalogForAdmin();

  return <AdminCatalogEditor initialCatalog={catalog} />;
}
