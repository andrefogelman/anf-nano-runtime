import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { anfConfig } from './anf-config.js';

let startedAt: Date;

export function startHealthServer(): void {
  startedAt = new Date();

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          uptime_seconds: Math.floor((Date.now() - startedAt.getTime()) / 1000),
          started_at: startedAt.toISOString(),
        }),
      );
      return;
    }
    res.writeHead(404);
    res.end();
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(
        `[health] Port ${anfConfig.port} in use — health endpoint disabled`,
      );
    } else {
      console.error('[health] Server error:', err);
    }
  });

  server.listen(anfConfig.port, () => {
    console.log(`[health] Server listening on :${anfConfig.port}`);
  });
}
