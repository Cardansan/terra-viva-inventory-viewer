"use client";

import type {
  DrivePublisherMailbox,
  DrivePublisherOrder,
  DrivePublisherStatus,
  LegacyDrivePublisherStatus,
  PublisherOrderAction
} from "./drivePublisherTypes";
import {
  DRIVE_PUBLISHER_MAILBOX_SCHEMA,
  DRIVE_PUBLISHER_ORDER_SCHEMA,
  DRIVE_PUBLISHER_STATUS_SCHEMA
} from "./drivePublisherTypes";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
const INBOX_FOLDER_NAME = "Inbox - Videos por publicar";
const WEB_ORDERS_FOLDER_NAME = "Ordenes - Publicador Web";
const WEB_STATUS_FOLDER_NAME = "Estado - Publicador Web";

type DriveFile = {
  id: string;
  name: string;
  mimeType?: string;
  parents?: string[];
  description?: string;
  createdTime?: string;
  modifiedTime?: string;
  capabilities?: {
    canAddChildren?: boolean;
    canEdit?: boolean;
  };
  size?: string;
  webViewLink?: string;
};

type WebPublisherFolders = {
  ordersFolderId: string;
  statusFolderId: string;
};

export type DriveSessionProbe = {
  folderId: string;
  folderName: string;
  canAddChildren: boolean;
  canEdit: boolean;
};

export type DriveUploadResult = {
  id: string;
  name: string;
  sizeBytes: number;
  webViewLink?: string;
};

function getEmptyMailbox(): DrivePublisherMailbox {
  return {
    schema: DRIVE_PUBLISHER_MAILBOX_SCHEMA,
    order: null,
    status: null
  };
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function sortStatusesByUpdatedAt(statuses: DrivePublisherStatus[]) {
  return [...statuses].sort((left, right) => {
    const rightTime = Date.parse(right.updatedAt || right.createdAt || "");
    const leftTime = Date.parse(left.updatedAt || left.createdAt || "");
    return (Number.isFinite(rightTime) ? rightTime : 0) -
      (Number.isFinite(leftTime) ? leftTime : 0);
  });
}

function getStatusMessage(action: PublisherOrderAction, state: "queued" | "running") {
  if (state === "queued") {
    if (action === "process_draft") {
      return "La preparacion del borrador ya quedo en fila.";
    }

    if (action === "cancel_draft") {
      return "La cancelacion del borrador ya quedo en fila.";
    }

    return "La publicacion del catalogo ya quedo en fila.";
  }

  if (action === "process_draft") {
    return "Ya se esta preparando el borrador.";
  }

  if (action === "cancel_draft") {
    return "Ya se esta cancelando el borrador actual.";
  }

  return "Ya se esta publicando el catalogo.";
}

function createQueuedStatus(order: DrivePublisherOrder): DrivePublisherStatus {
  return {
    schema: DRIVE_PUBLISHER_STATUS_SCHEMA,
    orderId: order.orderId,
    action: order.action,
    state: "queued",
    createdAt: order.createdAt,
    updatedAt: new Date().toISOString(),
    message: getStatusMessage(order.action, "queued"),
    result: order.approvalCatalogSignature
      ? {
          approvalCatalogSignature: order.approvalCatalogSignature
        }
      : undefined
  };
}

function normalizeLegacyStatus(
  status: LegacyDrivePublisherStatus | null | undefined
): DrivePublisherStatus | null {
  if (!status || typeof status !== "object") {
    return null;
  }

  if (
    typeof status.orderId !== "string" ||
    typeof status.action !== "string" ||
    typeof status.state !== "string" ||
    typeof status.createdAt !== "string" ||
    typeof status.updatedAt !== "string" ||
    typeof status.message !== "string"
  ) {
    return null;
  }

  return {
    schema: DRIVE_PUBLISHER_STATUS_SCHEMA,
    orderId: status.orderId,
    action: status.action,
    state: status.state,
    createdAt: status.createdAt,
    updatedAt: status.updatedAt,
    message: status.message,
    result: status.result
  };
}

function normalizeStatus(payload: unknown): DrivePublisherStatus | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Partial<DrivePublisherStatus>;

  if (candidate.schema === DRIVE_PUBLISHER_STATUS_SCHEMA) {
    return normalizeLegacyStatus(candidate);
  }

  return normalizeLegacyStatus(candidate as LegacyDrivePublisherStatus);
}

async function driveFetch(
  accessToken: string,
  url: string,
  options: RequestInit = {}
) {
  const headers = new Headers(options.headers || {});

  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const body = await response.text();

    if (response.status === 401) {
      throw new Error(
        "Drive session expired. Check the local Drive notices in Developer Tools Carlos."
      );
    }

    throw new Error(`Drive API failed (${response.status}): ${body}`);
  }

  return response;
}

