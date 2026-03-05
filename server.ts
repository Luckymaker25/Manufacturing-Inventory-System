import { Database } from 'better-sqlite3';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import DatabaseConstructor from 'better-sqlite3';

// Initialize Database
const db = new DatabaseConstructor('inventory.db');

// Create Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('raw', 'finished')),
    stock INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'pcs',
    min_stock INTEGER DEFAULT 10
  );

  CREATE TABLE IF NOT EXISTS bom (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    finished_good_id INTEGER NOT NULL,
    raw_material_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY(finished_good_id) REFERENCES products(id),
    FOREIGN KEY(raw_material_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('in', 'out', 'production')),
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price INTEGER DEFAULT 0,
    category TEXT,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT,
    email TEXT,
    address TEXT
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT,
    email TEXT,
    address TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('purchase', 'sales')),
    entity_id INTEGER, -- supplier_id or customer_id
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    reference_number TEXT,
    status TEXT DEFAULT 'completed'
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS product_suppliers (
    product_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
    PRIMARY KEY(product_id, supplier_id)
  );

  CREATE TABLE IF NOT EXISTS production_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    finished_good_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    destination TEXT NOT NULL CHECK(destination IN ('sales', 'stock')),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY(finished_good_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS work_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT UNIQUE NOT NULL,
    source_type TEXT NOT NULL CHECK(source_type IN ('Sales', 'Restock')),
    reference_no TEXT NOT NULL,
    finished_good_id INTEGER NOT NULL,
    target_qty INTEGER NOT NULL,
    good_qty INTEGER DEFAULT 0,
    reject_qty INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'WIP', 'Completed')),
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(finished_good_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS work_order_materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_order_id INTEGER NOT NULL,
    raw_material_id INTEGER NOT NULL,
    planned_qty REAL NOT NULL,
    actual_qty REAL,
    FOREIGN KEY(work_order_id) REFERENCES work_orders(id),
    FOREIGN KEY(raw_material_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    company_name TEXT DEFAULT 'My Company',
    address TEXT DEFAULT '123 Business Rd, City',
    email TEXT DEFAULT 'contact@company.com',
    phone TEXT DEFAULT '+1 234 567 890',
    logo_url TEXT,
    currency TEXT DEFAULT 'USD'
  );

  CREATE TABLE IF NOT EXISTS purchase_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    requested_qty INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'ordered')),
    notes TEXT,
    request_date TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES products(id)
  );
