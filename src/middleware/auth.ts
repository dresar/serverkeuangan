import { jwt } from 'hono/jwt';
import { createMiddleware } from 'hono/factory';

export const authMiddleware = createMiddleware(async (c, next) => {
  const secret = c.env?.JWT_SECRET || (typeof process !== 'undefined' ? process.env.JWT_SECRET : '') || 'secret';
  const handler = jwt({
    secret,
    alg: 'HS256'
  });
  return handler(c, next);
});
