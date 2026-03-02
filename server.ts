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
`);

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

  // Ensure tables exist (Migration safety)
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('purchase', 'sales')),
      entity_id INTEGER,
      date TEXT DEFAULT CURRENT_TIMESTAMP,
      reference_number TEXT,
      status TEXT DEFAULT 'completed'
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
    let query = 'SELECT o.*, s.name as supplier_name FROM orders o LEFT JOIN suppliers s ON o.entity_id = s.id WHERE 1=1';
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
    const { type, entity_id, items, notes, status = 'completed' } = req.body; // items: [{ product_id, quantity, price }]
    
    const createOrder = db.transaction(() => {
      // 1. Create Order
      const orderStmt = db.prepare('INSERT INTO orders (type, entity_id, reference_number, status) VALUES (?, ?, ?, ?)');
      const ref = `${type.toUpperCase()}-${Date.now()}`;
      const orderInfo = orderStmt.run(type, entity_id, ref, status);
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
      SELECT t.*, p.name as product_name, p.sku 
      FROM transactions t 
      JOIN products p ON t.product_id = p.id 
      ORDER BY t.date DESC
    `).all();
    res.json(transactions);
  });

  // Get Transactions for a specific product
  app.get('/api/products/:id/transactions', (req, res) => {
    const transactions = db.prepare(`
      SELECT t.*, p.name as product_name, p.sku 
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
