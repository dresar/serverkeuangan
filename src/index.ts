import { serve } from '@hono/node-server';
import app from './app';

/**
 * Entry point for Cloudflare Workers.
 * Workers use "export default" to handle incoming requests.
 */
export default app;

/**
 * Entry point for local Node.js development.
 * This part only runs if the file is executed directly by Node.js.
 */
if (typeof process !== 'undefined' && process.env && !process.env.WORKER) {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  
  console.log(`
    🚀 Hono Node Server (Development/Fallback) is running!
    📡 Port: ${port}
    🔗 http://localhost:${port}
  `);

  serve({
    fetch: app.fetch,
    port
  });
}
