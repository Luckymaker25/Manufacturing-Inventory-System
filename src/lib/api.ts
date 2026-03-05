import axios from 'axios';

export interface Supplier {
  id: number;
  name: string;
  contact: string;
  email: string;
  address: string;
  products?: Product[];
}

export interface Customer {
  id: number;
  name: string;
  contact: string;
  email: string;
  address: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  type: 'raw' | 'finished';
  stock: number;
  unit: string;
  min_stock: number;
  cost_price?: number;
  suppliers?: Supplier[];
}

export interface Transaction {
  id: number;
  type: 'in' | 'out' | 'production';
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  date: string;
  category?: string;
  notes: string;
  balance?: number;
}

export interface BomItem {
  id: number;
  finished_good_id: number;
  raw_material_id: number;
  raw_material_name: string;
  quantity: number;
  unit: string;
}

export interface CreateProductData {
  name: string;
  sku: string;
  type: 'raw' | 'finished';
  stock: number;
  unit: string;
  min_stock: number;
  cost_price?: number;
  supplier_ids?: number[];
  bom?: { raw_material_id: number; quantity: number }[];
}

export interface OrderItem {
  product_id: number;
  quantity: number;
  price?: number;
}

export interface Order {
  id: number;
  type: 'purchase' | 'sales';
  entity_id: number;
  supplier_name?: string;
  reference_number: string;
  date: string;
  due_date?: string;
  status: 'pending' | 'completed';
  payment_status: 'paid' | 'unpaid';
  items: (OrderItem & { product_name: string; sku: string; unit: string })[];
}

export interface CreateOrderData {
  type: 'purchase' | 'sales';
  entity_id: number; // supplier_id or customer_id
  items: OrderItem[];
  notes?: string;
  status?: 'pending' | 'completed';
  payment_status?: 'paid' | 'unpaid';
  due_date?: string;
}

