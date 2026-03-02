import React, { useEffect, useState } from 'react';
import { api, Product, Supplier } from '@/lib/api';
import { ShoppingCart, Plus, Trash2, Save } from 'lucide-react';

interface CartItem {
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  unit: string;
  price: number;
}

export default function Purchasing() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Item Input State
  const [selectedProduct, setSelectedProduct] = useState<number | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);

  useEffect(() => {
    api.getProducts().then(setProducts);
    api.getSuppliers().then(setSuppliers);
  }, []);

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
        status: 'pending'
      });
      
      setMessage(`Success! PO #${result.ref} created with status PENDING.`);
      setCart([]);
      setSelectedSupplier('');
      setNotes('');
    } catch (err) {
      setMessage('Error creating PO');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Create Purchase Order (PO)</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Input */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4">1. Supplier Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <select 
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea 
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="PO Reference, Delivery Instructions..."
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4">2. Add Items</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <select 
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input 
                    type="number" 
                    min="1" 
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                  <input 
                    type="number" 
                    min="0" 
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                  />
                </div>
              </div>

              <button 
                onClick={addToCart}
                disabled={!selectedProduct}
                className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" /> Add to PO
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Cart & Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                PO Items
              </h3>
              <span className="text-sm text-gray-500">{cart.length} items</span>
            </div>

            <div className="flex-1 overflow-auto border rounded-lg mb-6">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                        No items added yet
                      </td>
                    </tr>
                  ) : (
                    cart.map((item, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-xs text-gray-500">{item.sku}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">
                          ${item.price.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">
                          ${(item.price * item.quantity).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button 
                            onClick={() => removeFromCart(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {cart.length > 0 && (
                  <tfoot className="bg-gray-50 font-bold">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right">Grand Total:</td>
                      <td className="px-4 py-3 text-right text-emerald-600">
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
                className="py-3 px-6 rounded-lg text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="h-5 w-5" />
                {loading ? 'Saving...' : 'Create Purchase Order'}
              </button>
            </div>

            {message && (
              <div className={`mt-4 p-3 rounded-lg text-center ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
