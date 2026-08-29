import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const distributionDirectory = path.resolve(currentDirectory, 'dist');
const indexFile = path.join(distributionDirectory, 'index.html');
const host = process.env.HOST ?? '127.0.0.1';
const port = Number.parseInt(process.env.PORT ?? '8080', 10);
const requestLimit = Number.parseInt(
  process.env.REQUESTS_PER_MINUTE ?? '300',
  10,
);
const requestWindowMs = 60_000;
const requestCounters = new Map();

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
]);

function applySecurityHeaders(request, response) {
  response.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
  );
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  response.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=()');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');

  if (request.headers['x-forwarded-proto'] === 'https') {
    response.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
  }
}

function isRateLimited(request) {
  const now = Date.now();
  const clientId = request.socket.remoteAddress ?? 'unknown';
  const existing = requestCounters.get(clientId);

  if (!existing || now - existing.windowStartedAt >= requestWindowMs) {
    requestCounters.set(clientId, { count: 1, windowStartedAt: now });
    return false;
  }

  existing.count += 1;
  return existing.count > requestLimit;
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(message);
}

function decodeRequestPath(requestUrl) {
  const rawPath = requestUrl.split('?', 1)[0] ?? '/';
  let decodedPath = rawPath;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const nextPath = decodeURIComponent(decodedPath);
    if (nextPath === decodedPath) break;
    decodedPath = nextPath;
  }

  const segments = decodedPath.replaceAll('\\', '/').split('/');
  if (
    decodedPath.includes('\0') ||
    decodedPath.includes('\\') ||
    segments.includes('..')
  ) {
    throw new Error('Invalid request path');
  }

  return decodeURIComponent(
    new URL(requestUrl, 'http://localhost').pathname,
  );
}

function serveFile(request, response, filePath) {
  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      sendText(response, 404, 'Not found');
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const isIndex = path.basename(filePath) === 'index.html';
    response.writeHead(200, {
      'Content-Type':
        contentTypes.get(extension) ?? 'application/octet-stream',
      'Content-Length': stats.size,
      'Cache-Control': isIndex
        ? 'no-cache'
        : 'public, max-age=3600, immutable',
    });

    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!response.headersSent) {
        sendText(response, 500, 'Unable to read requested resource');
      } else {
        response.destroy();
      }
    });
    stream.pipe(response);
  });
}

const server = http.createServer((request, response) => {
  applySecurityHeaders(request, response);

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    sendText(response, 405, 'Method not allowed');
    return;
  }

  if (isRateLimited(request)) {
    response.setHeader('Retry-After', '60');
    sendText(response, 429, 'Too many requests');
    return;
  }

  let pathname;
  try {
    pathname = decodeRequestPath(request.url ?? '/');
  } catch {
    sendText(response, 400, 'Invalid request path');
    return;
  }

  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const candidatePath = path.resolve(
    distributionDirectory,
    `.${requestedPath}`,
  );
  const isInsideDistribution =
    candidatePath === distributionDirectory ||
    candidatePath.startsWith(`${distributionDirectory}${path.sep}`);

  if (!isInsideDistribution) {
    sendText(response, 400, 'Invalid request path');
    return;
  }

  fs.stat(candidatePath, (statError, stats) => {
    if (!statError && stats.isFile()) {
      serveFile(request, response, candidatePath);
      return;
    }

    // Client-side routes receive the application shell. Missing files do not.
    if (!path.extname(pathname)) {
      serveFile(request, response, indexFile);
      return;
    }

    sendText(response, 404, 'Not found');
  });
});

server.on('error', (error) => {
  console.error(`SafeGuard Sentinel dashboard failed: ${error.message}`);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(
    `SafeGuard Sentinel dashboard listening on http://${host}:${port}`,
  );
});
