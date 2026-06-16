import { spawnSync } from "node:child_process";

export function assertFfmpegAvailable() {
  const result = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });

  if (result.status !== 0) {
    throw new Error("ffmpeg no esta disponible en PATH. Instala ffmpeg antes de publicar videos reales.");
  }
}

export async function generateThumbnailsForVideo({ dryRun, usePlaceholderMedia }) {
  if (dryRun || usePlaceholderMedia) {
    return [];
  }

  assertFfmpegAvailable();
  throw new Error(
    "Extraccion real de miniaturas pendiente: el scaffold ya valida ffmpeg, pero aun no corta frames reales."
  );
}
