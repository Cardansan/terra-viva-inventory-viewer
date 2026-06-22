import { writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
const PROCESSED_ROOT_NAME = "Procesados";

function getAccessToken() {
  return process.env.GOOGLE_DRIVE_ACCESS_TOKEN || "";
}

async function driveFetch(url, options = {}) {
  const token = getAccessToken();

  if (!token) {
    throw new Error(
      "Falta GOOGLE_DRIVE_ACCESS_TOKEN. Ejecuta con --use-placeholder-media para probar sin Drive real."
    );
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Drive API fallo (${response.status}): ${body}`);
  }

  return response;
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

export async function ensureProcessedFolder(date, inboxFolderId) {
  const inbox = await getFile(inboxFolderId);
  const terraVivaRootId = inbox.parents?.[0];

  if (!terraVivaRootId) {
    throw new Error("No se pudo encontrar la carpeta padre del Inbox en Drive.");
  }

  const processedRoot = await ensureChildFolder(terraVivaRootId, PROCESSED_ROOT_NAME);
  return ensureChildFolder(processedRoot.id, date);
}

export async function ensureWebPublisherFolders(inboxFolderId) {
  const inbox = await getFile(inboxFolderId);
  const terraVivaRootId = inbox.parents?.[0];

  if (!terraVivaRootId) {
    throw new Error("No se pudo encontrar la carpeta padre del Inbox en Drive.");
  }

  const ordersFolder = await ensureChildFolder(
    terraVivaRootId,
    "Ordenes - Publicador Web"
  );
  const statusFolder = await ensureChildFolder(
    terraVivaRootId,
    "Estado - Publicador Web"
  );

  return { ordersFolder, statusFolder };
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

export async function listJsonFilesInFolder(folderId) {
  const query = `'${folderId}' in parents and trashed = false and mimeType = 'application/json'`;
  const response = await driveFetch(
    `${DRIVE_API_BASE}/files?q=${driveQuery(query)}&fields=${encodeURIComponent(
      "files(id,name,mimeType,createdTime,modifiedTime)"
    )}&orderBy=createdTime desc`
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
