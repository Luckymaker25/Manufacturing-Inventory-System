import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_db';
import { ok, created, serverError, allowMethods } from '../_helpers';

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') return getTransactions(res);
    if (req.method === 'POST') return addTransaction(req, res);
    return allowMethods(res, ['GET', 'POST']);
  } catch (err) {
    return serverError(res, err);
  }
}

function getTransactions(res: VercelResponse) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT t.*, p.name as product_name, p.sku
    FROM transactions t
    JOIN products p ON p.id = t.product_id
    ORDER BY t.date DESC
    LIMIT 100
  `).all();
  return ok(res, rows);
}

function addTransaction(req: VercelRequest, res: VercelResponse) {
  const db = getDb();
  const { type, product_id, quantity, category = '', notes = '' } = req.body;

  if (!type || !product_id || !quantity) {
    return res.status(400).json({ error: 'type, product_id, quantity are required' });
  }

  const result = db.transaction(() => {
    // Update stock
    if (type === 'in' || type === 'production') {
      db.prepare(`UPDATE products SET stock = stock + ? WHERE id = ?`).run(quantity, product_id);
    } else if (type === 'out') {
      db.prepare(`UPDATE products SET stock = stock - ? WHERE id = ?`).run(quantity, product_id);
    }

    const { stock } = db.prepare(`SELECT stock FROM products WHERE id = ?`).get(product_id) as any;

    const r = db.prepare(`
      INSERT INTO transactions (type, product_id, quantity, date, category, notes, balance)
      VALUES (?, ?, ?, datetime('now'), ?, ?, ?)
    `).run(type, product_id, quantity, category, notes, stock);

    return db.prepare(`
      SELECT t.*, p.name as product_name, p.sku
      FROM transactions t JOIN products p ON p.id = t.product_id
      WHERE t.id = ?
    `).get(r.lastInsertRowid);
  })();

  return created(res, result);
}
