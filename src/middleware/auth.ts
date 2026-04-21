import { jwt } from 'hono/jwt';
import { createMiddleware } from 'hono/factory';

export const authMiddleware = createMiddleware(async (c, next) => {
  const secret = c.env.JWT_SECRET || 'secret';
  const handler = jwt({
    secret,
  });
  return handler(c, next);
});
