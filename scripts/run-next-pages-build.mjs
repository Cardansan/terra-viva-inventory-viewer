#!/usr/bin/env node
import { spawn, execFile } from "node:child_process";
import { access, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const nextBinPath = path.join(
  projectRoot,
  "node_modules",
  ".pnpm",
  "next@14.2.35_react-dom@18.3.1_react@18.3.1__react@18.3.1",
  "node_modules",
  "next",
  "dist",
  "bin",
  "next"
);

async function exists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function killProcessTree(pid) {
  if (process.platform !== "win32") {
    process.kill(pid, "SIGKILL");
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    execFile(
      "taskkill",
      ["/PID", String(pid), "/T", "/F"],
      { windowsHide: true },
      () => resolve()
    );
  });
}

async function main() {
  const timeoutMs = 280_000;
  const outputRoot = path.join(projectRoot, ".next-pages");

  if (await exists(outputRoot)) {
    await rm(outputRoot, { recursive: true, force: true });
  }

  const env = {
    ...process.env,
    GITHUB_PAGES: "true",
    NEXT_TELEMETRY_DISABLED: "1"
  };

  console.log(`[pages-build] node=${process.execPath}`);
  console.log(`[pages-build] next=${nextBinPath}`);
  console.log(`[pages-build] cwd=${projectRoot}`);

  const child = spawn(process.execPath, [nextBinPath, "build", "--no-lint"], {
    cwd: projectRoot,
    env,
    stdio: "inherit",
    windowsHide: true
  });

  const startedAt = Date.now();
  const heartbeat = setInterval(() => {
    const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
    console.log(`[pages-build] alive pid=${child.pid} elapsed=${elapsedSeconds}s`);
  }, 10_000);

  let didTimeout = false;
  const timeout = setTimeout(async () => {
    didTimeout = true;
    console.error(`[pages-build] timeout after ${timeoutMs}ms pid=${child.pid}`);
    await killProcessTree(child.pid);
  }, timeoutMs);

  const exitCode = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });

  clearInterval(heartbeat);
  clearTimeout(timeout);

  if (didTimeout) {
    process.exitCode = 124;
    return;
  }

  if (typeof exitCode === "number") {
    process.exitCode = exitCode;
    return;
  }

  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
