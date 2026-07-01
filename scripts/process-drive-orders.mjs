#!/usr/bin/env node
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { isDriveRefreshTokenRevokedError } from "./lib/driveAuth.mjs";
import {
  ensureTerraVivaFolderLayout,
  getFile,
  listFoldersByQuery,
  listJsonFilesInFolder,
  moveDriveItemToFolder,
  readJsonFile,
  updateDriveFileMetadata,
  updateJsonFile,
  uploadJsonFile
} from "./lib/driveClient.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const localConfigPath = path.join(projectRoot, "terra-viva.publisher.local.json");
const ORDER_SCHEMA = "terra-viva-web-publisher-order/v1";
const STATUS_SCHEMA = "terra-viva-web-publisher-status/v1";
const MAILBOX_SCHEMA = "terra-viva-web-publisher/v1";

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    const value = next && !next.startsWith("--") ? next : "true";
    args[key] = value;

    if (value === next) {
      index += 1;
    }
  }

  return args;
}

function toBoolean(value, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }

  return ["1", "true", "yes", "si"].includes(String(value).toLowerCase());
}

function getEmptyMailbox() {
  return {
    schema: MAILBOX_SCHEMA,
    order: null,
    status: null
  };
}

function parseMailbox(description) {
  if (!description) {
    return getEmptyMailbox();
  }

  try {
    const parsed = JSON.parse(description);

    if (parsed.schema !== MAILBOX_SCHEMA) {
      return getEmptyMailbox();
    }

    return {
      schema: MAILBOX_SCHEMA,
      order: parsed.order ?? null,
      status: parsed.status ?? null
    };
  } catch {
    return getEmptyMailbox();
  }
}

function normalizeOrder(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const orderId =
    typeof payload.orderId === "string"
      ? payload.orderId
      : typeof payload.id === "string"
        ? payload.id
        : "";

  if (
    !orderId ||
    typeof payload.action !== "string" ||
    typeof payload.createdAt !== "string" ||
    typeof payload.createdBy !== "string"
  ) {
    return null;
  }

  return {
    schema: ORDER_SCHEMA,
    orderId,
    action: payload.action,
    createdAt: payload.createdAt,
    createdBy: payload.createdBy,
    catalogDate:
      typeof payload.catalogDate === "string" ? payload.catalogDate : undefined,
    approvalCatalog: payload.approvalCatalog || undefined,
    approvalCatalogSignature:
      typeof payload.approvalCatalogSignature === "string"
        ? payload.approvalCatalogSignature
        : undefined,
    sourceSessionId:
      typeof payload.sourceSessionId === "string"
        ? payload.sourceSessionId
        : undefined
  };
}

function normalizeStatus(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (
    typeof payload.orderId !== "string" ||
    typeof payload.action !== "string" ||
    typeof payload.state !== "string" ||
    typeof payload.createdAt !== "string" ||
    typeof payload.updatedAt !== "string" ||
    typeof payload.message !== "string"
  ) {
    return null;
  }

  return {
    schema: STATUS_SCHEMA,
    orderId: payload.orderId,
    action: payload.action,
    state: payload.state,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
    message: payload.message,
    result: payload.result || undefined
  };
}

async function readLocalConfig() {
  try {
    return JSON.parse(await readFile(localConfigPath, "utf8"));
  } catch {
    return {};
  }
}

async function runPublisher(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: projectRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr || stdout || `Publisher exited with ${code}`));
    });
  });
}

function buildStatusPayload(order, state, message, result = undefined) {
  const now = new Date().toISOString();
  return {
    schema: STATUS_SCHEMA,
    orderId: order.orderId,
    action: order.action,
    state,
    createdAt: order.createdAt,
    updatedAt: now,
    message,
    result: order.approvalCatalogSignature
      ? {
          ...(result || {}),
          approvalCatalogSignature: order.approvalCatalogSignature
        }
      : result
  };
}

function getStatusFileName(orderId) {
  return `status-${orderId}.json`;
}

function getStatusMessage(action, state) {
  if (state === "running") {
    if (action === "process_draft") {
      return "Ya se esta preparando el borrador.";
    }

    if (action === "cancel_draft") {
      return "Ya se esta cancelando el borrador actual.";
    }

    return "Ya se esta publicando el catalogo.";
  }

  if (state === "succeeded") {
    if (action === "process_draft") {
      return "El borrador termino bien y ya puede revisarse en linea.";
    }

    if (action === "cancel_draft") {
      return "El borrador actual se cancelo y ya no quedo activo.";
    }

    return "La publicacion local termino bien y la laptop ya envio los cambios a GitHub Pages.";
  }

  if (action === "process_draft") {
    return "La preparacion del borrador ya quedo en fila.";
  }

  if (action === "cancel_draft") {
    return "La cancelacion del borrador ya quedo en fila.";
  }

  return "La publicacion del catalogo ya quedo en fila.";
}

