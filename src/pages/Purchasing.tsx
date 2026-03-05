import React, { useEffect, useState } from 'react';
import { api, Product, Supplier, PurchaseRequest } from '@/lib/api';
import { ShoppingCart, Plus, Trash2, Save, ClipboardList, ArrowRight, CheckCircle2, Edit2, X } from 'lucide-react';

interface CartItem {
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  unit: string;
  price: number;
  request_id?: number; // Track if this came from a request
}

export default function Purchasing() {
  const [activeTab, setActiveTab] = useState<'requests' | 'create'>('requests');
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Item Input State
  const [selectedProduct, setSelectedProduct] = useState<number | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);

  // Editing State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState(0);
  const [editPrice, setEditPrice] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    api.getProducts().then(setProducts);
    api.getSuppliers().then(setSuppliers);
    loadRequests();
  };

  const loadRequests = () => {
    api.getPurchaseRequests().then(setRequests);
  };

  const processRequest = (request: PurchaseRequest) => {
    const product = products.find(p => p.id === request.product_id);
    if (!product) return;

    // Add to cart
    setCart(prev => {
      // Check if already in cart
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product_id === product.id 
            ? { ...item, quantity: item.quantity + request.requested_qty, request_id: request.id }
            : item
        );
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        quantity: request.requested_qty,
        unit: product.unit,
        price: product.cost_price || 0,
        request_id: request.id
      }];
    });

    // Switch tab
    setActiveTab('create');
  };

  const addToCart = () => {
    if (!selectedProduct || quantity <= 0) return;
    
    const product = products.find(p => p.id === Number(selectedProduct));
    if (!product) return;

    // Check if already in cart
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.product_id === product.id 
          ? { ...item, quantity: item.quantity + quantity, price: price || item.price }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        quantity: quantity,
        unit: product.unit,
        price: price || product.cost_price || 0
      }]);
    }
    
    // Reset input
    setSelectedProduct('');
    setQuantity(1);
    setPrice(0);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
    cancelEditing();
  };

  const startEditing = (index: number) => {
    const item = cart[index];
    setEditingIndex(index);
    setEditQuantity(item.quantity);
    setEditPrice(item.price);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditQuantity(0);
    setEditPrice(0);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    if (editQuantity <= 0 || editPrice < 0) return;

    setCart(prev => prev.map((item, i) => 
      i === editingIndex 
        ? { ...item, quantity: editQuantity, price: editPrice }
        : item
    ));
    cancelEditing();
  };

  const handleProductSelect = (id: number) => {
    setSelectedProduct(id);
    const product = products.find(p => p.id === id);
    if (product) {
      setPrice(product.cost_price || 0);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSupplier || cart.length === 0) return;
    
    setLoading(true);
    setMessage('');

    try {
      const result = await api.createOrder({
        type: 'purchase',
        entity_id: Number(selectedSupplier),
        items: cart.map(item => ({ product_id: item.product_id, quantity: item.quantity, price: item.price })),
        notes,
        status: 'pending',
        due_date: dueDate || undefined
      });
      
      // Mark requests as ordered
      for (const item of cart) {
        if (item.request_id) {
          await api.markPurchaseRequestAsOrdered(item.request_id);
        }
      }
      
      setMessage(`Success! PO #${result.ref} created with status PENDING.`);
      setCart([]);
      setSelectedSupplier('');
      setNotes('');
      setDueDate('');
      loadRequests(); // Refresh requests
    } catch (err) {
      setMessage('Error creating PO');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchasing Department</h1>
          <p className="text-slate-500">Manage purchase requests and create orders</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-4 px-2 font-medium transition-colors relative whitespace-nowrap ${
            activeTab === 'requests' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Pending Warehouse Requests
            {requests.length > 0 && (
              <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                {requests.length}
              </span>
            )}
          </div>
          {activeTab === 'requests' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`pb-4 px-2 font-medium transition-colors relative whitespace-nowrap ${
            activeTab === 'create' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Create Purchase Order
          </div>
          {activeTab === 'create' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
          )}
        </button>
      </div>

      {activeTab === 'requests' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-500 uppercase text-xs font-semibold tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4 text-right">Requested Qty</th>
                  <th className="px-6 py-4">Notes</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {!Array.isArray(requests) || requests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                      No pending requests from warehouse.
                    </td>
                  </tr>
                ) : (
                  requests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(req.request_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{req.product_name}</div>
                        <div className="text-xs text-slate-500 font-mono">{req.sku}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-indigo-600">
                        {req.requested_qty}
                      </td>
                      <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={req.notes}>
                        {req.notes || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => processRequest(req)}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2 ml-auto"
                        >
                          Process Request <ArrowRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Input */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
              Supplier Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                <select 
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                <input 
                  type="date"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea 
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="PO Reference, Delivery Instructions..."
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="bg-slate-100 text-slate-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
              Add Items
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
                <select 
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                  value={selectedProduct}
                  onChange={(e) => handleProductSelect(Number(e.target.value))}
                >
                  <option value="">-- Select Product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.sku} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                  <input 
                    type="number" 
                    min="1" 
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Price</label>
                  <input 
                    type="number" 
                    min="0" 
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                  />
                </div>
              </div>

              <button 
                onClick={addToCart}
                disabled={!selectedProduct}
                className="w-full bg-slate-900 text-white py-2.5 rounded-xl hover:bg-slate-800 flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:shadow-none"
              >
                <Plus className="h-4 w-4" /> Add to PO
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Cart & Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-slate-500" />
                PO Items
              </h3>
              <span className="text-sm text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">{cart.length} items</span>
            </div>

            <div className="flex-1 overflow-auto border border-gray-100 rounded-xl mb-6">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-slate-500 uppercase text-xs font-semibold tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic">
                        No items added yet
                      </td>
                    </tr>
                  ) : (
                    cart.map((item, index) => (
                      <tr key={index} className={`transition-colors ${editingIndex === index ? 'bg-indigo-50/50' : 'hover:bg-slate-50/50'}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{item.product_name}</div>
                          <div className="text-xs text-slate-500 font-mono">{item.sku}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {editingIndex === index ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editPrice}
                              onChange={(e) => setEditPrice(Number(e.target.value))}
                              className="w-24 text-right px-2 py-1 rounded border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          ) : (
                            `$${item.price.toLocaleString()}`
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">
                          {editingIndex === index ? (
                            <input
                              type="number"
                              min="1"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(Number(e.target.value))}
                              className="w-20 text-right px-2 py-1 rounded border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          ) : (
                            item.quantity
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">
                          ${(editingIndex === index ? editPrice * editQuantity : item.price * item.quantity).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editingIndex === index ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={saveEdit}
                                className="text-emerald-600 hover:bg-emerald-50 p-1 rounded transition-colors"
                                title="Save"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="text-slate-400 hover:bg-slate-100 p-1 rounded transition-colors"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button 
                                onClick={() => startEditing(index)}
                                className="text-slate-400 hover:text-indigo-600 p-1 transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => removeFromCart(index)}
                                className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                                title="Remove"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {cart.length > 0 && (
                  <tfoot className="bg-slate-50/50 font-bold border-t border-gray-100">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right text-slate-600">Grand Total:</td>
                      <td className="px-4 py-3 text-right text-emerald-600 text-lg">
                        ${cart.reduce((acc, item) => acc + (item.price * item.quantity), 0).toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <div className="flex justify-end">
              <button 
                onClick={handleSubmit}
                disabled={cart.length === 0 || !selectedSupplier || loading}
                className="py-3 px-6 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700 shadow-sm hover:shadow-md transition-all"
              >
                <Save className="h-5 w-5" />
                {loading ? 'Saving...' : 'Create Purchase Order'}
              </button>
            </div>

            {message && (
              <div className={`mt-4 p-3 rounded-xl text-center text-sm font-medium ${message.includes('Error') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
