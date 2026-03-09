import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../_db';
import { ok, notFound, serverError, allowMethods } from '../../_helpers';

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'PUT') return allowMethods(res, ['PUT']);

    const db = getDb();
    const woId = Number(req.query.id);
    const { status, good_qty, reject_qty } = req.body;

    const valid = ['Pending', 'Approved', 'WIP', 'Completed'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
    }

    const wo = db.prepare(`SELECT * FROM work_orders WHERE id = ?`).get(woId) as any;
    if (!wo) return notFound(res, 'Work order not found');

    db.transaction(() => {
      if (status === 'Completed') {
        const goodQty = good_qty ?? wo.target_qty;
        const rejectQty = reject_qty ?? 0;

        // Deduct raw materials from stock
        const materials = db.prepare(
          `SELECT * FROM work_order_materials WHERE work_order_id = ?`
        ).all(woId);

        materials.forEach((mat: any) => {
          db.prepare(`UPDATE products SET stock = stock - ? WHERE id = ?`)
            .run(mat.planned_qty, mat.raw_material_id);
          const { stock } = db.prepare(`SELECT stock FROM products WHERE id = ?`).get(mat.raw_material_id) as any;
          db.prepare(`
            INSERT INTO transactions (type,product_id,quantity,date,category,notes,balance)
            VALUES ('out',?,?,datetime('now'),'Production',?,?)
          `).run(mat.raw_material_id, mat.planned_qty, wo.batch_id, stock);
        });

        // Add finished goods to stock
        db.prepare(`UPDATE products SET stock = stock + ? WHERE id = ?`)
          .run(goodQty, wo.finished_good_id);
        const { stock } = db.prepare(`SELECT stock FROM products WHERE id = ?`).get(wo.finished_good_id) as any;
        db.prepare(`
          INSERT INTO transactions (type,product_id,quantity,date,category,notes,balance)
          VALUES ('production',?,?,datetime('now'),'Production',?,?)
        `).run(wo.finished_good_id, goodQty, wo.batch_id, stock);

        db.prepare(`
          UPDATE work_orders SET status=?, good_qty=?, reject_qty=? WHERE id=?
        `).run(status, goodQty, rejectQty, woId);
      } else {
        db.prepare(`UPDATE work_orders SET status=? WHERE id=?`).run(status, woId);
      }
    })();

    return ok(res, db.prepare(`
      SELECT wo.*, p.name as product_name
      FROM work_orders wo JOIN products p ON p.id = wo.finished_good_id
      WHERE wo.id = ?
    `).get(woId));
  } catch (err) {
    return serverError(res, err);
  }
}
