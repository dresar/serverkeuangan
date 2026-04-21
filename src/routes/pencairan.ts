import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getSQL } from '../db';
import { authMiddleware } from '../middleware/auth';

type Bindings = {
  DATABASE_URL: string;
};

const pencairan = new Hono<{ Bindings: Bindings }>();

const pencairanSchema = z.object({
  ajuan_id: z.string(),
  bank: z.string(),
  no_rekening: z.string(),
  nama_pemilik: z.string(),
  jumlah: z.number().positive(),
  bukti_url: z.string().url().optional()
});

pencairan.use('*', authMiddleware);

pencairan.get('/', async (c) => {
  const sql = getSQL(c.env.DATABASE_URL);
  const data = await sql`
    SELECT p.*, a.kode, a.judul, a.total
    FROM pencairan p
    JOIN ajuan_anggaran a ON p.ajuan_id = a.id
    ORDER BY p.created_at DESC
  `;
  return c.json(data);
});

pencairan.post('/', zValidator('json', pencairanSchema), async (c) => {
  const sql = getSQL(c.env.DATABASE_URL);
  const payload = c.get('jwtPayload') as any;
  const input = c.req.valid('json');

  try {
    const [result]: any = await sql`
      INSERT INTO pencairan (ajuan_id, bank, no_rekening, nama_pemilik, jumlah, status, diproses_oleh, bukti_url)
      VALUES (${input.ajuan_id}, ${input.bank}, ${input.no_rekening}, ${input.nama_pemilik}, ${input.jumlah}, 'selesai', ${payload.id}, ${input.bukti_url})
      RETURNING *
    `;
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '0.0.0.0';
    await sql`UPDATE ajuan_anggaran SET status = 'dicairkan' WHERE id = ${input.ajuan_id}`;
    await sql`INSERT INTO audit_log (user_id, aksi, modul, detail, ip_address) 
      VALUES (${payload.id}, 'pencairan', 'pencairan', ${JSON.stringify(input)}, ${ip})`;

    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default pencairan;
