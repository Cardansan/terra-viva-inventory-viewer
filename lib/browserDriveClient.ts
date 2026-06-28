"use client";

import type {
  DrivePublisherMailbox,
  DrivePublisherOrder,
  DrivePublisherStatus
} from "./drivePublisherTypes";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

type DriveFile = {
  id: string;
  name: string;
  parents?: string[];
  description?: string;
  capabilities?: {
    canAddChildren?: boolean;
    canEdit?: boolean;
  };
  size?: string;
  webViewLink?: string;
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
    schema: "terra-viva-web-publisher/v1",
    order: null,
    status: null
  };
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
  fields = "id,name,parents,description"
): Promise<DriveFile> {
  const response = await driveFetch(
    accessToken,
    `${DRIVE_API_BASE}/files/${fileId}?fields=${encodeURIComponent(
      fields
    )}`
  );
  return (await response.json()) as DriveFile;
}

async function updateDriveFileDescription(
  accessToken: string,
  fileId: string,
  description: string
) {
  await driveFetch(accessToken, `${DRIVE_API_BASE}/files/${fileId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ description })
  });
}

async function readMailbox(
  accessToken: string,
  inboxFolderId: string
): Promise<{ fileId: string; mailbox: DrivePublisherMailbox }> {
  const file = await getDriveFile(accessToken, inboxFolderId);

  if (!file.description) {
    return { fileId: file.id, mailbox: getEmptyMailbox() };
  }

  try {
    const parsed = JSON.parse(file.description) as Partial<DrivePublisherMailbox>;

    if (parsed.schema !== "terra-viva-web-publisher/v1") {
      return { fileId: file.id, mailbox: getEmptyMailbox() };
    }

    return {
      fileId: file.id,
      mailbox: {
        schema: "terra-viva-web-publisher/v1",
        order: parsed.order ?? null,
        status: parsed.status ?? null
      }
    };
  } catch {
    return { fileId: file.id, mailbox: getEmptyMailbox() };
  }
}

export async function createDrivePublisherOrder(
  accessToken: string,
  order: DrivePublisherOrder,
  inboxFolderId?: string
) {
  if (!inboxFolderId) {
    throw new Error("Inbox folder ID is required for the website publisher.");
  }

  const { fileId, mailbox } = await readMailbox(accessToken, inboxFolderId);
  const nextMailbox: DrivePublisherMailbox = {
    ...mailbox,
    order,
    status: {
      orderId: order.id,
      action: order.action,
      state: "queued",
      createdAt: order.createdAt,
      updatedAt: new Date().toISOString(),
      message:
        order.action === "process_draft"
          ? "La preparacion del borrador ya quedo en fila."
          : order.action === "cancel_draft"
            ? "La cancelacion del borrador ya quedo en fila."
            : "La publicacion del catalogo ya quedo en fila."
    }
  };

  await updateDriveFileDescription(
    accessToken,
    fileId,
    JSON.stringify(nextMailbox, null, 2)
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

  const { mailbox } = await readMailbox(accessToken, inboxFolderId);
  return mailbox.status ? [mailbox.status].slice(0, limit) : [];
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
