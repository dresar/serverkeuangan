import { Hono } from 'hono';
import { getSQL } from '../db';
import { authMiddleware } from '../middleware/auth';

type Bindings = {
  DATABASE_URL: string;
};

const system = new Hono<{ Bindings: Bindings }>();

system.use('*', authMiddleware);

system.get('/audit', async (c) => {
  const sql = getSQL(c.env.DATABASE_URL);
  const logs = await sql`
    SELECT l.*, p.nama_lengkap as user_nama 
    FROM audit_log l
    LEFT JOIN profiles p ON l.user_id = p.id
    ORDER BY l.created_at DESC LIMIT 100
  `;
  return c.json(logs);
});

system.get('/notifikasi', async (c) => {
  const sql = getSQL(c.env.DATABASE_URL);
  const payload = c.get('jwtPayload') as any;
  const list = await sql`SELECT * FROM notifikasi WHERE user_id = ${payload.id} ORDER BY created_at DESC LIMIT 20`;
  return c.json(list);
});

system.get('/users', async (c) => {
  const sql = getSQL(c.env.DATABASE_URL);
  const data = await sql`
    SELECT p.id, p.email, p.nama_lengkap, p.jabatan, p.instansi, r.role
    FROM profiles p
    JOIN user_roles r ON p.id = r.user_id
  `;
  return c.json(data);
});

system.get('/dashboard/stats', async (c) => {
  const sql = getSQL(c.env.DATABASE_URL);
  const [totalAjuan]: any = await sql`SELECT COUNT(*) as count FROM ajuan_anggaran`;
  const [totalNilai]: any = await sql`SELECT SUM(total) as sum FROM ajuan_anggaran WHERE status = 'disetujui'`;
  const [pending]: any = await sql`SELECT COUNT(*) as count FROM ajuan_anggaran WHERE status = 'menunggu'`;
  
  return c.json({
    total_ajuan: parseInt(totalAjuan?.count || 0),
    total_nilai: parseFloat(totalNilai?.sum || 0),
    pending_approval: parseInt(pending?.count || 0)
  });
});

export default system;
