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
  status: 'pending' | 'completed';
  items: (OrderItem & { product_name: string; sku: string; unit: string })[];
}

export interface CreateOrderData {
  type: 'purchase' | 'sales';
  entity_id: number; // supplier_id or customer_id
  items: OrderItem[];
  notes?: string;
  status?: 'pending' | 'completed';
}

export interface SupplierTransaction {
  po_number: string;
  date: string;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
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
};
