"use client";

import type { CatalogDay } from "@/lib/catalogTypes";
import { isAdminGoogleGateEnabled } from "@/lib/adminAccessConfig";
import { AdminCatalogEditor } from "./AdminCatalogEditor";
import { AdminGoogleGate } from "./AdminGoogleGate";

type AdminCatalogAccessShellProps = {
  initialActiveCatalog: CatalogDay;
  initialBackupCatalogs: CatalogDay[];
  initialPublishedCatalog: CatalogDay;
  initialDraftCatalog?: CatalogDay;
};

export function AdminCatalogAccessShell(
  props: AdminCatalogAccessShellProps
) {
  const editor = <AdminCatalogEditor {...props} />;

  if (!isAdminGoogleGateEnabled()) {
    return editor;
  }

  return <AdminGoogleGate>{editor}</AdminGoogleGate>;
}

