import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db';
import { ok, serverError } from './_helpers';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const db = getDb();

    const totalProducts = (db.prepare(`SELECT COUNT(*) as c FROM products`).get() as any).c;
    const lowStockItems = (db.prepare(`SELECT COUNT(*) as c FROM products WHERE stock < min_stock`).get() as any).c;
    const totalSuppliers = (db.prepare(`SELECT COUNT(*) as c FROM suppliers`).get() as any).c;
    const totalCustomers = (db.prepare(`SELECT COUNT(*) as c FROM customers`).get() as any).c;

    const pendingPO = (db.prepare(
      `SELECT COUNT(*) as c FROM orders WHERE type='purchase' AND status='pending'`
    ).get() as any).c;

    const pendingWO = (db.prepare(
      `SELECT COUNT(*) as c FROM work_orders WHERE status IN ('Pending','Approved','WIP')`
    ).get() as any).c;

    const unpaidAP = (db.prepare(`
      SELECT COALESCE(SUM(oi.quantity * oi.price), 0) as total
      FROM orders o JOIN order_items oi ON oi.order_id = o.id
      WHERE o.type = 'purchase' AND o.payment_status = 'unpaid'
    `).get() as any).total;

    const unpaidAR = (db.prepare(`
      SELECT COALESCE(SUM(oi.quantity * oi.price), 0) as total
      FROM orders o JOIN order_items oi ON oi.order_id = o.id
      WHERE o.type = 'sales' AND o.payment_status = 'unpaid'
    `).get() as any).total;

    const recentTransactions = db.prepare(`
      SELECT t.*, p.name as product_name, p.sku
      FROM transactions t JOIN products p ON p.id = t.product_id
      ORDER BY t.date DESC LIMIT 10
    `).all();

    const stockSummary = db.prepare(`
      SELECT name, sku, stock, min_stock, unit,
        CASE WHEN stock < min_stock THEN 'low' ELSE 'ok' END as stock_status
      FROM products ORDER BY stock ASC LIMIT 10
    `).all();

    return ok(res, {
      stats: {
        totalProducts,
        lowStockItems,
        totalSuppliers,
        totalCustomers,
        pendingPO,
        pendingWO,
        unpaidAP,
        unpaidAR
      },
      recentTransactions,
      stockSummary
    });
  } catch (err) {
    return serverError(res, err);
  }
}
