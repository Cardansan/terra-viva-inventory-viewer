import path from "node:path";
import { spawnSync } from "node:child_process";

function getFfprobeCommand() {
  const ffmpegCommand = process.env.TERRA_VIVA_FFMPEG_PATH || "ffmpeg";

  if (ffmpegCommand.toLowerCase().endsWith("ffmpeg.exe")) {
    return ffmpegCommand.slice(0, -"ffmpeg.exe".length) + "ffprobe.exe";
  }

  if (ffmpegCommand.toLowerCase().endsWith("ffmpeg")) {
    return `${ffmpegCommand.slice(0, -"ffmpeg".length)}ffprobe`;
  }

  return "ffprobe";
}

export function probeVideoDurationSeconds(filePath) {
  const ffprobeCommand = getFfprobeCommand();
  const result = spawnSync(
    ffprobeCommand,
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      path.resolve(filePath)
    ],
    { encoding: "utf8" }
  );

  if (result.status !== 0) {
    throw new Error(
      `ffprobe fallo al leer la duracion de ${filePath}.\n${result.stderr || result.stdout}`
    );
  }

  const parsed = Number.parseFloat((result.stdout || "").trim());

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`ffprobe devolvio una duracion invalida para ${filePath}.`);
  }

  return parsed;
}