function escapePowerShellSingleQuoted(value) {
  return String(value).replace(/'/g, "''");
}

async function notifyLocalOperator(title, message) {
  if (process.platform !== "win32") {
    return;
  }

  const psTitle = escapePowerShellSingleQuoted(title);
  const psMessage = escapePowerShellSingleQuoted(message);
  const command = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "Add-Type -AssemblyName System.Drawing",
    "$notifyIcon = New-Object System.Windows.Forms.NotifyIcon",
    "$notifyIcon.Icon = [System.Drawing.SystemIcons]::Information",
    "$notifyIcon.Visible = $true",
    `$notifyIcon.BalloonTipTitle = '${psTitle}'`,
    `$notifyIcon.BalloonTipText = '${psMessage}'`,
    "$notifyIcon.ShowBalloonTip(5000)",
    "Start-Sleep -Seconds 6",
    "$notifyIcon.Dispose()"
  ].join("; ");

  await new Promise((resolve) => {
    const child = spawn("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      command
    ], {
      cwd: projectRoot,
      stdio: "ignore",
      windowsHide: true
    });

    child.on("error", () => resolve());
    child.on("close", () => resolve());
  });
}

async function readCatalogJson(relativePath) {
  const raw = await readFile(path.join(projectRoot, relativePath), "utf8");
  return JSON.parse(raw);
}

async function updateCurrentDraftReference() {
  const draftsRoot = path.join(projectRoot, "public", "catalog-drafts");
  const currentDraftPath = path.join(draftsRoot, "current-draft.json");

  let draftDates = [];

  try {
    const entries = await readdir(draftsRoot, { withFileTypes: true });
    draftDates = entries
      .filter(
        (entry) =>
          entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name)
      )
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left));
  } catch {
    draftDates = [];
  }

  if (draftDates.length === 0) {
    await rm(currentDraftPath, { force: true });
    return null;
  }

  const nextDate = draftDates[0];
  await writeFile(
    currentDraftPath,
    `${JSON.stringify(
      {
        date: nextDate,
        catalogPath: `/catalog-drafts/${nextDate}/catalog.json`
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  return nextDate;
}

async function cancelCurrentDraft() {
  const currentDraftReferencePath = path.join(
    "public",
    "catalog-drafts",
    "current-draft.json"
  );

  let currentDraftDate = null;

  try {
    const currentDraft = await readCatalogJson(currentDraftReferencePath);
    currentDraftDate =
      currentDraft && typeof currentDraft.date === "string"
        ? currentDraft.date
        : null;
  } catch {
    currentDraftDate = null;
  }

  if (!currentDraftDate) {
    const nextDate = await updateCurrentDraftReference();

    return {
      catalogDate: nextDate || undefined,
      draftReviewUrl: nextDate ? `/drafts/current/` : undefined,
      draftCancelled: false
    };
  }

  await rm(path.join(projectRoot, "public", "catalog-drafts", currentDraftDate), {
    recursive: true,
    force: true
  });

  const nextDate = await updateCurrentDraftReference();

  return {
    catalogDate: currentDraftDate,
    draftReviewUrl: nextDate ? `/drafts/current/` : undefined,
    draftCancelled: true,
    nextDraftDate: nextDate || undefined
  };
}

async function processOrder(order) {
  if (order.action === "process_draft") {
    await runPublisher([
      "scripts/publish-catalog.mjs",
      "--workflow",
      "draft",
      "--dry-run",
      "false",
      "--verbose",
      "true",
      "--thumbnail-mode",
      "node"
    ]);
    const currentDraft = await readCatalogJson(
      path.join("public", "catalog-drafts", "current-draft.json")
    );
    const draftCatalog = await readCatalogJson(
      path.join("public", currentDraft.catalogPath.replace(/^\//, ""))
    );
    return {
      catalogDate: draftCatalog.date,
      momentCount: draftCatalog.moments.length,
      draftReviewUrl: `/drafts/current/`
    };
  }

  if (order.action === "cancel_draft") {
    return cancelCurrentDraft();
  }

  let approvalCatalog = order.approvalCatalog;

  if (!approvalCatalog) {
    const currentDraft = await readCatalogJson(
      path.join("public", "catalog-drafts", "current-draft.json")
    );
    approvalCatalog = await readCatalogJson(
      path.join("public", currentDraft.catalogPath.replace(/^\//, ""))
    );
  }

  if (!approvalCatalog) {
    throw new Error("No draft catalog was available to publish.");
  }

  const approvalsDir = path.join(projectRoot, "catalog-approvals");
  await mkdir(approvalsDir, { recursive: true });
  const approvalFilePath = path.join(
    approvalsDir,
    "current-approved-catalog.json"
  );
  await writeFile(
    approvalFilePath,
    `${JSON.stringify(
      { savedAt: new Date().toISOString(), catalog: approvalCatalog },
      null,
      2
    )}\n`,
    "utf8"
  );

  await runPublisher([
    "scripts/publish-catalog.mjs",
    "--dry-run",
    "false",
    "--verbose",
    "true",
    "--catalog-input-file",
    "catalog-approvals/current-approved-catalog.json"
  ]);

  const currentCatalog = await readCatalogJson(
    path.join("public", "catalog", "current-catalog.json")
  );
  const publishedCatalog = await readCatalogJson(
    path.join("public", currentCatalog.catalogPath.replace(/^\//, ""))
  );
  const gitPublishResult = await runPublisher([
    "scripts/publish-pages-after-catalog.mjs",
    publishedCatalog.date
  ]);
  const deployment = parseDeploymentResult(gitPublishResult.stdout);

  return {
    catalogDate: publishedCatalog.date,
    momentCount: publishedCatalog.moments.length,
    publishedCatalogUrl: `/catalog/${publishedCatalog.date}/`,
    deployment
  };
}

function parseDeploymentResult(stdout) {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const lastLine = lines.at(-1);

  if (!lastLine) {
    throw new Error(
      "No se pudo confirmar el push automatico hacia GitHub Pages."
    );
  }

  try {
    return JSON.parse(lastLine);
  } catch {
    throw new Error(
      "El resultado del push automatico a GitHub Pages no tuvo formato valido."
    );
  }
}

async function readLegacyMailbox(inboxFolderId) {
  const file = await getFile(inboxFolderId);
  return {
    fileId: file.id,
    mailbox: parseMailbox(file.description)
  };
}

async function writeLegacyMailbox(inboxFolderId, mailbox) {
  await updateDriveFileMetadata(inboxFolderId, {
    description: JSON.stringify(mailbox, null, 2)
  });
}

async function findStatusFile(statusFolderId, orderId) {
  const matches = await listFoldersByQuery(
    `'${statusFolderId}' in parents and trashed = false and mimeType = 'application/json' and name = '${getStatusFileName(
      orderId
    )}'`
  );

  return matches[0] || null;
}

