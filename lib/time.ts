export function formatTimestamp(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export function parseTimestampToSeconds(value: string): number {
  const trimmed = value.trim();

  if (!trimmed.includes(":")) {
    return Number(trimmed) || 0;
  }

  const [minutes, seconds] = trimmed.split(":").map(Number);
  return (minutes || 0) * 60 + (seconds || 0);
}
