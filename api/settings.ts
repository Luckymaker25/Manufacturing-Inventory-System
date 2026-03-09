import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db';
import { ok, serverError, allowMethods } from './_helpers';

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') return getSettings(res);
    if (req.method === 'PUT') return updateSettings(req, res);
    return allowMethods(res, ['GET', 'PUT']);
  } catch (err) {
    return serverError(res, err);
  }
}

function getSettings(res: VercelResponse) {
  const db = getDb();
  const settings = db.prepare(`SELECT * FROM settings WHERE id = 1`).get();
  return ok(res, settings);
}

function updateSettings(req: VercelRequest, res: VercelResponse) {
  const db = getDb();
  const { company_name, address, email, phone, logo_url, currency } = req.body;

  db.prepare(`
    INSERT INTO settings (id, company_name, address, email, phone, logo_url, currency)
    VALUES (1, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      company_name=excluded.company_name,
      address=excluded.address,
      email=excluded.email,
      phone=excluded.phone,
      logo_url=excluded.logo_url,
      currency=excluded.currency
  `).run(company_name, address, email, phone, logo_url || '', currency || 'Rp');

  return ok(res, db.prepare(`SELECT * FROM settings WHERE id = 1`).get());
}
