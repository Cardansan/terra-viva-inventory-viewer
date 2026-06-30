import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  ensureTerraVivaFolderLayout,
  getFile,
  listFolderChildren
} from "./driveClient.mjs";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DEFAULT_ALLOWED_EDITOR_EMAILS = [
  "terravivapue@gmail.com",
  "carlos.d.san25@gmail.com"
];

function getAccessToken() {
  return process.env.GOOGLE_DRIVE_ACCESS_TOKEN || "";
}

async function drivePermissionsFetch(url, options = {}) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Falta GOOGLE_DRIVE_ACCESS_TOKEN para administrar permisos de Drive.");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Drive permissions API fallo (${response.status}): ${body}`);
  }

  return response;
}

async function listDrivePermissions(fileId) {
  const response = await drivePermissionsFetch(
    `${DRIVE_API_BASE}/files/${fileId}/permissions?fields=${encodeURIComponent(
      "permissions(id,type,role,emailAddress,domain,allowFileDiscovery)"
    )}`
  );
  const payload = await response.json();
  return payload.permissions || [];
}

async function createDrivePermission(fileId, permission) {
  await drivePermissionsFetch(
    `${DRIVE_API_BASE}/files/${fileId}/permissions?sendNotificationEmail=false`,
    {
      method: "POST",
      body: JSON.stringify(permission)
    }
  );
}

async function deleteDrivePermission(fileId, permissionId) {
  try {
    await drivePermissionsFetch(
      `${DRIVE_API_BASE}/files/${fileId}/permissions/${permissionId}`,
      {
        method: "DELETE",
        headers: {}
      }
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("cannotDeletePermission")
    ) {
      return false;
    }

    throw error;
  }

  return true;
}

function normalizeAllowedEditorEmails(config = {}) {
  const configured = Array.isArray(config.allowedDriveEditorEmails)
    ? config.allowedDriveEditorEmails
    : [];
  const source = configured.length > 0 ? configured : DEFAULT_ALLOWED_EDITOR_EMAILS;

  return source.map((email) => String(email).trim().toLowerCase()).filter(Boolean);
}

async function ensureEditorPermissions(fileId, allowedEditorEmails) {
  const permissions = await listDrivePermissions(fileId);
  const grantedEmails = new Map(
    permissions
      .filter((permission) => permission.type === "user" && permission.emailAddress)
      .map((permission) => [permission.emailAddress.toLowerCase(), permission.role])
  );

  for (const email of allowedEditorEmails) {
    if (grantedEmails.has(email)) {
      continue;
    }

    await createDrivePermission(fileId, {
      type: "user",
      role: "writer",
      emailAddress: email
    });
  }
}

async function removePublicPermissions(fileId) {
  const permissions = await listDrivePermissions(fileId);
  let removedCount = 0;

  for (const permission of permissions) {
    if (permission.type !== "anyone") {
      continue;
    }

    const removed = await deleteDrivePermission(fileId, permission.id);
    if (removed) {
      removedCount += 1;
    }
  }

  return removedCount;
}

async function ensurePublicReaderPermission(fileId) {
  const permissions = await listDrivePermissions(fileId);
  const hasPublicReader = permissions.some(
    (permission) => permission.type === "anyone" && permission.role === "reader"
  );

  if (hasPublicReader) {
    return;
  }

  await createDrivePermission(fileId, {
    type: "anyone",
    role: "reader",
    allowFileDiscovery: false
  });
}

async function collectPublishedDriveFileIds(projectRoot) {
  const publishedRoot = path.join(projectRoot, "public", "catalog");
  const entries = await readdir(publishedRoot, { withFileTypes: true });
  const ids = new Set();

  for (const entry of entries) {
    if (!entry.isDirectory() || !/^\d{4}-\d{2}-\d{2}$/.test(entry.name)) {
      continue;
    }

    const catalogPath = path.join(publishedRoot, entry.name, "catalog.json");

    try {
      const catalog = JSON.parse(
        (await readFile(catalogPath, "utf8")).replace(/^\uFEFF/, "")
      );

      for (const video of catalog.videos || []) {
        if (video.driveFileId) {
          ids.add(video.driveFileId);
        }
      }
    } catch {
      // Si un catalogo historico esta roto o incompleto, no detenemos el sync.
    }
  }

  return ids;
}

async function collectProcessedDateFolders(processedRootId) {
  const processedChildren = await listFolderChildren(processedRootId);
  return processedChildren.filter(
    (child) =>
      child.mimeType === "application/vnd.google-apps.folder" &&
      /^\d{4}-\d{2}-\d{2}$/.test(child.name)
  );
}

async function reconcileFolderTree({
  folderId,
  allowedEditorEmails,
  publicVideoIds,
  stats
}) {
  await ensureEditorPermissions(folderId, allowedEditorEmails);
  await removePublicPermissions(folderId);
  stats.restricted.push(folderId);

  const children = await listFolderChildren(folderId);

  for (const child of children) {
    if (child.mimeType === "application/vnd.google-apps.folder") {
      await reconcileFolderTree({
        folderId: child.id,
        allowedEditorEmails,
        publicVideoIds,
        stats
      });
      continue;
    }

    if (child.mimeType?.startsWith("video/") && publicVideoIds.has(child.id)) {
      await ensurePublicReaderPermission(child.id);
      stats.publicVideos.push(child.id);
      continue;
    }

    await removePublicPermissions(child.id);
    stats.restricted.push(child.id);
  }
}

export async function syncTerraVivaDrivePermissions({
  projectRoot,
  config
}) {
  const allowedEditorEmails = normalizeAllowedEditorEmails(config);
  const layout = await ensureTerraVivaFolderLayout({
    inboxFolderId: config.driveFolderId,
    rootFolderId: config.driveRootFolderId
  });
  const publicVideoIds = await collectPublishedDriveFileIds(projectRoot);
  const stats = {
    publicVideos: [],
    restricted: []
  };

  await ensureEditorPermissions(layout.rootFolderId, allowedEditorEmails);
  await removePublicPermissions(layout.rootFolderId);
  stats.restricted.push(layout.rootFolderId);

  for (const folderId of [
    layout.inboxFolder.id,
    layout.ordersFolder.id,
    layout.statusFolder.id
  ]) {
    await reconcileFolderTree({
      folderId,
      allowedEditorEmails,
      publicVideoIds,
      stats
    });
  }

  await ensureEditorPermissions(layout.processedRootFolder.id, allowedEditorEmails);
  await removePublicPermissions(layout.processedRootFolder.id);
  stats.restricted.push(layout.processedRootFolder.id);

  const processedDateFolders = await collectProcessedDateFolders(
    layout.processedRootFolder.id
  );

  for (const folder of processedDateFolders) {
    await reconcileFolderTree({
      folderId: folder.id,
      allowedEditorEmails,
      publicVideoIds,
      stats
    });
  }

  const publishedMissing = [];

  for (const fileId of publicVideoIds) {
    try {
      await getFile(fileId);
      await ensurePublicReaderPermission(fileId);
    } catch {
      publishedMissing.push(fileId);
    }
  }

  return {
    rootFolderId: layout.rootFolderId,
    inboxFolderId: layout.inboxFolder.id,
    allowedEditorEmails,
    publicVideoIds: [...publicVideoIds],
    publicVideosUpdated: stats.publicVideos.length,
    restrictedItemsUpdated: stats.restricted.length,
    publishedMissing
  };
}