`);

// Migration: Ensure 'Approved' is in work_orders status constraint
try {
  const tableSql = db.prepare("SELECT sql FROM sqlite_master WHERE name='work_orders'").get() as any;
  if (tableSql && tableSql.sql && !tableSql.sql.includes("'Approved'")) {
    console.log("Migrating work_orders table to include 'Approved' status...");
    db.transaction(() => {
      // 1. Create temp table with new schema
      db.exec(`
        CREATE TABLE work_orders_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          batch_id TEXT UNIQUE NOT NULL,
          source_type TEXT NOT NULL CHECK(source_type IN ('Sales', 'Restock')),
          reference_no TEXT NOT NULL,
          finished_good_id INTEGER NOT NULL,
          target_qty INTEGER NOT NULL,
          good_qty INTEGER DEFAULT 0,
          reject_qty INTEGER DEFAULT 0,
          status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'WIP', 'Completed')),
          date TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(finished_good_id) REFERENCES products(id)
        );
      `);
      // 2. Copy data
      db.exec(`INSERT INTO work_orders_new SELECT * FROM work_orders;`);
      // 3. Drop old table
      db.exec(`DROP TABLE work_orders;`);
      // 4. Rename new table
      db.exec(`ALTER TABLE work_orders_new RENAME TO work_orders;`);
    })();
    console.log("Migration successful.");
  }
} catch (err) {
  console.error("Migration failed:", err);
}

// Migration: Add fulfillment_status to order_items
try {
  db.prepare("ALTER TABLE order_items ADD COLUMN fulfillment_status TEXT DEFAULT 'pending'").run();
} catch (err) {
  // Ignore if column exists
}

// Seed Data if empty
const count = db.prepare('SELECT count(*) as count FROM products').get() as { count: number };
if (count.count === 0) {
  const insertProduct = db.prepare('INSERT INTO products (name, sku, type, stock, unit) VALUES (?, ?, ?, ?, ?)');
  
  // Raw Materials
  insertProduct.run('Wood Plank', 'RM-001', 'raw', 100, 'pcs');
  insertProduct.run('Varnish', 'RM-002', 'raw', 50, 'liters');
  insertProduct.run('Nails', 'RM-003', 'raw', 5000, 'pcs');
  
  // Finished Goods
  insertProduct.run('Wooden Chair', 'FG-001', 'finished', 5, 'pcs');
  insertProduct.run('Wooden Table', 'FG-002', 'finished', 2, 'pcs');

  // BOM for Chair (1 Chair = 2 Planks + 0.1 Varnish + 10 Nails)
  const chairId = db.prepare("SELECT id FROM products WHERE sku = 'FG-001'").get() as { id: number };
  const plankId = db.prepare("SELECT id FROM products WHERE sku = 'RM-001'").get() as { id: number };
  const varnishId = db.prepare("SELECT id FROM products WHERE sku = 'RM-002'").get() as { id: number };
  const nailsId = db.prepare("SELECT id FROM products WHERE sku = 'RM-003'").get() as { id: number };

  const insertBom = db.prepare('INSERT INTO bom (finished_good_id, raw_material_id, quantity) VALUES (?, ?, ?)');
  insertBom.run(chairId.id, plankId.id, 2);
  insertBom.run(chairId.id, varnishId.id, 1); // Simplified integer for demo
  insertBom.run(chairId.id, nailsId.id, 10);

  // Seed Suppliers
  const insertSupplier = db.prepare('INSERT INTO suppliers (name, contact, email, address) VALUES (?, ?, ?, ?)');
  insertSupplier.run('WoodCo Ltd', 'John Wood', 'john@woodco.com', '123 Forest Rd, Timberland');
  insertSupplier.run('ChemSupply Inc', 'Sarah Chem', 'sarah@chemsupply.com', '456 Chemical Ln, Science City');
  insertSupplier.run('Hardware Pro', 'Mike Tools', 'mike@hardwarepro.com', '789 Metal St, Steelton');

  const woodCoId = db.prepare("SELECT id FROM suppliers WHERE name = 'WoodCo Ltd'").get() as { id: number };
  const chemSupplyId = db.prepare("SELECT id FROM suppliers WHERE name = 'ChemSupply Inc'").get() as { id: number };
  const hardwareProId = db.prepare("SELECT id FROM suppliers WHERE name = 'Hardware Pro'").get() as { id: number };

  const insertProdSup = db.prepare('INSERT INTO product_suppliers (product_id, supplier_id) VALUES (?, ?)');
  insertProdSup.run(plankId.id, woodCoId.id);
  insertProdSup.run(varnishId.id, chemSupplyId.id);
  insertProdSup.run(nailsId.id, hardwareProId.id);

  // Seed Customers
  const insertCustomer = db.prepare('INSERT INTO customers (name, contact, email, address) VALUES (?, ?, ?, ?)');
  insertCustomer.run('Furniture Mart', 'Alice Buyer', 'alice@furnituremart.com', '101 Retail Blvd, Shopville');
  insertCustomer.run('Home Depot', 'Bob Manager', 'bob@homedepot.com', '202 DIY Ave, Buildtown');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Add columns if they don't exist (Migration logic)
  try {
    db.prepare('ALTER TABLE products ADD COLUMN cost_price INTEGER DEFAULT 0').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE transactions ADD COLUMN price INTEGER DEFAULT 0').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE transactions ADD COLUMN category TEXT').run();
  } catch (e) {}
  try {
    db.prepare('ALTER TABLE order_items ADD COLUMN price INTEGER DEFAULT 0').run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'unpaid'").run();
  } catch (e) {}
  try {
    db.prepare("ALTER TABLE orders ADD COLUMN due_date TEXT").run();
  } catch (e) {}

  // Ensure tables exist (Migration safety)
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('purchase', 'sales')),
      entity_id INTEGER,
      date TEXT DEFAULT CURRENT_TIMESTAMP,
      reference_number TEXT,
      status TEXT DEFAULT 'completed',
      payment_status TEXT DEFAULT 'unpaid',
      due_date TEXT
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price INTEGER DEFAULT 0,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    );
  `);

  // API Routes
  
  // Fulfill Sales Order from Stock
  app.post('/api/sales/:id/fulfill-from-stock', (req, res) => {
    const { id } = req.params;
    const { product_id, quantity } = req.body;

    const fulfill = db.transaction(() => {
      const order = db.prepare('SELECT * FROM orders WHERE id = ? AND type = "sales"').get(id) as any;
      if (!order) throw new Error('Sales order not found');
      if (order.status === 'completed') throw new Error('Order already fulfilled');

      const product = db.prepare('SELECT stock, name FROM products WHERE id = ?').get(product_id) as any;
      if (!product) throw new Error('Product not found');
      if (product.stock < quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Required: ${quantity}, Available: ${product.stock}`);
      }

      // 1. Deduct Stock
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(quantity, product_id);

      // 2. Log Transaction
      db.prepare(`
        INSERT INTO transactions (type, product_id, quantity, price, category, notes) 
        VALUES ('out', ?, ?, 0, 'Sales', ?)
      `).run(product_id, quantity, `Direct Fulfillment for Order #${order.reference_number}`);

      // 3. Mark Order as Completed
      db.prepare("UPDATE orders SET status = 'completed' WHERE id = ?").run(id);

      return { success: true };
    });

    try {
      const result = fulfill();
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Approve Work Order
  app.put('/api/work-orders/:id/approve', (req, res) => {
    const { id } = req.params;
    try {
      const wo = db.prepare('SELECT status FROM work_orders WHERE id = ?').get(id) as any;
      if (!wo) return res.status(404).json({ error: 'Work order not found' });
      if (wo.status !== 'Pending') return res.status(400).json({ error: 'Only Pending work orders can be approved' });

      db.prepare("UPDATE work_orders SET status = 'Approved' WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get all products
  app.get('/api/products', (req, res) => {
    const products = db.prepare('SELECT * FROM products').all() as any[];
    // Enrich with suppliers
    const enrichedProducts = products.map(p => {
      const suppliers = db.prepare(`
        SELECT s.* FROM suppliers s
        JOIN product_suppliers ps ON s.id = ps.supplier_id
        WHERE ps.product_id = ?
      `).all(p.id);
      return { ...p, suppliers };
    });
    res.json(enrichedProducts);
  });

  // Get single product
  app.get('/api/products/:id', (req, res) => {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as any;
    if (product) {
      const suppliers = db.prepare(`
        SELECT s.* FROM suppliers s
        JOIN product_suppliers ps ON s.id = ps.supplier_id
        WHERE ps.product_id = ?
      `).all(product.id);
      product.suppliers = suppliers;
    }
    res.json(product);
  });

  // Add product
  app.post('/api/products', (req, res) => {
    const { name, sku, type, stock, unit, min_stock, cost_price, supplier_ids, bom } = req.body;
    
    const createProduct = db.transaction(() => {
      const stmt = db.prepare('INSERT INTO products (name, sku, type, stock, unit, min_stock, cost_price) VALUES (?, ?, ?, ?, ?, ?, ?)');
      const info = stmt.run(name, sku, type, stock || 0, unit, min_stock || 10, cost_price || 0);
      const productId = info.lastInsertRowid;

      if (type === 'raw' && supplier_ids && Array.isArray(supplier_ids)) {
        const insertSup = db.prepare('INSERT INTO product_suppliers (product_id, supplier_id) VALUES (?, ?)');
        for (const supId of supplier_ids) {
          insertSup.run(productId, supId);
        }
      }

      if (type === 'finished' && bom && Array.isArray(bom)) {
        const insertBom = db.prepare('INSERT INTO bom (finished_good_id, raw_material_id, quantity) VALUES (?, ?, ?)');
        for (const item of bom) {
          insertBom.run(productId, item.raw_material_id, item.quantity);
        }
      }
      
      return productId;
    });

    try {
      const id = createProduct();
      res.json({ id });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update product
  app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const { name, sku, type, stock, unit, min_stock, cost_price, supplier_ids, bom } = req.body;

    const updateProduct = db.transaction(() => {
      // Update basic info
      db.prepare('UPDATE products SET name = ?, sku = ?, type = ?, stock = ?, unit = ?, min_stock = ?, cost_price = ? WHERE id = ?')
        .run(name, sku, type, stock, unit, min_stock, cost_price, id);

      // Update Suppliers (Delete all and re-insert)
      db.prepare('DELETE FROM product_suppliers WHERE product_id = ?').run(id);
      if (type === 'raw' && supplier_ids && Array.isArray(supplier_ids)) {
        const insertSup = db.prepare('INSERT INTO product_suppliers (product_id, supplier_id) VALUES (?, ?)');
        for (const supId of supplier_ids) {
          insertSup.run(id, supId);
        }
      }

      // Update BOM (Delete all and re-insert)
      db.prepare('DELETE FROM bom WHERE finished_good_id = ?').run(id);
      if (type === 'finished' && bom && Array.isArray(bom)) {
        const insertBom = db.prepare('INSERT INTO bom (finished_good_id, raw_material_id, quantity) VALUES (?, ?, ?)');
        for (const item of bom) {
          insertBom.run(id, item.raw_material_id, item.quantity);
        }
      }
    });

    try {
      updateProduct();
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Suppliers API
  app.get('/api/suppliers', (req, res) => {
    const suppliers = db.prepare('SELECT * FROM suppliers').all() as any[];
    // Enrich with products count or list if needed
    const enriched = suppliers.map(s => {
      const products = db.prepare(`
        SELECT p.* FROM products p
        JOIN product_suppliers ps ON p.id = ps.product_id
        WHERE ps.supplier_id = ?
      `).all(s.id);
      return { ...s, products };
    });
    res.json(enriched);
  });

  // Get Supplier Transactions
  app.get('/api/suppliers/:id/transactions', (req, res) => {
    const { id } = req.params;
    console.log(`Fetching transactions for supplier ${id}`);
    try {
      const transactions = db.prepare(`
        SELECT 
          o.reference_number as po_number,
          o.date,
          p.name as product_name,
          oi.quantity,
          oi.price,
          (oi.quantity * oi.price) as total
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE o.type = 'purchase' AND o.entity_id = ?
        ORDER BY o.date DESC
      `).all(id);
      console.log(`Found ${transactions.length} transactions`);
      res.json(transactions);
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/suppliers', (req, res) => {
    const { name, contact, email, address } = req.body;
    try {
      const stmt = db.prepare('INSERT INTO suppliers (name, contact, email, address) VALUES (?, ?, ?, ?)');
      const info = stmt.run(name, contact, email, address);
      res.json({ id: info.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/suppliers/:id', (req, res) => {
    const { id } = req.params;
    const { name, contact, email, address } = req.body;
    try {
      const stmt = db.prepare('UPDATE suppliers SET name = ?, contact = ?, email = ?, address = ? WHERE id = ?');
      stmt.run(name, contact, email, address, id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Customers API
  app.get('/api/customers', (req, res) => {
    const customers = db.prepare('SELECT * FROM customers').all();
    res.json(customers);
  });

  app.post('/api/customers', (req, res) => {
    const { name, contact, email, address } = req.body;
    try {
      const stmt = db.prepare('INSERT INTO customers (name, contact, email, address) VALUES (?, ?, ?, ?)');
      const info = stmt.run(name, contact, email, address);
      res.json({ id: info.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/customers/:id', (req, res) => {
    const { id } = req.params;
    const { name, contact, email, address } = req.body;
    try {
      const stmt = db.prepare('UPDATE customers SET name = ?, contact = ?, email = ?, address = ? WHERE id = ?');
      stmt.run(name, contact, email, address, id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get Customer Transactions
  app.get('/api/customers/:id/transactions', (req, res) => {
    const { id } = req.params;
    console.log(`Fetching transactions for customer ${id}`);
    try {
      const transactions = db.prepare(`
        SELECT 
          o.reference_number as po_number,
          o.date,
          p.name as product_name,
          oi.quantity,
          oi.price,
          (oi.quantity * oi.price) as total
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        WHERE o.type = 'sales' AND o.entity_id = ?
        ORDER BY o.date DESC
      `).all(id);
      res.json(transactions);
    } catch (err: any) {
      console.error('Error fetching customer transactions:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Orders (Bulk Transactions)
  app.get('/api/orders', (req, res) => {
    const { status, type } = req.query;
    let query = `
      SELECT o.*, 
             COALESCE(s.name, c.name) as supplier_name 
      FROM orders o
      LEFT JOIN suppliers s ON o.type = 'purchase' AND o.entity_id = s.id
      LEFT JOIN customers c ON o.type = 'sales' AND o.entity_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }
    if (type) {
      query += ' AND o.type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY o.date DESC';
    
    const orders = db.prepare(query).all(...params) as any[];
    
    // Enrich with items
    const enriched = orders.map(o => {
      const items = db.prepare(`
        SELECT oi.*, p.name as product_name, p.sku, p.unit 
        FROM order_items oi 
        JOIN products p ON oi.product_id = p.id 
        WHERE oi.order_id = ?
      `).all(o.id);
      return { ...o, items };
    });
    
    res.json(enriched);
  });

  app.post('/api/orders', (req, res) => {
    const { type, entity_id, items, notes, status = 'completed', due_date } = req.body; // items: [{ product_id, quantity, price }]
    
    const createOrder = db.transaction(() => {
      // 1. Create Order
      const orderStmt = db.prepare('INSERT INTO orders (type, entity_id, reference_number, status, due_date) VALUES (?, ?, ?, ?, ?)');
      const refPrefix = type === 'purchase' ? 'PO' : 'INV';
      const ref = `${refPrefix}-${Date.now().toString().slice(-6)}`;
      const orderInfo = orderStmt.run(type, entity_id, ref, status, due_date);
      const orderId = orderInfo.lastInsertRowid;

      // 2. Process Items
      const itemStmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
      
      for (const item of items) {
        itemStmt.run(orderId, item.product_id, item.quantity, item.price || 0);
      }

      // 3. If status is completed, update stock and log transactions immediately
      if (status === 'completed') {
        const transStmt = db.prepare('INSERT INTO transactions (type, product_id, quantity, price, category, notes) VALUES (?, ?, ?, ?, ?, ?)');
        const stockStmt = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
        const costStmt = db.prepare('UPDATE products SET cost_price = ? WHERE id = ?');

        for (const item of items) {
          // Log Transaction
          const transType = type === 'purchase' ? 'in' : 'out';
          const category = type === 'purchase' ? 'Purchase' : 'Sales';
          transStmt.run(transType, item.product_id, item.quantity, item.price || 0, category, `Order #${ref} - ${notes || ''}`);

          // Update Stock & HPP
          const product = db.prepare('SELECT stock, cost_price FROM products WHERE id = ?').get(item.product_id) as any;
          
          if (type === 'purchase') {
            // Calculate Moving Average Cost (HPP)
            const currentStock = product.stock;
            const currentCost = product.cost_price || 0;
            const newQty = item.quantity;
            const newPrice = item.price || 0;

            const totalValue = (currentStock * currentCost) + (newQty * newPrice);
            const totalQty = currentStock + newQty;
            
            let newCost = currentCost;
            if (totalQty > 0) {
              newCost = totalValue / totalQty;
            }

            costStmt.run(newCost, item.product_id);
            stockStmt.run(newQty, item.product_id);
          } else {
            // Sales - just reduce stock
            stockStmt.run(-item.quantity, item.product_id);
          }
        }
      }

      return { orderId, ref };
    });

    try {
      const result = createOrder();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/orders/:id/payment', (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'paid' or 'unpaid'
    
    try {
      db.prepare('UPDATE orders SET payment_status = ? WHERE id = ?').run(status, id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/orders/:id/receive', (req, res) => {
    const { id } = req.params;
    const { items } = req.body; // Optional: actual received items if different

    const receiveOrder = db.transaction(() => {
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
      if (!order) throw new Error('Order not found');
      if (order.status === 'completed') throw new Error('Order already received');

      // Update Order Status
      db.prepare("UPDATE orders SET status = 'completed' WHERE id = ?").run(id);

      // Get original items if not provided
      const orderItems = items || db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);

      const transStmt = db.prepare('INSERT INTO transactions (type, product_id, quantity, price, category, notes) VALUES (?, ?, ?, ?, ?, ?)');
      const stockStmt = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
      const costStmt = db.prepare('UPDATE products SET cost_price = ? WHERE id = ?');

      for (const item of orderItems) {
        // If items were passed in (actual received), update the order_item record too? 
        // For simplicity, we assume the passed items match the structure or we just use the stored ones if exact match.
        // If partial receipt is allowed, logic gets complex. Let's assume full receipt or update of quantity.
        
        if (items) {
           // Update the stored quantity if it changed
           db.prepare('UPDATE order_items SET quantity = ? WHERE order_id = ? AND product_id = ?')
             .run(item.quantity, id, item.product_id);
        }

        // Log Transaction
        transStmt.run('in', item.product_id, item.quantity, item.price || 0, 'Purchase', `PO Receive #${order.reference_number}`);

        // Update Stock & HPP
        const product = db.prepare('SELECT stock, cost_price FROM products WHERE id = ?').get(item.product_id) as any;
        
        const currentStock = product.stock;
        const currentCost = product.cost_price || 0;
        const newQty = item.quantity;
        const newPrice = item.price || 0;

        const totalValue = (currentStock * currentCost) + (newQty * newPrice);
        const totalQty = currentStock + newQty;
        
        let newCost = currentCost;
        if (totalQty > 0) {
          newCost = totalValue / totalQty;
        }

        costStmt.run(newCost, item.product_id);
        stockStmt.run(newQty, item.product_id);
      }
    });

    try {
      receiveOrder();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  // Get Transactions
  app.get('/api/transactions', (req, res) => {
    const transactions = db.prepare(`
      SELECT 
        t.*, 
        p.name as product_name, 
        p.sku,
        SUM(CASE WHEN t.type IN ('in', 'production') THEN t.quantity ELSE -t.quantity END) 
          OVER (PARTITION BY t.product_id ORDER BY t.date ASC, t.id ASC) as balance
      FROM transactions t 
      JOIN products p ON t.product_id = p.id 
      ORDER BY t.date DESC
    `).all();
    res.json(transactions);
  });

  // Get Transactions for a specific product
  app.get('/api/products/:id/transactions', (req, res) => {
    const transactions = db.prepare(`
      SELECT 
        t.*, 
        p.name as product_name, 
        p.sku,
        SUM(CASE WHEN t.type IN ('in', 'production') THEN t.quantity ELSE -t.quantity END) 
          OVER (PARTITION BY t.product_id ORDER BY t.date ASC, t.id ASC) as balance
      FROM transactions t 
      JOIN products p ON t.product_id = p.id 
      WHERE t.product_id = ?
      ORDER BY t.date DESC
    `).all(req.params.id);
    res.json(transactions);
  });

  // Stock In/Out
  app.post('/api/transactions', (req, res) => {
    const { type, product_id, quantity, category, notes, price = 0 } = req.body;
    
    const updateStock = db.transaction(() => {
      // Record transaction
      db.prepare('INSERT INTO transactions (type, product_id, quantity, price, category, notes) VALUES (?, ?, ?, ?, ?, ?)')
        .run(type, product_id, quantity, price, category || 'Manual', notes);
      
      // Update stock
      const adjustment = type === 'in' ? quantity : -quantity;
      db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(adjustment, product_id);
    });

    try {
      updateStock();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Production (Manufacturing)
  app.get('/api/production/orders', (req, res) => {
    const orders = db.prepare(`
      SELECT po.*, p.name as product_name, p.sku, p.unit
      FROM production_orders po
      JOIN products p ON po.finished_good_id = p.id
      ORDER BY po.date DESC
    `).all();
    res.json(orders);
  });

  app.post('/api/production/orders', (req, res) => {
    const { finished_good_id, quantity, destination, notes } = req.body;
    try {
      const stmt = db.prepare('INSERT INTO production_orders (finished_good_id, quantity, destination, notes) VALUES (?, ?, ?, ?)');
      const info = stmt.run(finished_good_id, quantity, destination, notes);
      res.json({ id: info.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/production/orders/:id/approve', (req, res) => {
    const { id } = req.params;

    const approve = db.transaction(() => {
      const order = db.prepare('SELECT * FROM production_orders WHERE id = ?').get(id) as any;
      if (!order) throw new Error('Production order not found');
      if (order.status !== 'pending') throw new Error('Order is not pending');

      const { finished_good_id, quantity, notes, destination } = order;

      // 1. Check BOM
      const bomItems = db.prepare('SELECT * FROM bom WHERE finished_good_id = ?').all(finished_good_id) as any[];
      if (bomItems.length === 0) throw new Error('No BOM defined for this product');

      // 2. Check Raw Material Availability
      for (const item of bomItems) {
        const required = item.quantity * quantity;
        const rawMaterial = db.prepare('SELECT stock, name FROM products WHERE id = ?').get(item.raw_material_id) as any;
        if (rawMaterial.stock < required) {
          throw new Error(`Insufficient stock for ${rawMaterial.name}. Required: ${required}, Available: ${rawMaterial.stock}`);
        }
      }

      // 3. Deduct Raw Materials
      for (const item of bomItems) {
        const required = item.quantity * quantity;
        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(required, item.raw_material_id);
        db.prepare("INSERT INTO transactions (type, product_id, quantity, price, category, notes) VALUES ('out', ?, ?, 0, 'Manufacturing', ?)").run(item.raw_material_id, required, `Used for production order #${id}`);
      }

      // 4. Add Finished Good
      db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(quantity, finished_good_id);
      db.prepare("INSERT INTO transactions (type, product_id, quantity, price, category, notes) VALUES ('production', ?, ?, 0, 'Manufacturing', ?)").run(finished_good_id, quantity, `Production Order #${id} - ${destination} - ${notes || ''}`);

      // 5. Update Order Status
      db.prepare("UPDATE production_orders SET status = 'completed' WHERE id = ?").run(id);
    });

    try {
      approve();
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/production', (req, res) => {
    const { finished_good_id, quantity, notes } = req.body;

    const produce = db.transaction(() => {
      // 1. Check BOM
      const bomItems = db.prepare('SELECT * FROM bom WHERE finished_good_id = ?').all(finished_good_id) as any[];
      
      if (bomItems.length === 0) {
        throw new Error('No BOM defined for this product');
      }

      // 2. Check Raw Material Availability
      for (const item of bomItems) {
        const required = item.quantity * quantity;
        const rawMaterial = db.prepare('SELECT stock, name FROM products WHERE id = ?').get(item.raw_material_id) as any;
        if (rawMaterial.stock < required) {
          throw new Error(`Insufficient stock for ${rawMaterial.name}. Required: ${required}, Available: ${rawMaterial.stock}`);
        }
      }

      // 3. Deduct Raw Materials
      for (const item of bomItems) {
        const required = item.quantity * quantity;
        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(required, item.raw_material_id);
        // Log usage
        db.prepare("INSERT INTO transactions (type, product_id, quantity, price, category, notes) VALUES ('out', ?, ?, 0, 'Manufacturing', ?)").run(item.raw_material_id, required, `Used for production of FG-${finished_good_id}`);
      }

      // 4. Add Finished Good
      db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(quantity, finished_good_id);
      db.prepare("INSERT INTO transactions (type, product_id, quantity, price, category, notes) VALUES ('production', ?, ?, 0, 'Manufacturing', ?)").run(finished_good_id, quantity, notes || 'Production Run');
    });

    try {
      produce();
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get BOM
  app.get('/api/bom/:productId', (req, res) => {
    const bom = db.prepare(`
      SELECT b.*, p.name as raw_material_name, p.unit 
      FROM bom b 
      JOIN products p ON b.raw_material_id = p.id 
      WHERE b.finished_good_id = ?
    `).all(req.params.productId);
    res.json(bom);
  });

  // Settings API
  app.get('/api/settings', (req, res) => {
    let settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    if (!settings) {
      db.prepare('INSERT INTO settings (id) VALUES (1)').run();
      settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    }
    res.json(settings);
  });

  // Work Orders API
  app.get('/api/pending-sales-for-production', (req, res) => {
    try {
      const pending = db.prepare(`
        SELECT 
          o.id as order_id,
          o.date,
          o.reference_number as ref_no,
          c.name as customer_name,
          p.id as product_id,
          p.name as product_name,
          p.sku,
          oi.quantity as target_qty
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN customers c ON o.entity_id = c.id
        WHERE o.type = 'sales' 
          AND o.status != 'completed'
          AND (
            o.status != 'fulfillment_requested' 
            OR oi.fulfillment_status = 'production_requested'
          )
          AND p.type = 'finished'
          AND NOT EXISTS (
            SELECT 1 FROM work_orders wo 
            WHERE wo.reference_no = o.reference_number 
              AND wo.finished_good_id = p.id
              AND wo.status != 'Completed'
          )
        ORDER BY o.date DESC
      `).all();
      res.json(pending);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Request Fulfillment (PPIC -> Warehouse)
  app.post('/api/sales/:id/request-fulfillment', (req, res) => {
    const { id } = req.params;
    
    const requestFulfillment = db.transaction(() => {
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
      if (!order) throw new Error('Order not found');

      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id) as any[];
      
      // Helper to create WO
      const createWorkOrderInternal = (target_qty: number, finished_good_id: number, reference_no: string, source_type: string) => {
         // Generate Batch ID
         const lastWO = db.prepare('SELECT id FROM work_orders ORDER BY id DESC LIMIT 1').get() as any;
         const nextId = lastWO ? lastWO.id + 1 : 1001;
         const batch_id = `PRD-${nextId}`;
         
         const ref = source_type === 'Restock' ? batch_id : reference_no;

         const stmt = db.prepare(`
           INSERT INTO work_orders (batch_id, source_type, reference_no, finished_good_id, target_qty, status)
           VALUES (?, ?, ?, ?, ?, 'Pending')
         `);
         const info = stmt.run(batch_id, source_type, ref, finished_good_id, target_qty);
         const woId = info.lastInsertRowid;

         // Copy BOM to work_order_materials
         const bomItems = db.prepare('SELECT * FROM bom WHERE finished_good_id = ?').all(finished_good_id) as any[];
         const insertMat = db.prepare(`
           INSERT INTO work_order_materials (work_order_id, raw_material_id, planned_qty)
           VALUES (?, ?, ?)
         `);
         
         for (const item of bomItems) {
           insertMat.run(woId, item.raw_material_id, item.quantity * target_qty);
         }
      };

      for (const item of items) {
        const product = db.prepare('SELECT stock, name, unit FROM products WHERE id = ?').get(item.product_id) as any;
        
        const currentStatus = item.fulfillment_status || 'pending';
        
        if (currentStatus === 'fulfilled' || currentStatus === 'ready_to_fulfill') continue;
        
        if (currentStatus === 'production_requested') {
           // Only process if stock is now available (e.g. after production)
           if (product.stock >= item.quantity) {
              db.prepare("UPDATE order_items SET fulfillment_status = 'ready_to_fulfill' WHERE id = ?").run(item.id);
           }
           continue;
        }

        if (product.stock >= item.quantity) {
          // Full fulfillment possible
          db.prepare("UPDATE order_items SET fulfillment_status = 'ready_to_fulfill' WHERE id = ?").run(item.id);
        } else {
          // Partial or No fulfillment
          const available = product.stock;
          const shortage = item.quantity - available;

          if (available > 0) {
            // Split item
            // 1. Update original item to available qty
            db.prepare("UPDATE order_items SET quantity = ?, fulfillment_status = 'ready_to_fulfill' WHERE id = ?").run(available, item.id);
            
            // 2. Create new item for shortage
            const price = item.price || 0;
            db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price, fulfillment_status) VALUES (?, ?, ?, ?, 'production_requested')").run(id, item.product_id, shortage, price);
            
            // 3. Create Work Order for shortage
            createWorkOrderInternal(shortage, item.product_id, order.reference_number, 'Sales');
          } else {
            // No stock available
            db.prepare("UPDATE order_items SET fulfillment_status = 'production_requested' WHERE id = ?").run(item.id);
            createWorkOrderInternal(item.quantity, item.product_id, order.reference_number, 'Sales');
          }
        }
      }

      db.prepare("UPDATE orders SET status = 'fulfillment_requested' WHERE id = ?").run(id);
    });

    try {
      requestFulfillment();
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get Fulfillment Requests (Warehouse Queue)
  app.get('/api/sales/fulfillment-requests', (req, res) => {
    try {
      const requests = db.prepare(`
        SELECT 
          o.id as order_id,
          o.date,
          o.reference_number as ref_no,
          c.name as customer_name,
          p.id as product_id,
          p.name as product_name,
          p.sku,
          oi.quantity as target_qty,
          p.stock as current_stock,
          oi.id as item_id
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN customers c ON o.entity_id = c.id
        WHERE o.type = 'sales' 
          AND o.status = 'fulfillment_requested'
          AND oi.fulfillment_status = 'ready_to_fulfill'
        ORDER BY o.date ASC
      `).all();
      res.json(requests);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Approve Fulfillment (Warehouse -> Deduct Stock)
  app.post('/api/sales/:id/approve-fulfillment', (req, res) => {
    const { id } = req.params;
    
    const fulfill = db.transaction(() => {
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
      if (!order) throw new Error('Sales order not found');
      if (order.status === 'completed') throw new Error('Order already fulfilled');

      // Fetch items ready to fulfill
      const items = db.prepare("SELECT * FROM order_items WHERE order_id = ? AND fulfillment_status = 'ready_to_fulfill'").all(id) as any[];
      
      if (items.length === 0) {
         throw new Error('No items ready for fulfillment');
      }

      for (const item of items) {
        const product = db.prepare('SELECT stock, name FROM products WHERE id = ?').get(item.product_id) as any;
        if (!product) throw new Error('Product not found');
        
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Required: ${item.quantity}, Available: ${product.stock}`);
        }

        // Deduct Stock
        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.product_id);

        // Log Transaction
        db.prepare(`
          INSERT INTO transactions (type, product_id, quantity, price, category, notes) 
          VALUES ('out', ?, ?, 0, 'Sales', ?)
        `).run(item.product_id, item.quantity, `Fulfillment for Order #${order.reference_number}`);

        // Mark Item as Fulfilled
        db.prepare("UPDATE order_items SET fulfillment_status = 'fulfilled' WHERE id = ?").run(item.id);
      }

      // Check if all items in the order are fulfilled
      const unfulfilledCount = db.prepare("SELECT count(*) as count FROM order_items WHERE order_id = ? AND fulfillment_status != 'fulfilled'").get(id) as any;
      
      if (unfulfilledCount.count === 0) {
        db.prepare("UPDATE orders SET status = 'completed' WHERE id = ?").run(id);
      }
    });

    try {
      fulfill();
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/work-orders', (req, res) => {
    const orders = db.prepare(`
      SELECT wo.*, p.name as product_name, p.sku, p.unit
      FROM work_orders wo
      JOIN products p ON wo.finished_good_id = p.id
      ORDER BY wo.date DESC
    `).all();
    res.json(orders);
  });

  app.get('/api/work-orders/:id/materials', (req, res) => {
    const materials = db.prepare(`
      SELECT wom.*, p.name as material_name, p.unit, p.stock as current_stock
      FROM work_order_materials wom
      JOIN products p ON wom.raw_material_id = p.id
      WHERE wom.work_order_id = ?
    `).all(req.params.id);
    res.json(materials);
  });

  app.post('/api/work-orders', (req, res) => {
    const { source_type, reference_no, finished_good_id, target_qty } = req.body;
    
    const createWO = db.transaction(() => {
      // Generate Batch ID
      const lastWO = db.prepare('SELECT id FROM work_orders ORDER BY id DESC LIMIT 1').get() as any;
      const nextId = lastWO ? lastWO.id + 1 : 1001;
      const batch_id = `PRD-${nextId}`;
      
      const ref = source_type === 'Restock' ? batch_id : reference_no;

      const stmt = db.prepare(`
        INSERT INTO work_orders (batch_id, source_type, reference_no, finished_good_id, target_qty)
        VALUES (?, ?, ?, ?, ?)
      `);
      const info = stmt.run(batch_id, source_type, ref, finished_good_id, target_qty);
      const woId = info.lastInsertRowid;

      // Copy BOM to work_order_materials
      const bomItems = db.prepare('SELECT * FROM bom WHERE finished_good_id = ?').all(finished_good_id) as any[];
      const insertMat = db.prepare(`
        INSERT INTO work_order_materials (work_order_id, raw_material_id, planned_qty)
        VALUES (?, ?, ?)
      `);
      
      for (const item of bomItems) {
        insertMat.run(woId, item.raw_material_id, item.quantity * target_qty);
      }

      return { id: woId, batch_id };
    });

    try {
      const result = createWO();
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch('/api/work-orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      db.prepare('UPDATE work_orders SET status = ? WHERE id = ?').run(status, id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/work-orders/:id/complete', (req, res) => {
    const { id } = req.params;
    const { actual_materials, good_qty, reject_qty } = req.body; // actual_materials: [{ raw_material_id, actual_qty }]

    const completeWO = db.transaction(() => {
      const wo = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id) as any;
      if (!wo) throw new Error('Work Order not found');
      if (wo.status !== 'WIP') throw new Error('Work Order must be in WIP status to complete');

      // 1. Update Work Order
      db.prepare(`
        UPDATE work_orders 
        SET status = 'Completed', good_qty = ?, reject_qty = ? 
        WHERE id = ?
      `).run(good_qty, reject_qty, id);

      // 2. Update Actual Quantities and Stock
      const updateMat = db.prepare('UPDATE work_order_materials SET actual_qty = ? WHERE work_order_id = ? AND raw_material_id = ?');
      const deductStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
      const addStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
      const logTrans = db.prepare(`
        INSERT INTO transactions (type, product_id, quantity, price, category, notes) 
        VALUES (?, ?, ?, 0, ?, ?)
      `);

      for (const mat of actual_materials) {
        updateMat.run(mat.actual_qty, id, mat.raw_material_id);
        deductStock.run(mat.actual_qty, mat.raw_material_id);
        logTrans.run('out', mat.raw_material_id, mat.actual_qty, 'Manufacturing', `Used for WO ${wo.batch_id}`);
      }

      // 3. Add Finished Good Stock (Good Qty only)
      if (good_qty > 0) {
        addStock.run(good_qty, wo.finished_good_id);
        logTrans.run('production', wo.finished_good_id, good_qty, 'Manufacturing', `Produced from WO ${wo.batch_id}`);
      }

      // 4. Log Reject/Scrap
      if (reject_qty > 0) {
        logTrans.run('out', wo.finished_good_id, reject_qty, 'Scrap/Defect', `Rejected from WO ${wo.batch_id}`);
      }
    });

    try {
      completeWO();
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/settings', (req, res) => {
    const { company_name, address, email, phone, logo_url, currency } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO settings (id, company_name, address, email, phone, logo_url, currency)
        VALUES (1, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
        company_name = excluded.company_name,
        address = excluded.address,
        email = excluded.email,
        phone = excluded.phone,
        logo_url = excluded.logo_url,
        currency = excluded.currency
      `);
      stmt.run(company_name, address, email, phone, logo_url, currency);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Aging Report API
  app.get('/api/reports/aging', (req, res) => {
    try {
      // Get all unpaid orders
      const unpaidOrders = db.prepare(`
        SELECT 
          o.id, 
          o.type, 
          o.date, 
          o.due_date,
          o.reference_number, 
          o.entity_id,
          COALESCE(s.name, c.name) as entity_name,
          SUM(oi.quantity * oi.price) as total_amount
        FROM orders o
        LEFT JOIN suppliers s ON o.type = 'purchase' AND o.entity_id = s.id
        LEFT JOIN customers c ON o.type = 'sales' AND o.entity_id = c.id
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.payment_status = 'unpaid'
        GROUP BY o.id
      `).all() as any[];

      const now = new Date();
      const buckets = {
        payables: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0, details: [] as any[] },
        receivables: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0, details: [] as any[] }
      };

      unpaidOrders.forEach(order => {
        // Use due_date if available, otherwise fallback to creation date
        const refDate = order.due_date ? new Date(order.due_date) : new Date(order.date);
        const diffTime = now.getTime() - refDate.getTime();
        let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // If not overdue yet (negative days), treat as 0 for aging report or handle differently
        if (diffDays < 0) diffDays = 0;
        
        let bucket = '0-30';
        if (diffDays > 90) bucket = '90+';
        else if (diffDays > 60) bucket = '61-90';
        else if (diffDays > 30) bucket = '31-60';

        const category = order.type === 'purchase' ? 'payables' : 'receivables';
        
        // Add to bucket total
        // @ts-ignore
        buckets[category][bucket] += order.total_amount;
        buckets[category].total += order.total_amount;
        
        // Add detailed record with age
        buckets[category].details.push({
          ...order,
          age: diffDays,
          bucket
        });
      });

      res.json(buckets);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Purchase Requests Endpoints ---

  // Get Pending Purchase Requests
  app.get('/api/purchase-requests', (req, res) => {
    try {
      const requests = db.prepare(`
        SELECT 
          pr.id,
          pr.product_id,
          p.name as product_name,
          p.sku,
          pr.requested_qty,
          pr.status,
          pr.notes,
          pr.request_date
        FROM purchase_requests pr
        JOIN products p ON pr.product_id = p.id
        WHERE pr.status = 'pending'
        ORDER BY pr.request_date DESC
      `).all();
      res.json(requests);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create Purchase Request
  app.post('/api/purchase-requests', (req, res) => {
    const { product_id, requested_qty, notes } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO purchase_requests (product_id, requested_qty, notes)
        VALUES (?, ?, ?)
      `);
      const result = stmt.run(product_id, requested_qty, notes);
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Mark Purchase Request as Ordered
  app.put('/api/purchase-requests/:id/mark-ordered', (req, res) => {
    const { id } = req.params;
    try {
      const stmt = db.prepare(`
        UPDATE purchase_requests 
        SET status = 'ordered' 
        WHERE id = ?
      `);
      stmt.run(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
