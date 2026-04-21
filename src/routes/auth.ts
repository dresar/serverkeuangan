import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { sign } from 'hono/jwt';
import bcrypt from 'bcryptjs';
import { getSQL } from '../db';
import { authMiddleware } from '../middleware/auth';

type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;
};

const auth = new Hono<{ Bindings: Bindings }>();

const createToken = async (user: any, secret: string) => {
  return await sign({
    id: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  }, secret, 'HS256');
};

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nama_lengkap: z.string().min(3),
  jabatan: z.string().optional(),
  instansi: z.string().optional(),
  no_hp: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

auth.post('/signup', zValidator('json', signupSchema), async (c) => {
  const { email, password, nama_lengkap, jabatan, instansi, no_hp } = c.req.valid('json');
  const sql = getSQL(c.env.DATABASE_URL);
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [existing]: any = await sql`SELECT id FROM profiles WHERE email = ${email}`;
    if (existing) return c.json({ error: 'Email already registered' }, 400);

    const [user]: any = await sql`
      INSERT INTO profiles (nama_lengkap, jabatan, instansi, no_hp, email, password)
      VALUES (${nama_lengkap}, ${jabatan}, ${instansi}, ${no_hp}, ${email}, ${hashedPassword})
      RETURNING id, email, nama_lengkap
    `;

    await sql`INSERT INTO user_roles (user_id, role) VALUES (${user.id}, 'pengaju')`;
    const token = await createToken(user, c.env.JWT_SECRET);
    
    return c.json({ user, token });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const sql = getSQL(c.env.DATABASE_URL);
  
  try {
    const [user]: any = await sql`SELECT * FROM profiles WHERE email = ${email}`;
    if (!user) return c.json({ error: 'User not found' }, 401);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return c.json({ error: 'Invalid password' }, 401);

    const [roleObj]: any = await sql`SELECT role FROM user_roles WHERE user_id = ${user.id}`;
    const token = await createToken(user, c.env.JWT_SECRET);
    
    return c.json({ 
      user: { id: user.id, email: user.email, nama_lengkap: user.nama_lengkap },
      role: roleObj?.role || 'pengaju',
      token 
    });
  } catch (err: any) {
    console.error('[Login Error]:', err);
    return c.json({ 
      error: 'Terjadi kesalahan sistem saat login', 
      detail: err.message 
    }, 500);
  }
});

// Dev Login (Bypass password for specific emails)
auth.post('/dev-login', zValidator('json', z.object({ email: z.string().email() })), async (c) => {
  const { email } = c.req.valid('json');
  const sql = getSQL(c.env.DATABASE_URL);
  const devEmails = ['admin@example.com', 'approver@example.com', 'pengaju@example.com'];
  
  if (!devEmails.includes(email)) {
    return c.json({ error: 'Not a dev email' }, 403);
  }

  try {
    const [user]: any = await sql`SELECT * FROM profiles WHERE email = ${email}`;
    if (!user) return c.json({ error: 'User not found in seed data' }, 404);

    const [roleObj]: any = await sql`SELECT role FROM user_roles WHERE user_id = ${user.id}`;
    const token = await createToken(user, c.env.JWT_SECRET);
    
    return c.json({ 
      user: { id: user.id, email: user.email, nama_lengkap: user.nama_lengkap },
      role: roleObj?.role || 'pengaju',
      token 
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

auth.get('/me', authMiddleware, async (c) => {
  const sql = getSQL(c.env.DATABASE_URL);
  const payload = c.get('jwtPayload') as any;
  const [user]: any = await sql`SELECT id, email, nama_lengkap, jabatan, instansi, no_hp, foto_url FROM profiles WHERE id = ${payload.id}`;
  const [roleObj]: any = await sql`SELECT role FROM user_roles WHERE user_id = ${payload.id}`;
  
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json({ user, role: roleObj?.role || 'pengaju' });
});

export default auth;
