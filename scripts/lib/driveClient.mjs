import { writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { ensureGoogleDriveAccessToken } from "./driveAuth.mjs";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
export const TERRA_VIVA_ROOT_FOLDER_NAME = "Terra Viva Catalogue";
export const INBOX_FOLDER_NAME = "Inbox - Videos por publicar";
const PROCESSED_ROOT_NAME = "Procesados";
const WEB_ORDERS_FOLDER_NAME = "Ordenes - Publicador Web";
const WEB_STATUS_FOLDER_NAME = "Estado - Publicador Web";
const WEB_ORDERS_PROCESSED_FOLDER_NAME = "processed";

function getAccessToken() {
  return process.env.GOOGLE_DRIVE_ACCESS_TOKEN || "";
}

async function createDriveResponse(url, options = {}, forceRefresh = false) {
  const token = await ensureGoogleDriveAccessToken(forceRefresh);

  if (!token) {
    throw new Error(
      "Falta GOOGLE_DRIVE_ACCESS_TOKEN. Ejecuta con --use-placeholder-media para probar sin Drive real."
    );
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    }
  });

  return response;
}

async function driveFetch(url, options = {}) {
  const response = await createDriveResponse(url, options);

  if (response.status !== 401) {
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Drive API fallo (${response.status}): ${body}`);
    }

    return response;
  }

  const retryResponse = await createDriveResponse(url, options, true);

  if (!retryResponse.ok) {
    const body = await retryResponse.text();
    throw new Error(`Drive API fallo (${retryResponse.status}): ${body}`);
  }

  return retryResponse;
}

function driveQuery(value) {
  return encodeURIComponent(value);
}

export async function listInboxVideos(folderId) {
  const query = `'${folderId}' in parents and trashed = false and mimeType contains 'video/'`;
  const fields =
    "files(id,name,mimeType,createdTime,modifiedTime,webViewLink,webContentLink,parents,size)";
  const url = `${DRIVE_API_BASE}/files?q=${driveQuery(query)}&fields=${encodeURIComponent(fields)}&orderBy=createdTime`;
  const response = await driveFetch(url);
  const data = await response.json();
  return data.files || [];
}

export async function downloadDriveFile(fileId, destination) {
  await mkdir(path.dirname(destination), { recursive: true });
  const response = await driveFetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`
    }
  });
  const arrayBuffer = await response.arrayBuffer();
  await writeFile(destination, Buffer.from(arrayBuffer));

  return destination;
}

export async function getFile(fileId) {
  const response = await driveFetch(
    `${DRIVE_API_BASE}/files/${fileId}?fields=${encodeURIComponent(
      "id,name,parents,description"
    )}`
  );
  return response.json();
}

export async function listFolderChildren(folderId) {
  const query = `'${folderId}' in parents and trashed = false`;
  const fields =
    "files(id,name,mimeType,createdTime,modifiedTime,webViewLink,webContentLink,parents,size)";
  const url = `${DRIVE_API_BASE}/files?q=${driveQuery(query)}&fields=${encodeURIComponent(fields)}&orderBy=folder,name`;
  const response = await driveFetch(url);
  const data = await response.json();
  return data.files || [];
}

export async function listFoldersByQuery(query) {
  const fields =
    "files(id,name,mimeType,createdTime,modifiedTime,webViewLink,webContentLink,parents,size)";
  const url = `${DRIVE_API_BASE}/files?q=${driveQuery(query)}&fields=${encodeURIComponent(fields)}&orderBy=folder,name`;
  const response = await driveFetch(url);
  const data = await response.json();
  return data.files || [];
}

export async function updateDriveFileMetadata(fileId, payload) {
  const response = await driveFetch(`${DRIVE_API_BASE}/files/${fileId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  return response.json();
}

async function findChildFolder(parentId, name) {
  const query = `'${parentId}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder' and name = '${name}'`;
  const response = await driveFetch(
    `${DRIVE_API_BASE}/files?q=${driveQuery(query)}&fields=${encodeURIComponent("files(id,name,createdTime)")}`
  );
  const data = await response.json();
  return data.files?.[0];
}

async function createFolder(parentId, name) {
  const response = await driveFetch(`${DRIVE_API_BASE}/files`, {
    method: "POST",
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId]
    })
  });
  return response.json();
}

async function ensureChildFolder(parentId, name) {
  return (await findChildFolder(parentId, name)) || createFolder(parentId, name);
}

export async function uploadJsonFile(parentId, name, payload) {
  const boundary = `terra-viva-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({
    name,
    parents: [parentId],
    mimeType: "application/json"
  });
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    metadata,
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(payload, null, 2),
    `--${boundary}--`
  ].join("\r\n");

  const response = await driveFetch(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=${encodeURIComponent(
      "id,name,createdTime,modifiedTime"
    )}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body
    }
  );

  return response.json();
}

