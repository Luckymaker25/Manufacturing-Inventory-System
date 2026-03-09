import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db';
import { ok, serverError } from './_helpers';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const db = getDb();

    // Accounts Payable (purchase orders)
    const ap = db.prepare(`
      SELECT
        o.id, o.reference_number, o.date, o.due_date, o.payment_status,
        s.name as entity_name,
        SUM(oi.quantity * oi.price) as total_amount,
        CAST(julianday('now') - julianday(o.date) AS INTEGER) as days_outstanding
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN suppliers s ON s.id = o.entity_id
      WHERE o.type = 'purchase'
      GROUP BY o.id
      ORDER BY o.date DESC
    `).all();

    // Accounts Receivable (sales orders)
    const ar = db.prepare(`
      SELECT
        o.id, o.reference_number, o.date, o.due_date, o.payment_status,
        c.name as entity_name,
        SUM(oi.quantity * oi.price) as total_amount,
        CAST(julianday('now') - julianday(o.date) AS INTEGER) as days_outstanding
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN customers c ON c.id = o.entity_id
      WHERE o.type = 'sales'
      GROUP BY o.id
      ORDER BY o.date DESC
    `).all();

    // Aging buckets helper
    function agingBuckets(rows: any[]) {
      const buckets = { current: 0, days30: 0, days60: 0, days90plus: 0 };
      rows.forEach((r: any) => {
        if (r.payment_status === 'unpaid') {
          const d = r.days_outstanding || 0;
          if (d <= 30) buckets.current += r.total_amount;
          else if (d <= 60) buckets.days30 += r.total_amount;
          else if (d <= 90) buckets.days60 += r.total_amount;
          else buckets.days90plus += r.total_amount;
        }
      });
      return buckets;
    }

    const apTotal = ap.reduce((s: number, r: any) => r.payment_status === 'unpaid' ? s + r.total_amount : s, 0);
    const arTotal = ar.reduce((s: number, r: any) => r.payment_status === 'unpaid' ? s + r.total_amount : s, 0);

    return ok(res, {
      ap: { total_unpaid: apTotal, items: ap, aging: agingBuckets(ap) },
      ar: { total_unpaid: arTotal, items: ar, aging: agingBuckets(ar) }
    });
  } catch (err) {
    return serverError(res, err);
  }
}
