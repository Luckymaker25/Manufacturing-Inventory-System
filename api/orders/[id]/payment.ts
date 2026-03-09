import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../_db';
import { ok, notFound, serverError, allowMethods } from '../../_helpers';

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'PUT') return allowMethods(res, ['PUT']);

    const db = getDb();
    const orderId = Number(req.query.id);
    const { status } = req.body;

    if (!['paid', 'unpaid'].includes(status)) {
      return res.status(400).json({ error: 'status must be paid or unpaid' });
    }

    const order = db.prepare(`SELECT id FROM orders WHERE id = ?`).get(orderId);
    if (!order) return notFound(res, 'Order not found');

    db.prepare(`UPDATE orders SET payment_status = ? WHERE id = ?`).run(status, orderId);
    return ok(res, { success: true, payment_status: status });
  } catch (err) {
    return serverError(res, err);
  }
}
