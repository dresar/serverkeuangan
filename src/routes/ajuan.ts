import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { getSQL } from '../db';
import { authMiddleware } from '../middleware/auth';

type Bindings = {
  DATABASE_URL: string;
};

const ajuan = new Hono<{ Bindings: Bindings }>();

const ajuanSchema = z.object({
  judul: z.string().min(5),
  instansi: z.string(),
  rencana_penggunaan: z.string(),
  total: z.number().positive(),
  bukti_url: z.string().url().optional(),
  items: z.array(z.object({
    nama_item: z.string(),
    qty: z.number(),
    satuan: z.string(),
    harga: z.number()
  })).optional()
});

ajuan.use('*', authMiddleware);

ajuan.get('/', async (c) => {
  const sql = getSQL(c.env.DATABASE_URL);
  const data = await sql`
    SELECT a.*, p.nama_lengkap as pengaju_nama 
    FROM ajuan_anggaran a
    LEFT JOIN profiles p ON a.pengaju_id = p.id
    ORDER BY a.created_at DESC
  `;
  return c.json(data);
});

ajuan.get('/:id', async (c) => {
  const sql = getSQL(c.env.DATABASE_URL);
  const id = c.req.param('id');
  const [data]: any = await sql`SELECT * FROM ajuan_anggaran WHERE id = ${id}`;
  const items = await sql`SELECT * FROM ajuan_items WHERE ajuan_id = ${id}`;
  const history = await sql`SELECT * FROM approval_history WHERE ajuan_id = ${id} ORDER BY created_at`;
  
  if (!data) return c.json({ error: 'Not found' }, 404);
  return c.json({ ajuan: data, items, history });
});

ajuan.post('/', zValidator('json', ajuanSchema), async (c) => {
  const sql = getSQL(c.env.DATABASE_URL);
  const payload = c.get('jwtPayload') as any;
  const { judul, instansi, rencana_penggunaan, total, items, bukti_url } = c.req.valid('json');
  const kode = `AJU-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

  try {
    const [result]: any = await sql`
      INSERT INTO ajuan_anggaran (kode, judul, pengaju_id, instansi, rencana_penggunaan, total, status, bukti_url)
      VALUES (${kode}, ${judul}, ${payload.id}, ${instansi}, ${rencana_penggunaan}, ${total}, 'menunggu', ${bukti_url})
      RETURNING *
    `;

    if (items && items.length > 0) {
      // Manual batch insert if Neon HTTP driver has limitations, but simple multiple executes are usually fine.
      // Here we just loop for simplicity or use the standard syntax.
      for(const i of items) {
        await sql`INSERT INTO ajuan_items (ajuan_id, nama_item, qty, satuan, harga, subtotal) 
          VALUES (${result.id}, ${i.nama_item}, ${i.qty}, ${i.satuan}, ${i.harga}, ${i.qty * i.harga})`;
      }
    }

    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '0.0.0.0';
    await sql`INSERT INTO audit_log (user_id, aksi, modul, detail, ip_address) 
      VALUES (${payload.id}, 'create', 'ajuan_anggaran', ${JSON.stringify({ kode, total })}, ${ip})`;

    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

ajuan.post('/:id/approve', zValidator('json', z.object({ aksi: z.enum(['disetujui', 'ditolak']), catatan: z.string().optional() })), async (c) => {
  const sql = getSQL(c.env.DATABASE_URL);
  const payload = c.get('jwtPayload') as any;
  const ajuanId = c.req.param('id');
  const { aksi, catatan } = c.req.valid('json');

  try {
    await sql`UPDATE ajuan_anggaran SET status = ${aksi}, catatan = ${catatan} WHERE id = ${ajuanId}`;
    await sql`INSERT INTO approval_history (ajuan_id, approver_id, aksi, catatan) VALUES (${ajuanId}, ${payload.id}, ${aksi}, ${catatan})`;

    const [record]: any = await sql`SELECT pengaju_id, kode FROM ajuan_anggaran WHERE id = ${ajuanId}`;
    if (record) {
      await sql`INSERT INTO notifikasi (user_id, judul, pesan, tipe, link) VALUES (
        ${record.pengaju_id}, 
        ${`Ajuan ${record.kode} ${aksi}`}, 
        ${catatan || `Ajuan Anda telah ${aksi}.`}, 
        ${aksi === 'disetujui' ? 'sukses' : 'peringatan'}, 
        ${`/ajuan/${ajuanId}`}
      )`;
    }

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default ajuan;