async function readStatusForOrder(statusFolderId, orderId) {
  const file = await findStatusFile(statusFolderId, orderId);

  if (!file) {
    return { file: null, status: null };
  }

  const status = normalizeStatus(await readJsonFile(file.id));
  return { file, status };
}

async function writeStatusForOrder(statusFolderId, order, state, message, result) {
  const payload = buildStatusPayload(order, state, message, result);
  const existingFile = await findStatusFile(statusFolderId, order.orderId);

  if (existingFile) {
    await updateJsonFile(existingFile.id, payload);
    return { fileId: existingFile.id, status: payload };
  }

  const createdFile = await uploadJsonFile(
    statusFolderId,
    getStatusFileName(order.orderId),
    payload
  );
  return { fileId: createdFile.id, status: payload };
}

async function archiveOrderFile(orderFileId, processedOrdersFolderId, currentParentId) {
  await moveDriveItemToFolder(orderFileId, processedOrdersFolderId, currentParentId);
}

async function loadPendingOrder(ordersFolderId, statusFolderId, processedOrdersFolderId) {
  const orderFiles = await listJsonFilesInFolder(ordersFolderId, {
    orderBy: "createdTime",
    pageSize: 50
  });

  for (const orderFile of orderFiles) {
    const order = normalizeOrder(await readJsonFile(orderFile.id));

    if (!order) {
      console.warn(`Ignoring invalid order payload in ${orderFile.name}.`);
      await archiveOrderFile(
        orderFile.id,
        processedOrdersFolderId,
        orderFile.parents?.[0] || ordersFolderId
      );
      continue;
    }

    const { status } = await readStatusForOrder(statusFolderId, order.orderId);

    if (
      status &&
      (status.state === "succeeded" ||
        status.state === "failed" ||
        status.state === "cancelled")
    ) {
      await archiveOrderFile(
        orderFile.id,
        processedOrdersFolderId,
        orderFile.parents?.[0] || ordersFolderId
      );
      continue;
    }

    if (status?.state === "running") {
      continue;
    }

    return {
      source: "queue-file",
      order,
      orderFileId: orderFile.id,
      orderFileParentId: orderFile.parents?.[0] || ordersFolderId
    };
  }

  return null;
}

