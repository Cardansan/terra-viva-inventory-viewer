import { mkdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

function getFfmpegCommand() {
  return process.env.TERRA_VIVA_FFMPEG_PATH || "ffmpeg";
}

function runFfmpeg(args) {
  return spawnSync(getFfmpegCommand(), args, { encoding: "utf8" });
}

export function assertFfmpegAvailable() {
  const result = runFfmpeg(["-version"]);

  if (result.status !== 0) {
    throw new Error("ffmpeg no esta disponible en PATH. Instala ffmpeg antes de publicar videos reales.");
  }
}

function toTimestamp(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = String(Math.floor(total / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const secs = String(total % 60).padStart(2, "0");
  return `${hours}:${minutes}:${secs}`;
}

export async function generateThumbnailsForCatalog({
  catalog,
  outputDir,
  videoPathsByVideoId,
  verbose = true
}) {
  assertFfmpegAvailable();
  await mkdir(outputDir, { recursive: true });

  if (verbose) {
    console.log(`Generando ${catalog.moments.length} miniaturas reales con ffmpeg...`);
  }

  for (const moment of catalog.moments) {
    const videoPath = videoPathsByVideoId.get(moment.videoId);

    if (!videoPath) {
      throw new Error(`No se encontro video local para ${moment.id} (${moment.videoId}).`);
    }

    const outputPath = path.join(
      outputDir,
      `tree-${String(moment.treeNumber).padStart(3, "0")}.jpg`
    );
    const args = [
      "-y",
      "-ss",
      toTimestamp(moment.timestampSeconds),
      "-i",
      videoPath,
      "-frames:v",
      "1",
      "-update",
      "1",
      "-q:v",
      "2",
      outputPath
    ];

    if (verbose) {
      console.log(
        `  - Arbol ${String(moment.treeNumber).padStart(2, "0")} @ ${toTimestamp(moment.timestampSeconds)}`
      );
    }

    const result = runFfmpeg(args);

    if (result.status !== 0) {
      throw new Error(
        `ffmpeg fallo al generar la miniatura de ${moment.id}.\n${result.stderr || result.stdout}`
      );
    }
  }

  if (verbose) {
    console.log(`Miniaturas generadas en: ${outputDir}`);
  }
}
