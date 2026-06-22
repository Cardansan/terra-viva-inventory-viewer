"use client";

import type {
  DrivePublisherMailbox,
  DrivePublisherOrder,
  DrivePublisherStatus
} from "./drivePublisherTypes";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

type DriveFile = {
  id: string;
  name: string;
  parents?: string[];
  description?: string;
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
        "Drive session expired. Paste a fresh temporary Drive token in admin."
      );
    }

    throw new Error(`Drive API failed (${response.status}): ${body}`);
  }

  return response;
}

async function getDriveFile(
  accessToken: string,
  fileId: string
): Promise<DriveFile> {
  const response = await driveFetch(
    accessToken,
    `${DRIVE_API_BASE}/files/${fileId}?fields=${encodeURIComponent(
      "id,name,parents,description"
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
          ? "La orden de proceso ya quedo guardada y espera a la laptop."
          : "La orden de publicacion ya quedo guardada y espera a la laptop."
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
