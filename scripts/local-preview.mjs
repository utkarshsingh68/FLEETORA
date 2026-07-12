import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, request as proxyRequest } from "node:http";
import { extname, join, normalize } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const assetsRoot = join(root, "dist", "client");
const publicPort = Number(process.env.PORT ?? 3000);
const upstreamPort = Number(process.env.UPSTREAM_PORT ?? publicPort + 1);

const mime = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".json": "application/json; charset=utf-8",
};

const upstream = spawn(
  process.execPath,
  [join(root, "node_modules", "vinext", "dist", "cli.js"), "start", "--host", "127.0.0.1", "--port", String(upstreamPort)],
  { cwd: root, env: process.env, stdio: "inherit" },
);

const server = createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
  const relative = normalize(pathname).replace(/^([/\\])+/, "");
  const candidate = join(assetsRoot, relative);

  if (candidate.startsWith(assetsRoot) && existsSync(candidate) && statSync(candidate).isFile()) {
    res.writeHead(200, {
      "content-type": mime[extname(candidate).toLowerCase()] ?? "application/octet-stream",
      "cache-control": "no-cache",
    });
    createReadStream(candidate).pipe(res);
    return;
  }

  const proxied = proxyRequest(
    { hostname: "localhost", port: upstreamPort, path: req.url, method: req.method, headers: req.headers },
    (upstreamResponse) => {
      res.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(res);
    },
  );
  proxied.on("error", () => {
    res.writeHead(503, { "content-type": "text/plain; charset=utf-8", "retry-after": "1" });
    res.end("Fleetora is starting. Refresh in a moment.");
  });
  req.pipe(proxied);
});

server.listen(publicPort, "0.0.0.0", () => {
  console.log(`Fleetora web service listening on port ${publicPort}`);
});

const shutdown = () => {
  server.close();
  upstream.kill();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