export interface SupplierTransaction {
  po_number: string;
  date: string;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Settings {
  id: number;
  company_name: string;
  address: string;
  email: string;
  phone: string;
  logo_url?: string;
  currency: string;
}

export interface AgingReport {
  payables: {
    '0-30': number;
    '31-60': number;
    '61-90': number;
    '90+': number;
    total: number;
    details: (Order & { age: number; bucket: string; total_amount: number; entity_name: string })[];
  };
  receivables: {
    '0-30': number;
    '31-60': number;
    '61-90': number;
    '90+': number;
    total: number;
    details: (Order & { age: number; bucket: string; total_amount: number; entity_name: string })[];
  };
}

export interface ProductionOrder {
  id: number;
  finished_good_id: number;
  product_name: string;
  sku: string;
  unit: string;
  quantity: number;
  destination: 'sales' | 'stock';
  status: 'pending' | 'completed' | 'cancelled';
  date: string;
  notes: string;
}

export interface WorkOrder {
  id: number;
  batch_id: string;
  source_type: 'Sales' | 'Restock';
  reference_no: string;
  finished_good_id: number;
  product_name: string;
  sku: string;
  unit: string;
  target_qty: number;
  good_qty: number;
  reject_qty: number;
  status: 'Pending' | 'Approved' | 'WIP' | 'Completed';
  date: string;
}

export interface WorkOrderMaterial {
  id: number;
  work_order_id: number;
  raw_material_id: number;
  material_name: string;
  unit: string;
  planned_qty: number;
  actual_qty: number | null;
  current_stock: number;
}

export interface PendingSalesProduction {
  order_id: number;
  date: string;
  ref_no: string;
  customer_name: string;
  product_id: number;
  product_name: string;
  sku: string;
  target_qty: number;
  current_stock: number;
  item_id: number;
}

export interface PurchaseRequest {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  requested_qty: number;
  status: 'pending' | 'ordered';
  notes: string;
  request_date: string;
}

export const api = {
  getProducts: () => axios.get<Product[]>('/api/products').then(res => res.data),
  getProduct: (id: number) => axios.get<Product>(`/api/products/${id}`).then(res => res.data),
  addProduct: (data: CreateProductData) => axios.post('/api/products', data).then(res => res.data),
  updateProduct: (id: number, data: CreateProductData) => axios.put(`/api/products/${id}`, data).then(res => res.data),
  getTransactions: () => axios.get<Transaction[]>('/api/transactions').then(res => res.data),
  getProductTransactions: (id: number) => axios.get<Transaction[]>(`/api/products/${id}/transactions`).then(res => res.data),
  addTransaction: (data: { type: string; product_id: number; quantity: number; category?: string; notes?: string }) => axios.post('/api/transactions', data).then(res => res.data),
  runProduction: (data: { finished_good_id: number; quantity: number; notes?: string }) => axios.post('/api/production', data).then(res => res.data),
  getBom: (productId: number) => axios.get<BomItem[]>(`/api/bom/${productId}`).then(res => res.data),
  getSuppliers: () => axios.get<Supplier[]>('/api/suppliers').then(res => res.data),
  getSupplierTransactions: (id: number) => axios.get<SupplierTransaction[]>(`/api/suppliers/${id}/transactions`).then(res => res.data),
  addSupplier: (data: { name: string; contact: string; email: string; address: string }) => axios.post('/api/suppliers', data).then(res => res.data),
  updateSupplier: (id: number, data: { name: string; contact: string; email: string; address: string }) => axios.put(`/api/suppliers/${id}`, data).then(res => res.data),
  getCustomers: () => axios.get<Customer[]>('/api/customers').then(res => res.data),
  addCustomer: (data: { name: string; contact: string; email: string; address: string }) => axios.post('/api/customers', data).then(res => res.data),
  updateCustomer: (id: number, data: { name: string; contact: string; email: string; address: string }) => axios.put(`/api/customers/${id}`, data).then(res => res.data),
  getCustomerTransactions: (id: number) => axios.get<SupplierTransaction[]>(`/api/customers/${id}/transactions`).then(res => res.data),
  createOrder: (data: CreateOrderData) => axios.post('/api/orders', data).then(res => res.data),
  getOrders: (params?: { status?: string; type?: string }) => axios.get<Order[]>('/api/orders', { params }).then(res => res.data),
  receiveOrder: (id: number, items?: OrderItem[]) => axios.post(`/api/orders/${id}/receive`, { items }).then(res => res.data),
  updateOrderPaymentStatus: (id: number, status: 'paid' | 'unpaid') => axios.put(`/api/orders/${id}/payment`, { status }).then(res => res.data),
  getSettings: () => axios.get<Settings>('/api/settings').then(res => res.data),
  updateSettings: (data: Partial<Settings>) => axios.put('/api/settings', data).then(res => res.data),
  getAgingReport: () => axios.get<AgingReport>('/api/reports/aging').then(res => res.data),
  getProductionOrders: () => axios.get<ProductionOrder[]>('/api/production/orders').then(res => res.data),
  getPendingSalesForProduction: () => axios.get<PendingSalesProduction[]>('/api/pending-sales-for-production').then(res => res.data),
  createProductionOrder: (data: { finished_good_id: number; quantity: number; destination: 'sales' | 'stock'; notes?: string }) => 
    axios.post('/api/production/orders', data).then(res => res.data),
  approveProductionOrder: (id: number) => axios.post(`/api/production/orders/${id}/approve`).then(res => res.data),
  fulfillSalesOrderFromStock: (id: number, data: { product_id: number; quantity: number }) => 
    axios.post(`/api/sales/${id}/fulfill-from-stock`, data).then(res => res.data),
  requestFulfillment: (id: number) => axios.post(`/api/sales/${id}/request-fulfillment`).then(res => res.data),
  approveFulfillment: (id: number) => axios.post(`/api/sales/${id}/approve-fulfillment`).then(res => res.data),
  getFulfillmentRequests: () => axios.get<PendingSalesProduction[]>('/api/sales/fulfillment-requests').then(res => res.data),
  
  // Work Orders
  getWorkOrders: () => axios.get<WorkOrder[]>('/api/work-orders').then(res => res.data),
  getWorkOrderMaterials: (id: number) => axios.get<WorkOrderMaterial[]>(`/api/work-orders/${id}/materials`).then(res => res.data),
  createWorkOrder: (data: { source_type: 'Sales' | 'Restock'; reference_no: string; finished_good_id: number; target_qty: number }) => 
    axios.post('/api/work-orders', data).then(res => res.data),
  approveWorkOrder: (id: number) => axios.put(`/api/work-orders/${id}/approve`).then(res => res.data),
  updateWorkOrderStatus: (id: number, status: 'Pending' | 'Approved' | 'WIP' | 'Completed') => 
    axios.patch(`/api/work-orders/${id}/status`, { status }).then(res => res.data),
  completeWorkOrder: (id: number, data: { actual_materials: { raw_material_id: number; actual_qty: number }[]; good_qty: number; reject_qty: number }) => 
    axios.post(`/api/work-orders/${id}/complete`, data).then(res => res.data),

  // Purchase Requests
  getPurchaseRequests: () => axios.get<PurchaseRequest[]>('/api/purchase-requests').then(res => res.data),
  createPurchaseRequest: (data: { product_id: number; requested_qty: number; notes?: string }) => 
    axios.post('/api/purchase-requests', data).then(res => res.data),
  markPurchaseRequestAsOrdered: (id: number) => axios.put(`/api/purchase-requests/${id}/mark-ordered`).then(res => res.data),
};
