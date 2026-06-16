export function findRetainedCatalogDates(activeDate, backupCount = 2, publishedDates = []) {
  const olderBackups = publishedDates
    .filter((date) => date !== activeDate && date < activeDate)
    .sort((left, right) => right.localeCompare(left))
    .slice(0, backupCount);

  return new Set([activeDate, ...olderBackups]);
}

export function findProcessedFoldersToTrash(processedFolders, retainedDates) {
  return processedFolders
    .filter((folder) => /^\d{4}-\d{2}-\d{2}$/.test(folder.name))
    .filter((folder) => !retainedDates.has(folder.name))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function validateBackupCatalogs(catalogs, requiredBackupCount = 2) {
  const validCatalogs = catalogs.filter((catalog) => {
    return (
      catalog &&
      typeof catalog.date === "string" &&
      Array.isArray(catalog.videos) &&
      Array.isArray(catalog.moments) &&
      catalog.moments.length > 0
    );
  });

  return {
    ok: validCatalogs.length >= requiredBackupCount,
    validCatalogs
  };
}
