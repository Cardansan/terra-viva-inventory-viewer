#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

function runGit(args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, {
      cwd: projectRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      ...options
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr || stdout || `git ${args.join(" ")} failed with ${code}`));
    });
  });
}

async function resolveCurrentBranch() {
  const result = await runGit(["branch", "--show-current"]);
  const branch = result.stdout.trim();

  if (!branch) {
    throw new Error(
      "No se pudo detectar la rama actual para publicar en GitHub Pages."
    );
  }

  return branch;
}

async function ensureGitIdentity() {
  const nameResult = await runGit(["config", "--get", "user.name"]).catch(
    () => ({ stdout: "" })
  );
  const emailResult = await runGit(["config", "--get", "user.email"]).catch(
    () => ({ stdout: "" })
  );

  if (!nameResult.stdout.trim()) {
    await runGit(["config", "user.name", "terra-viva-publisher"]);
  }

  if (!emailResult.stdout.trim()) {
    await runGit([
      "config",
      "user.email",
      "actions@users.noreply.github.com"
    ]);
  }
}

async function hasTrackedPathChanges(pathspecs) {
  const result = await runGit([
    "status",
    "--short",
    "--",
    ...pathspecs
  ]);

  return result.stdout.trim().length > 0;
}

async function main() {
  const catalogDate = process.argv[2];

  if (!catalogDate) {
    throw new Error(
      "Falta la fecha del catálogo para publicar en GitHub Pages."
    );
  }

  const branch = await resolveCurrentBranch();
  const pathspecs = [
    "public/catalog/current-catalog.json",
    `public/catalog/${catalogDate}`
  ];

  if (!(await hasTrackedPathChanges(pathspecs))) {
    console.log("No habia cambios de catalogo para subir a GitHub.");
    console.log(
      JSON.stringify({
        branch,
        catalogDate,
        committed: false,
        pushed: false
      })
    );
    return;
  }

  await ensureGitIdentity();

  await runGit([
    "commit",
    "--only",
    "-m",
    `Publish Terra Viva catalog ${catalogDate}`,
    "--",
    ...pathspecs
  ]);

  const commitResult = await runGit(["rev-parse", "HEAD"]);
  const commitSha = commitResult.stdout.trim();
  await runGit(["push", "origin", branch]);

  console.log(
    JSON.stringify({
      branch,
      catalogDate,
      commitSha,
      committed: true,
      pushed: true
    })
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
