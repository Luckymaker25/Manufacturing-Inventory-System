import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../_db';
import { ok, notFound, serverError } from '../../_helpers';

// POST /api/orders/[id]/receive
export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const db = getDb();
    const orderId = Number(req.query.id);
    const { items = [] } = req.body;

    const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(orderId) as any;
    if (!order) return notFound(res, 'Order not found');

    db.transaction(() => {
      // Update stock for each received item
      const receivedItems = items.length > 0 ? items : db.prepare(
        `SELECT oi.product_id, oi.quantity, oi.price FROM order_items oi WHERE oi.order_id = ?`
      ).all(orderId);

      receivedItems.forEach((item: { product_id: number; quantity: number; price?: number }) => {
        db.prepare(`UPDATE products SET stock = stock + ? WHERE id = ?`).run(item.quantity, item.product_id);
        const { stock } = db.prepare(`SELECT stock FROM products WHERE id = ?`).get(item.product_id) as any;
        db.prepare(`
          INSERT INTO transactions (type,product_id,quantity,date,category,notes,balance)
          VALUES ('in',?,?,datetime('now'),'Purchase',?,?)
        `).run(item.product_id, item.quantity, order.reference_number, stock);
      });

      db.prepare(`UPDATE orders SET status = 'completed' WHERE id = ?`).run(orderId);
    })();

    return ok(res, { success: true });
  } catch (err) {
    return serverError(res, err);
  }
}
