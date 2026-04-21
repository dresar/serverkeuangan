import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { getSQL } from './db';

// Import Route Handlers
import auth from './routes/auth';
import ajuan from './routes/ajuan';
import pencairan from './routes/pencairan';
import system from './routes/system';

const app = new Hono<{ Bindings: { DATABASE_URL: string; JWT_SECRET: string; DEBUG?: string } }>().basePath('/api');

// Middleware
app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: '*', // Adjust for production security if needed
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

// Route Mounting
app.route('/auth', auth);
app.route('/ajuan', ajuan);
app.route('/pencairan', pencairan);
app.route('/system', system);

// Enhanced Health Check (Ping DB)
app.get('/health', async (c) => {
  const start = Date.now();
  let dbStatus = 'down';
  
  try {
    const dbUrl = c.env?.DATABASE_URL || (typeof process !== 'undefined' ? process.env.DATABASE_URL : '');
    const sql = getSQL(dbUrl as string);
    await sql`SELECT 1`;
    dbStatus = 'up';
  } catch (err) {
    console.error('Health check DB ping failed:', err);
  }

  return c.json({
    status: 'ok',
    database: dbStatus,
    uptime: process.uptime ? process.uptime() : null, // process.uptime might not exist in Workers
    timestamp: new Date().toISOString(),
    latency: `${Date.now() - start}ms`
  });
});

// Error Handling
app.onError((err, c) => {
  console.error('[Hono Server Error]:', err);
  return c.json({
    status: 'error',
    message: err.message,
    stack: (c.env?.DEBUG === 'true' || (typeof process !== 'undefined' && process.env.DEBUG === 'true')) ? err.stack : undefined
  }, 500);
});

export default app;
