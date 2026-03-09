import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../_db';
import { ok, serverError } from '../../_helpers';

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = getDb();
    const productId = Number(req.query.id);

    const rows = db.prepare(`
      SELECT t.*, p.name as product_name, p.sku
      FROM transactions t
      JOIN products p ON p.id = t.product_id
      WHERE t.product_id = ?
      ORDER BY t.date DESC
    `).all(productId);

    return ok(res, rows);
  } catch (err) {
    return serverError(res, err);
  }
}
