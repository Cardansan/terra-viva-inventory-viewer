import { createWriteStream } from "node:fs";
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
  return encodeURIComponent(value.replace(/'/g, "\\'"));
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

  await new Promise((resolve, reject) => {
    const stream = createWriteStream(destination);
    response.body.pipeTo(
      new WritableStream({
        write(chunk) {
          stream.write(Buffer.from(chunk));
        },
        close() {
          stream.end(resolve);
        },
        abort(error) {
          stream.destroy(error);
          reject(error);
        }
      })
    ).catch(reject);
  });

  return destination;
}

async function getFile(fileId) {
  const response = await driveFetch(
    `${DRIVE_API_BASE}/files/${fileId}?fields=${encodeURIComponent("id,name,parents")}`
  );
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

export async function ensureProcessedFolder(date, inboxFolderId) {
  const inbox = await getFile(inboxFolderId);
  const terraVivaRootId = inbox.parents?.[0];

  if (!terraVivaRootId) {
    throw new Error("No se pudo encontrar la carpeta padre del Inbox en Drive.");
  }

  const processedRoot = await ensureChildFolder(terraVivaRootId, PROCESSED_ROOT_NAME);
  return ensureChildFolder(processedRoot.id, date);
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

export const DRIVE_UPLOAD_ENDPOINT = DRIVE_UPLOAD_BASE;