export async function updateJsonFile(fileId, payload) {
  const response = await driveFetch(
    `${DRIVE_UPLOAD_BASE}/files/${fileId}?uploadType=media&fields=${encodeURIComponent(
      "id,name,createdTime,modifiedTime"
    )}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
        "Content-Type": "application/json; charset=UTF-8"
      },
      body: JSON.stringify(payload, null, 2)
    }
  );

  return response.json();
}

export async function ensureProcessedFolder(
  date,
  inboxFolderId,
  configuredRootFolderId = ""
) {
  const terraVivaRootId = await resolveTerraVivaRootFolderId(
    inboxFolderId,
    configuredRootFolderId
  );
  const processedRoot = await ensureChildFolder(terraVivaRootId, PROCESSED_ROOT_NAME);
  return ensureChildFolder(processedRoot.id, date);
}

export async function ensureWebPublisherFolders(inboxFolderId) {
  const terraVivaRootId = await resolveTerraVivaRootFolderId(inboxFolderId);
  const ordersFolder = await ensureChildFolder(terraVivaRootId, WEB_ORDERS_FOLDER_NAME);
  const statusFolder = await ensureChildFolder(terraVivaRootId, WEB_STATUS_FOLDER_NAME);
  const processedOrdersFolder = await ensureChildFolder(
    ordersFolder.id,
    WEB_ORDERS_PROCESSED_FOLDER_NAME
  );

  return { ordersFolder, statusFolder, processedOrdersFolder };
}

export async function resolveTerraVivaRootFolderId(inboxFolderId, configuredRootFolderId = "") {
  if (configuredRootFolderId) {
    return configuredRootFolderId;
  }

  const inboxOrRoot = await getFile(inboxFolderId);

  if (!inboxOrRoot.parents?.[0]) {
    return inboxOrRoot.id;
  }

  if (inboxOrRoot.name === INBOX_FOLDER_NAME) {
    return inboxOrRoot.parents[0];
  }

  return inboxOrRoot.id;
}

export async function ensureTerraVivaFolderLayout({
  inboxFolderId,
  rootFolderId = ""
}) {
  const terraVivaRootId = await resolveTerraVivaRootFolderId(inboxFolderId, rootFolderId);
  const inboxFolder = await ensureChildFolder(terraVivaRootId, INBOX_FOLDER_NAME);
  const processedRootFolder = await ensureChildFolder(
    terraVivaRootId,
    PROCESSED_ROOT_NAME
  );
  const ordersFolder = await ensureChildFolder(
    terraVivaRootId,
    WEB_ORDERS_FOLDER_NAME
  );
  const processedOrdersFolder = await ensureChildFolder(
    ordersFolder.id,
    WEB_ORDERS_PROCESSED_FOLDER_NAME
  );
  const statusFolder = await ensureChildFolder(
    terraVivaRootId,
    WEB_STATUS_FOLDER_NAME
  );

  return {
    rootFolderId: terraVivaRootId,
    inboxFolder,
    processedRootFolder,
    ordersFolder,
    processedOrdersFolder,
    statusFolder
  };
}

export async function moveFileToProcessed(fileId, processedFolderId, inboxFolderId) {
  const params = new URLSearchParams({
    addParents: processedFolderId,
    removeParents: inboxFolderId,
    fields: "id,name,parents"
  });
  const response = await driveFetch(`${DRIVE_API_BASE}/files/${fileId}?${params}`, {
    method: "PATCH",
    body: JSON.stringify({})
  });
  return response.json();
}

export async function moveDriveItemToFolder(itemId, destinationFolderId, currentParentId) {
  const params = new URLSearchParams({
    addParents: destinationFolderId,
    fields: "id,name,parents"
  });

  if (currentParentId) {
    params.set("removeParents", currentParentId);
  }

  const response = await driveFetch(`${DRIVE_API_BASE}/files/${itemId}?${params}`, {
    method: "PATCH",
    body: JSON.stringify({})
  });
  return response.json();
}

export async function trashDriveFile(fileId) {
  const response = await driveFetch(`${DRIVE_API_BASE}/files/${fileId}`, {
    method: "PATCH",
    body: JSON.stringify({ trashed: true })
  });
  return response.json();
}

export async function listProcessedCatalogFolders(processedRootFolderId) {
  const query = `'${processedRootFolderId}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`;
  const response = await driveFetch(
    `${DRIVE_API_BASE}/files?q=${driveQuery(query)}&fields=${encodeURIComponent("files(id,name,createdTime,modifiedTime)")}`
  );
  const data = await response.json();
  return data.files || [];
}

export async function listFilesInProcessedFolder(folderId) {
  const query = `'${folderId}' in parents and trashed = false`;
  const response = await driveFetch(
    `${DRIVE_API_BASE}/files?q=${driveQuery(query)}&fields=${encodeURIComponent("files(id,name,mimeType,createdTime,modifiedTime)")}`
  );
  const data = await response.json();
  return data.files || [];
}

export async function listJsonFilesInFolder(
  folderId,
  { orderBy = "createdTime desc", pageSize } = {}
) {
  const query = `'${folderId}' in parents and trashed = false and mimeType = 'application/json'`;
  const params = new URLSearchParams({
    q: query,
    fields: "files(id,name,mimeType,createdTime,modifiedTime,parents)"
  });

  if (orderBy) {
    params.set("orderBy", orderBy);
  }

  if (pageSize) {
    params.set("pageSize", String(pageSize));
  }

  const response = await driveFetch(
    `${DRIVE_API_BASE}/files?${params.toString()}`
  );
  const data = await response.json();
  return data.files || [];
}

export async function readJsonFile(fileId) {
  const response = await driveFetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`
    }
  });
  return response.json();
}

export const DRIVE_UPLOAD_ENDPOINT = DRIVE_UPLOAD_BASE;
