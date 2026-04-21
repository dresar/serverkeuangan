import { neon } from '@neondatabase/serverless';

/**
 * Cloudflare Workers context-aware SQL factory.
 * In Workers, we must use the environment variable from the context.
 */
export const getSQL = (dbUrl: string) => {
  return neon(dbUrl);
};

// For local Node.js development fallback
// (Note: Neon serverless driver works in Node too via HTTP)
export const getLocalSQL = () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return neon(url);
};

export default getSQL;
