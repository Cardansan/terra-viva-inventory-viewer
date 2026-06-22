import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";

const args = new Map();

for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];

  if (key?.startsWith("--") && value) {
    args.set(key.slice(2), value);
  }
}

const rootArg = args.get("root");
const port = Number(args.get("port") ?? "4185");

if (!rootArg) {
  console.error("Missing required --root argument.");
  process.exit(1);
}

const resolvedRoot = path.resolve(rootArg);

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".mp4", "video/mp4"],
  [".txt", "text/plain; charset=utf-8"],
]);

const sanitizePath = (requestPath) => {
  const normalized = requestPath === "/" ? "/terra-viva-inventory-viewer/index.html" : requestPath;
  const decoded = decodeURIComponent(normalized);
  const relativePath = decoded.replace(/^\/+/, "");
  const fullPath = path.resolve(resolvedRoot, relativePath);

  if (!fullPath.startsWith(resolvedRoot)) {
    return null;
  }

  return fullPath;
};

const resolveFilePath = async (requestPath) => {
  const sanitized = sanitizePath(requestPath);

  if (!sanitized) {
    return { statusCode: 403, filePath: null };
  }

  try {
    const stats = await fs.stat(sanitized);

    if (stats.isDirectory()) {
      const directoryIndex = path.join(sanitized, "index.html");
      await fs.access(directoryIndex);
      return { statusCode: 200, filePath: directoryIndex };
    }

    return { statusCode: 200, filePath: sanitized };
  } catch {
    const fallback404 = path.join(resolvedRoot, "terra-viva-inventory-viewer", "404.html");

    try {
      await fs.access(fallback404);
      return { statusCode: 404, filePath: fallback404 };
    } catch {
      return { statusCode: 404, filePath: null };
    }
  }
};

const server = http.createServer(async (request, response) => {
  const requestPath = request.url ?? "/";
  const { statusCode, filePath } = await resolveFilePath(requestPath);

  if (!filePath) {
    response.writeHead(statusCode);
    response.end();
    return;
  }

  const contentType = contentTypes.get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream";
  response.writeHead(statusCode, { "Content-Type": contentType });
  createReadStream(filePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Static export server listening on http://127.0.0.1:${port}`);
});

const shutdown = () => {
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
