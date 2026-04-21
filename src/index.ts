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
if (typeof process !== 'undefined' && process.env && !process.env.WORKER && !process.env.CF_PAGES) {
  const setupNodeServer = async () => {
    try {
      const { serve } = await import('@hono/node-server');
      const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
      
      console.log(`
        🚀 Hono Node Server (Local/Fallback) is running!
        📡 Port: ${port}
        🔗 http://localhost:${port}
      `);

      serve({
        fetch: app.fetch,
        port
      });
    } catch (e) {
      // Node server not available or failed to load
    }
  };
  setupNodeServer();
}