async function getDriveFile(
  accessToken: string,
  fileId: string,
  fields = "id,name,mimeType,parents,description,createdTime,modifiedTime"
): Promise<DriveFile> {
  const response = await driveFetch(
    accessToken,
    `${DRIVE_API_BASE}/files/${fileId}?fields=${encodeURIComponent(fields)}`
  );
  return (await response.json()) as DriveFile;
}

async function listDriveFiles(
  accessToken: string,
  params: {
    query: string;
    fields: string;
    orderBy?: string;
    pageSize?: number;
  }
): Promise<DriveFile[]> {
  const searchParams = new URLSearchParams({
    q: params.query,
    fields: `files(${params.fields})`
  });

  if (params.orderBy) {
    searchParams.set("orderBy", params.orderBy);
  }

  if (params.pageSize) {
    searchParams.set("pageSize", String(params.pageSize));
  }

  const response = await driveFetch(
    accessToken,
    `${DRIVE_API_BASE}/files?${searchParams.toString()}`
  );
  const payload = (await response.json()) as { files?: DriveFile[] };
  return payload.files || [];
}

async function createDriveFolder(
  accessToken: string,
  parentId: string,
  name: string
): Promise<DriveFile> {
  const response = await driveFetch(accessToken, `${DRIVE_API_BASE}/files`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId]
    })
  });
  return (await response.json()) as DriveFile;
}

async function findChildFolder(
  accessToken: string,
  parentId: string,
  name: string
): Promise<DriveFile | null> {
  const files = await listDriveFiles(accessToken, {
    query: `'${parentId}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder' and name = '${escapeDriveQueryValue(
      name
    )}'`,
    fields: "id,name,mimeType,parents,createdTime,modifiedTime",
    pageSize: 1
  });

  return files[0] || null;
}

async function ensureChildFolder(
  accessToken: string,
  parentId: string,
  name: string
): Promise<DriveFile> {
  return (
    (await findChildFolder(accessToken, parentId, name)) ||
    createDriveFolder(accessToken, parentId, name)
  );
}

async function uploadJsonFile(
  accessToken: string,
  parentId: string,
  name: string,
  payload: unknown
): Promise<DriveFile> {
  const boundary = `terra-viva-${crypto.randomUUID()}`;
  const metadata = {
    name,
    parents: [parentId],
    mimeType: "application/json"
  };
  const response = await driveFetch(
    accessToken,
    `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=${encodeURIComponent(
      "id,name,mimeType,parents,createdTime,modifiedTime"
    )}`,
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: new Blob([
        `--${boundary}\r\n`,
        "Content-Type: application/json; charset=UTF-8\r\n\r\n",
        JSON.stringify(metadata),
        "\r\n",
        `--${boundary}\r\n`,
        "Content-Type: application/json; charset=UTF-8\r\n\r\n",
        JSON.stringify(payload, null, 2),
        "\r\n",
        `--${boundary}--`
      ])
    }
  );

  return (await response.json()) as DriveFile;
}

async function readJsonFile<T>(
  accessToken: string,
  fileId: string
): Promise<T | null> {
  const response = await driveFetch(accessToken, `${DRIVE_API_BASE}/files/${fileId}?alt=media`);
  return (await response.json()) as T;
}

async function readLegacyMailbox(
  accessToken: string,
  inboxFolderId: string
): Promise<DrivePublisherMailbox> {
  const file = await getDriveFile(accessToken, inboxFolderId, "id,description");

  if (!file.description) {
    return getEmptyMailbox();
  }

  try {
    const parsed = JSON.parse(file.description) as Partial<DrivePublisherMailbox>;

    if (parsed.schema !== DRIVE_PUBLISHER_MAILBOX_SCHEMA) {
      return getEmptyMailbox();
    }

    return {
      schema: DRIVE_PUBLISHER_MAILBOX_SCHEMA,
      order: parsed.order ?? null,
      status: normalizeLegacyStatus(parsed.status) ?? null
    };
  } catch {
    return getEmptyMailbox();
  }
}

async function ensureWebPublisherFolders(
  accessToken: string,
  inboxFolderId: string
): Promise<WebPublisherFolders> {
  const inboxOrRoot = await getDriveFile(accessToken, inboxFolderId, "id,name,parents");
  const rootFolderId =
    inboxOrRoot.name === INBOX_FOLDER_NAME && inboxOrRoot.parents?.[0]
      ? inboxOrRoot.parents[0]
      : inboxOrRoot.id;
  const ordersFolder = await ensureChildFolder(
    accessToken,
    rootFolderId,
    WEB_ORDERS_FOLDER_NAME
  );
  const statusFolder = await ensureChildFolder(
    accessToken,
    rootFolderId,
    WEB_STATUS_FOLDER_NAME
  );

  return {
    ordersFolderId: ordersFolder.id,
    statusFolderId: statusFolder.id
  };
}

