import path from "node:path";
import { spawnSync } from "node:child_process";

function getFfmpegCommand() {
  return process.env.TERRA_VIVA_FFMPEG_PATH || "ffmpeg";
}

function extractFrameSignature(filePath, timestampSeconds, sampleSize) {
  const ffmpegCommand = getFfmpegCommand();
  const filter = [
    `scale=${sampleSize}:${sampleSize}:force_original_aspect_ratio=decrease`,
    `pad=${sampleSize}:${sampleSize}:(ow-iw)/2:(oh-ih)/2`,
    "format=gray"
  ].join(",");
  const result = spawnSync(
    ffmpegCommand,
    [
      "-v",
      "error",
      "-ss",
      String(Math.max(0, timestampSeconds)),
      "-i",
      path.resolve(filePath),
      "-vf",
      filter,
      "-frames:v",
      "1",
      "-f",
      "rawvideo",
      "pipe:1"
    ],
    {
      encoding: null,
      maxBuffer: 1024 * 1024
    }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr?.toString("utf8") || result.stdout?.toString("utf8") || "ffmpeg frame extraction failed.");
  }

  return new Uint8Array(result.stdout);
}

function averageAbsoluteDifference(left, right) {
  if (left.length === 0 || left.length !== right.length) {
    return Number.POSITIVE_INFINITY;
  }

  let totalDifference = 0;

  for (let index = 0; index < left.length; index += 1) {
    totalDifference += Math.abs(left[index] - right[index]);
  }

  return totalDifference / left.length;
}

export function dedupeMomentTimestamps({
  filePath,
  timestamps,
  sampleSize = 24,
  similarityThreshold = 10,
  minGapSeconds = 2,
  verbose = false
}) {
  const orderedTimestamps = [...new Set(timestamps)]
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);

  if (orderedTimestamps.length <= 1) {
    return {
      acceptedTimestamps: orderedTimestamps,
      droppedTimestamps: [],
      comparisons: []
    };
  }

  const acceptedTimestamps = [];
  const droppedTimestamps = [];
  const comparisons = [];
  let previousAcceptedTimestamp = null;
  let previousAcceptedSignature = null;

  for (const timestampSeconds of orderedTimestamps) {
    const signature = extractFrameSignature(filePath, timestampSeconds, sampleSize);

    if (!previousAcceptedSignature) {
      acceptedTimestamps.push(timestampSeconds);
      previousAcceptedTimestamp = timestampSeconds;
      previousAcceptedSignature = signature;
      continue;
    }

    const averageDifference = averageAbsoluteDifference(
      signature,
      previousAcceptedSignature
    );
    const gapSeconds = Math.abs(timestampSeconds - previousAcceptedTimestamp);
    const isDuplicate =
      gapSeconds >= minGapSeconds && averageDifference < similarityThreshold;

    comparisons.push({
      timestampSeconds,
      averageDifference: Number(averageDifference.toFixed(2)),
      gapSeconds,
      kept: !isDuplicate
    });

    if (isDuplicate) {
      droppedTimestamps.push(timestampSeconds);
      continue;
    }

    acceptedTimestamps.push(timestampSeconds);
    previousAcceptedTimestamp = timestampSeconds;
    previousAcceptedSignature = signature;
  }

  if (verbose) {
    console.log(
      `Deduplicacion visual: ${acceptedTimestamps.length} aceptados, ${droppedTimestamps.length} descartados por similitud.`
    );
  }

  return {
    acceptedTimestamps,
    droppedTimestamps,
    comparisons
  };
}