async function loadLegacyOrder(inboxFolderId) {
  const { mailbox } = await readLegacyMailbox(inboxFolderId);
  const order = normalizeOrder(mailbox.order);

  if (!order) {
    return null;
  }

  return {
    source: "legacy-mailbox",
    order
  };
}

async function completeLegacyOrder(inboxFolderId) {
  const { mailbox } = await readLegacyMailbox(inboxFolderId);

  if (!mailbox.order) {
    return;
  }

  await writeLegacyMailbox(inboxFolderId, {
    ...mailbox,
    order: null
  });
}

async function main() {
  const cli = parseArgs(process.argv.slice(2));
  const config = await readLocalConfig();

  if (!process.env.GOOGLE_DRIVE_ACCESS_TOKEN && config.googleDriveAccessToken) {
    process.env.GOOGLE_DRIVE_ACCESS_TOKEN = config.googleDriveAccessToken;
  }
  if (!process.env.TERRA_VIVA_FFMPEG_PATH && config.ffmpegPath) {
    process.env.TERRA_VIVA_FFMPEG_PATH = config.ffmpegPath;
  }

  const once = toBoolean(cli.once, true);
  const pollIntervalSeconds = Number(cli["poll-interval-seconds"] || 20);

  if (!config.driveFolderId) {
    throw new Error("Missing driveFolderId in terra-viva.publisher.local.json.");
  }

  const driveLayout = await ensureTerraVivaFolderLayout({
    inboxFolderId: config.driveFolderId,
    rootFolderId: config.driveRootFolderId || ""
  });

  async function handleQueueCycle() {
    const queueOrder = await loadPendingOrder(
      driveLayout.ordersFolder.id,
      driveLayout.statusFolder.id,
      driveLayout.processedOrdersFolder.id
    );
    const pendingOrder = queueOrder || (await loadLegacyOrder(config.driveFolderId));

    if (!pendingOrder) {
      console.log("No website publisher orders found.");
      return false;
    }

    const order = pendingOrder.order;
    console.log(`Processing website order ${order.orderId} (${order.action})`);
    await notifyLocalOperator(
      "Terra Viva",
      order.action === "process_draft"
        ? "La laptop ya empezo a preparar un borrador nuevo."
        : order.action === "cancel_draft"
          ? "La laptop ya empezo a cancelar el borrador actual."
          : "La laptop ya empezo a publicar el catalogo."
    );
    await writeStatusForOrder(
      driveLayout.statusFolder.id,
      order,
      "running",
      getStatusMessage(order.action, "running")
    );

    try {
      const result = await processOrder(order);
      await writeStatusForOrder(
        driveLayout.statusFolder.id,
        order,
        "succeeded",
        getStatusMessage(order.action, "succeeded"),
        result
      );

      if (pendingOrder.source === "queue-file") {
        await archiveOrderFile(
          pendingOrder.orderFileId,
          driveLayout.processedOrdersFolder.id,
          pendingOrder.orderFileParentId
        );
      } else {
        await completeLegacyOrder(config.driveFolderId);
      }

      await notifyLocalOperator(
        "Terra Viva",
        order.action === "process_draft"
          ? "El borrador termino bien y ya se puede revisar."
          : order.action === "cancel_draft"
            ? "El borrador actual ya se cancelo."
            : "La publicacion local termino bien y ya se mando a GitHub Pages."
      );
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown publisher error.";
      await writeStatusForOrder(
        driveLayout.statusFolder.id,
        order,
        "failed",
        message
      );

      if (pendingOrder.source === "queue-file") {
        await archiveOrderFile(
          pendingOrder.orderFileId,
          driveLayout.processedOrdersFolder.id,
          pendingOrder.orderFileParentId
        );
      } else {
        await completeLegacyOrder(config.driveFolderId);
      }

      await notifyLocalOperator(
        "Terra Viva",
        `La orden ${order.action} fallo: ${message}`
      );
      throw error;
    }
  }

  if (once) {
    await handleQueueCycle();
    return;
  }

  console.log(`Watching website publisher queue every ${pollIntervalSeconds}s...`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await handleQueueCycle();
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);

      if (isDriveRefreshTokenRevokedError(error)) {
        throw error;
      }
    }

    await new Promise((resolve) =>
      setTimeout(resolve, pollIntervalSeconds * 1000)
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = isDriveRefreshTokenRevokedError(error) ? 41 : 1;
});