function getOrderFileName(order: DrivePublisherOrder): string {
  return `order-${order.createdAt.replace(/[:.]/g, "-")}-${order.orderId}.json`;
}

function getStatusFileName(orderId: string): string {
  return `status-${orderId}.json`;
}

export async function createDrivePublisherOrder(
  accessToken: string,
  order: DrivePublisherOrder,
  inboxFolderId?: string
) {
  if (!inboxFolderId) {
    throw new Error("Inbox folder ID is required for the website publisher.");
  }

  const normalizedOrder: DrivePublisherOrder = {
    ...order,
    schema: DRIVE_PUBLISHER_ORDER_SCHEMA
  };
  const folders = await ensureWebPublisherFolders(accessToken, inboxFolderId);

  await uploadJsonFile(
    accessToken,
    folders.ordersFolderId,
    getOrderFileName(normalizedOrder),
    normalizedOrder
  );
  await uploadJsonFile(
    accessToken,
    folders.statusFolderId,
    getStatusFileName(normalizedOrder.orderId),
    createQueuedStatus(normalizedOrder)
  );
}

export async function getLatestDrivePublisherStatuses(
  accessToken: string,
  inboxFolderId?: string,
  limit = 10
): Promise<DrivePublisherStatus[]> {
  if (!inboxFolderId) {
    return [];
  }

  const folders = await ensureWebPublisherFolders(accessToken, inboxFolderId);
  const statusFiles = await listDriveFiles(accessToken, {
    query: `'${folders.statusFolderId}' in parents and trashed = false and mimeType = 'application/json'`,
    fields: "id,name,mimeType,createdTime,modifiedTime",
    orderBy: "modifiedTime desc",
    pageSize: Math.max(limit * 3, 12)
  });

  const statusPayloads = await Promise.all(
    statusFiles.map(async (file) => normalizeStatus(await readJsonFile(accessToken, file.id)))
  );
  const statuses = sortStatusesByUpdatedAt(
    statusPayloads.filter((status): status is DrivePublisherStatus => Boolean(status))
  ).slice(0, limit);

  if (statuses.length > 0) {
    return statuses;
  }

  const legacyMailbox = await readLegacyMailbox(accessToken, inboxFolderId);
  return legacyMailbox.status ? [legacyMailbox.status].slice(0, limit) : [];
}

export async function probeDrivePublisherSession(
  accessToken: string,
  inboxFolderId: string
): Promise<DriveSessionProbe> {
  if (!accessToken.trim()) {
    throw new Error("Pega primero un token temporal de Drive.");
  }

  if (!inboxFolderId.trim()) {
    throw new Error("Falta el ID de la carpeta Inbox de Drive.");
  }

  const file = await getDriveFile(
    accessToken,
    inboxFolderId,
    "id,name,capabilities(canAddChildren,canEdit)"
  );

  return {
    folderId: file.id,
    folderName: file.name || "Inbox",
    canAddChildren: Boolean(file.capabilities?.canAddChildren),
    canEdit: Boolean(file.capabilities?.canEdit)
  };
}

export async function uploadVideoToDriveInbox(
  accessToken: string,
  inboxFolderId: string,
  file: File
): Promise<DriveUploadResult> {
  if (!accessToken.trim()) {
    throw new Error("Pega primero un token temporal de Drive.");
  }

  if (!inboxFolderId.trim()) {
    throw new Error("Falta el ID de la carpeta Inbox de Drive.");
  }

  const boundary = `terra-viva-${crypto.randomUUID()}`;
  const metadata = {
    name: file.name,
    parents: [inboxFolderId]
  };
  const response = await driveFetch(
    accessToken,
    `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=${encodeURIComponent(
      "id,name,size,webViewLink"
    )}`,
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: new Blob([
        `--${boundary}\r\n`,
        "Content-Type: application/json; charset=UTF-8\r\n\r\n",
        JSON.stringify(metadata),
        "\r\n",
        `--${boundary}\r\n`,
        `Content-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
        file,
        "\r\n",
        `--${boundary}--`
      ])
    }
  );
  const payload = (await response.json()) as DriveFile;

  return {
    id: payload.id,
    name: payload.name,
    sizeBytes: Number(payload.size || file.size || 0),
    webViewLink: payload.webViewLink
  };
}

export function isDriveTokenExpiredError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message ===
      "Drive session expired. Check the local Drive notices in Developer Tools Carlos."
  );
}
