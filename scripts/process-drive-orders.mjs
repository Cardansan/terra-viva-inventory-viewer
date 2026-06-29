#!/usr/bin/env node
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { isDriveRefreshTokenRevokedError } from "./lib/driveAuth.mjs";
import { getFile, updateDriveFileMetadata } from "./lib/driveClient.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const localConfigPath = path.join(projectRoot, "terra-viva.publisher.local.json");

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
    schema: "terra-viva-web-publisher/v1",
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

    if (parsed.schema !== "terra-viva-web-publisher/v1") {
      return getEmptyMailbox();
    }

    return {
      schema: "terra-viva-web-publisher/v1",
      order: parsed.order ?? null,
      status: parsed.status ?? null
    };
  } catch {
    return getEmptyMailbox();
  }
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
    orderId: order.id,
    action: order.action,
    state,
    createdAt: order.createdAt,
    updatedAt: now,
    message,
    result
  };
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

async function readMailbox(inboxFolderId) {
  const file = await getFile(inboxFolderId);
  return {
    fileId: file.id,
    mailbox: parseMailbox(file.description)
  };
}

async function writeMailbox(inboxFolderId, mailbox) {
  await updateDriveFileMetadata(inboxFolderId, {
    description: JSON.stringify(mailbox, null, 2)
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

  async function handleQueueCycle() {
    const { mailbox } = await readMailbox(config.driveFolderId);
    const order = mailbox.order;

    if (!order) {
      console.log("No website publisher orders found.");
      return false;
    }

    console.log(`Processing website order ${order.id} (${order.action})`);
    await writeMailbox(config.driveFolderId, {
      ...mailbox,
      order,
      status: buildStatusPayload(
        order,
        "running",
        order.action === "process_draft"
          ? "Ya se esta preparando el borrador."
          : order.action === "cancel_draft"
            ? "Ya se esta cancelando el borrador actual."
            : "Ya se esta publicando el catalogo."
      )
    });

    try {
      const result = await processOrder(order);
      await writeMailbox(config.driveFolderId, {
        ...mailbox,
        order: null,
        status: buildStatusPayload(
          order,
          "succeeded",
          order.action === "process_draft"
            ? "El borrador termino bien y ya puede revisarse en linea."
            : order.action === "cancel_draft"
              ? "El borrador actual se cancelo y ya no quedo activo."
              : "La publicacion local termino bien y la laptop ya envio los cambios a GitHub Pages.",
          result
        )
      });
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown publisher error.";
      await writeMailbox(config.driveFolderId, {
        ...mailbox,
        order: null,
        status: buildStatusPayload(order, "failed", message)
      });
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
