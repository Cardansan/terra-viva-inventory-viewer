import { spawnSync } from "node:child_process";

function runGit(args) {
  const result = spawnSync("git", args, { encoding: "utf8", stdio: "pipe" });

  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} fallo:\n${result.stderr || result.stdout}`);
  }

  return result.stdout.trim();
}

export function getGitStatusShort() {
  return runGit(["status", "--short"]);
}

export function commitAndPushGeneratedCatalog(date) {
  runGit(["add", "public/catalog"]);
  const status = getGitStatusShort();

  if (!status) {
    return "No hay cambios generados para commitear.";
  }

  runGit(["commit", "-m", `Publish Terra Viva catalog ${date}`]);
  runGit(["push", "origin", "main"]);
  return `Catalogo ${date} commiteado y empujado a main.`;
}
