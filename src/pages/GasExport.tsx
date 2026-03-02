import React from 'react';
import { Copy } from 'lucide-react';

export default function GasExport() {
  const spreadsheetId = '1vTeDXNLc1Ff2pepW0ANfw5HB4jATNa_EsDV_PvL4bhAD5O8FWYZS8vsIW2RUJc6_LKo01g88lWQYZ5n';

  const codeGs = `
/**
 * Manufacturing Inventory System - Backend Logic
 * Spreadsheet ID: ${spreadsheetId}
 */

const SPREADSHEET_ID = '${spreadsheetId}';

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Manufacturing Inventory System')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Get all inventory data
 */
function getInventoryData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Inventory');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  return data.map(row => {
    return {
      sku: row[0],
      name: row[1],
      type: row[2],
      stock: row[3],
      unit: row[4],
      min_stock: row[5],
      cost_price: row[6] || 0
    };
  });
}

/**
 * Get all transactions
 */
function getTransactions() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Transactions');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  data.shift(); // Remove header
  return data.map(row => ({
    date: row[0],
    type: row[1],
    sku: row[2],
    quantity: row[3],
    price: row[4] || 0,
    category: row[5] || 'Manual',
    notes: row[6]
  })).reverse();
}

/**
 * Get all suppliers
 */
function getSuppliers() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Suppliers');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  data.shift(); // Remove header
  return data.map(row => ({
    name: row[0],
    contact: row[1],
    email: row[2]
  }));
}

/**
 * Get all customers
 */
function getCustomers() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Customers');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  data.shift(); // Remove header
  return data.map(row => ({
    name: row[0],
    contact: row[1],
    email: row[2]
  }));
}

/**
 * Handle Transactions (In/Out)
 */
function handleTransaction(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const invSheet = ss.getSheetByName('Inventory');
  const transSheet = ss.getSheetByName('Transactions');
  
  // 1. Log Transaction
  transSheet.appendRow([
    new Date(),
    data.type,
    data.sku,
    data.quantity,
    data.price || 0,
    data.category || 'Manual',
    data.notes
  ]);
  
  // 2. Update Inventory
  const invData = invSheet.getDataRange().getValues();
  for (let i = 1; i < invData.length; i++) {
    if (invData[i][0] === data.sku) {
      let currentStock = invData[i][3];
      let newStock = data.type === 'IN' ? currentStock + data.quantity : currentStock - data.quantity;
      invSheet.getRange(i + 1, 4).setValue(newStock);
      
      // Update HPP if it's a purchase
      if (data.type === 'IN' && data.category === 'Purchase') {
        invSheet.getRange(i + 1, 7).setValue(data.price);
      }
      
      return { success: true, newStock: newStock };
    }
  }
  return { success: false, error: 'Product not found' };
}

/**
 * Handle Production (BOM Deduction)
 */
function runProduction(finishedSku, quantity) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const bomSheet = ss.getSheetByName('BOM');
  
  // 1. Get BOM for finished good
  const bomData = bomSheet.getDataRange().getValues();
  const ingredients = bomData.filter(row => row[0] === finishedSku);
  
  if (ingredients.length === 0) return { success: false, error: 'No BOM found' };
  
  // 2. Deduct Raw Materials
  ingredients.forEach(item => {
    const rawSku = item[1];
    const qtyPerUnit = item[2];
    const totalRequired = qtyPerUnit * quantity;
    
    handleTransaction({
      type: 'OUT',
      sku: rawSku,
      quantity: totalRequired,
      category: 'Manufacturing',
      notes: 'Production Usage for ' + finishedSku
    });
  });
  
  // 3. Add Finished Good
  handleTransaction({
    type: 'IN',
    sku: finishedSku,
    quantity: quantity,
    category: 'Manufacturing',
    notes: 'Production Output'
  });
  
  return { success: true };
}
`;

  const indexHtml = `
<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.4/css/dataTables.bootstrap5.min.css">
    <style>
      body { background-color: #f8f9fa; font-family: 'Inter', sans-serif; }
      .sidebar { height: 100vh; position: fixed; top: 0; left: 0; width: 250px; background: #1e293b; color: white; padding-top: 20px; }
      .sidebar a { color: #94a3b8; text-decoration: none; display: block; padding: 12px 24px; transition: all 0.2s; }
      .sidebar a:hover, .sidebar a.active { background: #334155; color: white; border-left: 4px solid #10b981; }
      .main-content { margin-left: 250px; padding: 40px; }
      .card { border: none; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 24px; }
      .table { border-radius: 8px; overflow: hidden; }
      .badge-in { background-color: #dcfce7; color: #166534; }
      .badge-out { background-color: #fee2e2; color: #991b1b; }
    </style>
  </head>
  <body>
    <div class="sidebar">
      <h4 class="text-center mb-4 font-bold">ManufactureOS</h4>
      <a href="#" onclick="showPage('dashboard')" id="nav-dashboard" class="active">Dashboard</a>
      <a href="#" onclick="showPage('inventory')" id="nav-inventory">Inventory</a>
      <a href="#" onclick="showPage('transactions')" id="nav-transactions">History</a>
    </div>

    <div class="main-content">
      <div id="dashboard">
        <h2 class="mb-4">Dashboard</h2>
        <div class="row">
          <div class="col-md-4">
            <div class="card p-4 bg-white">
              <h6 class="text-muted uppercase small">Total Stock Value</h6>
              <h2 id="total-value" class="text-emerald-600">$0</h2>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card p-4 bg-white">
              <h6 class="text-muted uppercase small">Total Items</h6>
              <h2 id="total-items">0</h2>
            </div>
          </div>
        </div>
      </div>
      
      <div id="inventory" style="display:none;">
        <h2 class="mb-4">Inventory Management</h2>
        <div class="card p-4">
          <table id="invTable" class="table table-hover w-100">
            <thead>
              <tr><th>SKU</th><th>Name</th><th>Type</th><th>Stock</th><th>Unit</th><th>HPP</th></tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>

      <div id="transactions" style="display:none;">
        <h2 class="mb-4">Transaction History</h2>
        <div class="card p-4">
          <table id="transTable" class="table table-hover w-100">
            <thead>
              <tr><th>Date</th><th>Type</th><th>SKU</th><th>Qty</th><th>Price</th><th>Category</th></tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.5.1.js"></script>
    <script src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.4/js/dataTables.bootstrap5.min.js"></script>
    <script>
      $(document).ready(function () {
        loadData();
      });

      function loadData() {
        google.script.run.withSuccessHandler(function(data) {
          $('#invTable').DataTable({
            data: data,
            columns: [
              { data: 'sku' },
              { data: 'name' },
              { data: 'type' },
              { data: 'stock' },
              { data: 'unit' },
              { data: 'cost_price', render: $.fn.dataTable.render.number(',', '.', 0, '$') }
            ]
          });
          
          $('#total-items').text(data.length);
          const totalVal = data.reduce((acc, curr) => acc + (curr.stock * curr.cost_price), 0);
          $('#total-value').text('$' + totalVal.toLocaleString());
        }).getInventoryData();

        google.script.run.withSuccessHandler(function(data) {
          $('#transTable').DataTable({
            data: data,
            columns: [
              { data: 'date', render: d => new Date(d).toLocaleString() },
              { data: 'type', render: t => \`<span class="badge \${t === 'IN' ? 'badge-in' : 'badge-out'}">\${t}</span>\` },
              { data: 'sku' },
              { data: 'quantity' },
              { data: 'price', render: $.fn.dataTable.render.number(',', '.', 0, '$') },
              { data: 'category' }
            ]
          });
        }).getTransactions();
      }

      function showPage(pageId) {
        $('.main-content > div').hide();
        $('.sidebar a').removeClass('active');
        $('#' + pageId).show();
        $('#nav-' + pageId).addClass('active');
      }
    </script>
  </body>
</html>
`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl">
        <h2 className="text-xl font-bold text-blue-900 mb-2">Google Apps Script Export</h2>
        <p className="text-blue-700">
          Since I am running in a web container, I cannot directly deploy this to your Google Account.
          However, I have generated the exact code you need. Copy these files into your Google Apps Script project.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold">Code.gs (Backend Logic)</h3>
          <button onClick={() => copyToClipboard(codeGs)} className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-lg">
            <Copy className="h-4 w-4" /> Copy Code
          </button>
        </div>
        <pre className="bg-slate-900 text-slate-50 p-4 rounded-xl overflow-x-auto text-sm font-mono h-96">
          {codeGs}
        </pre>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold">Index.html (Frontend UI)</h3>
          <button onClick={() => copyToClipboard(indexHtml)} className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-lg">
            <Copy className="h-4 w-4" /> Copy Code
          </button>
        </div>
        <pre className="bg-slate-900 text-slate-50 p-4 rounded-xl overflow-x-auto text-sm font-mono h-96">
          {indexHtml}
        </pre>
      </div>
    </div>
  );
}
