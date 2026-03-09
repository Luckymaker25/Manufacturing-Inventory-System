import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Vercel writable dir — hanya /tmp yang bisa ditulis saat runtime
const DB_PATH = process.env.NODE_ENV === 'production'
  ? '/tmp/manufacture.db'
  : path.join(process.cwd(), 'manufacture.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  initSchema(_db);
  seedIfEmpty(_db);

  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact TEXT DEFAULT '',
      email TEXT DEFAULT '',
      address TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact TEXT DEFAULT '',
      email TEXT DEFAULT '',
      address TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK(type IN ('raw','finished')),
      stock REAL DEFAULT 0,
      unit TEXT DEFAULT 'pcs',
      min_stock REAL DEFAULT 0,
      cost_price REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS product_suppliers (
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
      PRIMARY KEY (product_id, supplier_id)
    );

    CREATE TABLE IF NOT EXISTS bom (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      finished_good_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      raw_material_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity REAL NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('in','out','production')),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity REAL NOT NULL,
      date TEXT NOT NULL DEFAULT (datetime('now')),
      category TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      balance REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('purchase','sales')),
      entity_id INTEGER NOT NULL,
      reference_number TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL DEFAULT (datetime('now')),
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed')),
      payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('paid','unpaid')),
      notes TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity REAL NOT NULL,
      price REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS work_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT NOT NULL UNIQUE,
      source_type TEXT NOT NULL CHECK(source_type IN ('Sales','Restock')),
      reference_no TEXT NOT NULL,
      finished_good_id INTEGER NOT NULL REFERENCES products(id),
      target_qty REAL NOT NULL,
      good_qty REAL DEFAULT 0,
      reject_qty REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending','Approved','WIP','Completed')),
      date TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS work_order_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
      raw_material_id INTEGER NOT NULL REFERENCES products(id),
      planned_qty REAL NOT NULL,
      actual_qty REAL
    );

    CREATE TABLE IF NOT EXISTS purchase_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      requested_qty REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','ordered')),
      notes TEXT DEFAULT '',
      request_date TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      company_name TEXT DEFAULT 'ManufactureOS',
      address TEXT DEFAULT 'Jl. Industri No. 1',
      email TEXT DEFAULT 'info@company.com',
      phone TEXT DEFAULT '+62 21 0000000',
      logo_url TEXT DEFAULT '',
      currency TEXT DEFAULT 'Rp'
    );
  `);
}

function seedIfEmpty(db: Database.Database) {
  const count = (db.prepare('SELECT COUNT(*) as c FROM products').get() as any).c;
  if (count > 0) return;

  // Settings
  db.prepare(`INSERT OR IGNORE INTO settings (id, company_name, address, email, phone, currency)
    VALUES (1, 'ManufactureOS', 'Jl. Industri No. 1, Jakarta', 'info@manufacture.com', '+62 21 0000000', 'Rp')`).run();

  // Suppliers
  const s1 = db.prepare(`INSERT INTO suppliers (name,contact,email,address) VALUES (?,?,?,?)`).run('PT Baja Nusantara','Budi Santoso','budi@baja.co.id','Jl. Industri No. 12, Bekasi');
  const s2 = db.prepare(`INSERT INTO suppliers (name,contact,email,address) VALUES (?,?,?,?)`).run('CV Logam Jaya','Siti Rahayu','siti@logam.com','Jl. Raya Bogor KM 25, Cibinong');

  // Customers
  db.prepare(`INSERT INTO customers (name,contact,email,address) VALUES (?,?,?,?)`).run('PT Maju Bersama','Dewi Lestari','dewi@majubersama.com','Jl. Sudirman No. 45, Jakarta');
  db.prepare(`INSERT INTO customers (name,contact,email,address) VALUES (?,?,?,?)`).run('CV Karya Mandiri','Hendra Wijaya','hendra@karya.co.id','Jl. Gatot Subroto No. 8, Bandung');

  // Products
  const p1 = db.prepare(`INSERT INTO products (name,sku,type,stock,unit,min_stock,cost_price) VALUES (?,?,?,?,?,?,?)`).run('Steel Rod 10mm','RM-001','raw',450,'kg',100,12000);
  const p2 = db.prepare(`INSERT INTO products (name,sku,type,stock,unit,min_stock,cost_price) VALUES (?,?,?,?,?,?,?)`).run('Aluminum Sheet','RM-002','raw',80,'sheet',100,35000);
  const p3 = db.prepare(`INSERT INTO products (name,sku,type,stock,unit,min_stock,cost_price) VALUES (?,?,?,?,?,?,?)`).run('Rubber Seal','RM-003','raw',25,'pcs',200,5000);
  const p4 = db.prepare(`INSERT INTO products (name,sku,type,stock,unit,min_stock,cost_price) VALUES (?,?,?,?,?,?,?)`).run('Valve Assembly A','FG-001','finished',120,'pcs',50,180000);
  const p5 = db.prepare(`INSERT INTO products (name,sku,type,stock,unit,min_stock,cost_price) VALUES (?,?,?,?,?,?,?)`).run('Pipe Connector B','FG-002','finished',35,'pcs',40,95000);
  const p6 = db.prepare(`INSERT INTO products (name,sku,type,stock,unit,min_stock,cost_price) VALUES (?,?,?,?,?,?,?)`).run('Hydraulic Pump C','FG-003','finished',8,'unit',20,450000);

  // Product-Supplier links
  db.prepare(`INSERT INTO product_suppliers VALUES (?,?)`).run(p1.lastInsertRowid, s1.lastInsertRowid);
  db.prepare(`INSERT INTO product_suppliers VALUES (?,?)`).run(p2.lastInsertRowid, s2.lastInsertRowid);
  db.prepare(`INSERT INTO product_suppliers VALUES (?,?)`).run(p3.lastInsertRowid, s1.lastInsertRowid);

  // BOM
  db.prepare(`INSERT INTO bom (finished_good_id,raw_material_id,quantity) VALUES (?,?,?)`).run(p4.lastInsertRowid, p1.lastInsertRowid, 2.5);
  db.prepare(`INSERT INTO bom (finished_good_id,raw_material_id,quantity) VALUES (?,?,?)`).run(p4.lastInsertRowid, p3.lastInsertRowid, 4);
  db.prepare(`INSERT INTO bom (finished_good_id,raw_material_id,quantity) VALUES (?,?,?)`).run(p5.lastInsertRowid, p2.lastInsertRowid, 1);
  db.prepare(`INSERT INTO bom (finished_good_id,raw_material_id,quantity) VALUES (?,?,?)`).run(p6.lastInsertRowid, p1.lastInsertRowid, 5);
  db.prepare(`INSERT INTO bom (finished_good_id,raw_material_id,quantity) VALUES (?,?,?)`).run(p6.lastInsertRowid, p2.lastInsertRowid, 2);
  db.prepare(`INSERT INTO bom (finished_good_id,raw_material_id,quantity) VALUES (?,?,?)`).run(p6.lastInsertRowid, p3.lastInsertRowid, 8);

  // Sample transactions
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO transactions (type,product_id,quantity,date,category,notes,balance) VALUES ('in',?,200,?,'Purchase','PO-2026-001',650)`).run(p1.lastInsertRowid, now);
  db.prepare(`INSERT INTO transactions (type,product_id,quantity,date,category,notes,balance) VALUES ('out',?,50,?,'Sales','INV-2026-045',120)`).run(p4.lastInsertRowid, now);
}
