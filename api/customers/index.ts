import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_db';
import { ok, created, serverError, allowMethods } from '../_helpers';

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') return getProducts(req, res);
    if (req.method === 'POST') return addProduct(req, res);
    return allowMethods(res, ['GET', 'POST']);
  } catch (err) {
    return serverError(res, err);
  }
}

function getProducts(_req: VercelRequest, res: VercelResponse) {
  const db = getDb();

  const products = db.prepare(`SELECT * FROM products ORDER BY type, name`).all();

  const withSuppliers = products.map((p: any) => {
    const suppliers = db.prepare(`
      SELECT s.id, s.name, s.contact, s.email, s.address
      FROM suppliers s
      JOIN product_suppliers ps ON ps.supplier_id = s.id
      WHERE ps.product_id = ?
    `).all(p.id);
    return { ...p, suppliers };
  });

  return ok(res, withSuppliers);
}

function addProduct(req: VercelRequest, res: VercelResponse) {
  const db = getDb();
  const { name, sku, type, stock = 0, unit = 'pcs', min_stock = 0, cost_price = 0, supplier_ids = [], bom = [] } = req.body;

  if (!name || !sku || !type) {
    return res.status(400).json({ error: 'name, sku, type are required' });
  }

  const insert = db.prepare(`
    INSERT INTO products (name, sku, type, stock, unit, min_stock, cost_price)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = db.transaction(() => {
    const r = insert.run(name, sku, type, stock, unit, min_stock, cost_price);
    const productId = r.lastInsertRowid;

    if (type === 'raw' && supplier_ids.length > 0) {
      const linkSupplier = db.prepare(`INSERT OR IGNORE INTO product_suppliers VALUES (?, ?)`);
      supplier_ids.forEach((sid: number) => linkSupplier.run(productId, sid));
    }

    if (type === 'finished' && bom.length > 0) {
      const insertBom = db.prepare(`INSERT INTO bom (finished_good_id, raw_material_id, quantity) VALUES (?, ?, ?)`);
      bom.forEach((item: { raw_material_id: number; quantity: number }) => {
        insertBom.run(productId, item.raw_material_id, item.quantity);
      });
    }

    return db.prepare(`SELECT * FROM products WHERE id = ?`).get(productId);
  })();

  return created(res, result);
}
