import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_db';
import { ok, notFound, serverError, allowMethods } from '../_helpers';

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { id } = req.query;
    const productId = Number(id);

    if (req.method === 'GET') return getProduct(productId, res);
    if (req.method === 'PUT') return updateProduct(productId, req, res);
    return allowMethods(res, ['GET', 'PUT']);
  } catch (err) {
    return serverError(res, err);
  }
}

function getProduct(id: number, res: VercelResponse) {
  const db = getDb();
  const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(id);
  if (!product) return notFound(res, 'Product not found');

  const suppliers = db.prepare(`
    SELECT s.* FROM suppliers s
    JOIN product_suppliers ps ON ps.supplier_id = s.id
    WHERE ps.product_id = ?
  `).all(id);

  return ok(res, { ...(product as object), suppliers });
}

function updateProduct(id: number, req: VercelRequest, res: VercelResponse) {
  const db = getDb();
  const existing = db.prepare(`SELECT * FROM products WHERE id = ?`).get(id);
  if (!existing) return notFound(res, 'Product not found');

  const { name, sku, type, stock, unit, min_stock, cost_price, supplier_ids = [], bom = [] } = req.body;

  db.transaction(() => {
    db.prepare(`
      UPDATE products SET name=?, sku=?, type=?, stock=?, unit=?, min_stock=?, cost_price=?
      WHERE id=?
    `).run(name, sku, type, stock, unit, min_stock, cost_price, id);

    // Update supplier links
    db.prepare(`DELETE FROM product_suppliers WHERE product_id = ?`).run(id);
    if (type === 'raw' && supplier_ids.length > 0) {
      const link = db.prepare(`INSERT OR IGNORE INTO product_suppliers VALUES (?, ?)`);
      supplier_ids.forEach((sid: number) => link.run(id, sid));
    }

    // Update BOM
    db.prepare(`DELETE FROM bom WHERE finished_good_id = ?`).run(id);
    if (type === 'finished' && bom.length > 0) {
      const insertBom = db.prepare(`INSERT INTO bom (finished_good_id, raw_material_id, quantity) VALUES (?, ?, ?)`);
      bom.forEach((item: { raw_material_id: number; quantity: number }) => {
        insertBom.run(id, item.raw_material_id, item.quantity);
      });
    }
  })();

  return ok(res, db.prepare(`SELECT * FROM products WHERE id = ?`).get(id));
}
