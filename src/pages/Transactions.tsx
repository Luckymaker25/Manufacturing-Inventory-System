import React, { useEffect, useState } from 'react';
import { api, Product, Supplier, Customer } from '@/lib/api';
import { ArrowRight, ArrowLeft, Plus, Trash2, FileText, ShoppingCart } from 'lucide-react';

interface CartItem {
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  stock: number;
  unit: string;
  price: number;
}

interface TransactionsProps {
  defaultType?: 'purchase' | 'sales';
  hideTypeToggle?: boolean;
  defaultCategory?: string;
  lockCategory?: boolean;
}

export default function Transactions({ 
  defaultType = 'purchase', 
  hideTypeToggle = false,
  defaultCategory = '',
  lockCategory = false
}: TransactionsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [type, setType] = useState<'purchase' | 'sales'>(defaultType);
  const [category, setCategory] = useState<string>(defaultCategory);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<number | ''>('');
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
    api.getCustomers().then(setCustomers);
  }, []);

  // Update default category when type changes
  useEffect(() => {
    if (defaultCategory) {
      setCategory(defaultCategory);
      return;
    }
    if (type === 'purchase') {
      setCategory('Manual'); // Default for Manual In
    } else {
      setCategory('Sales'); // Default for Out
    }
  }, [type, defaultCategory]);

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
        stock: product.stock,
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

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    
    // Validation: Sales requires Customer
    if (category === 'Sales' && !selectedEntity) {
      setMessage('Error: Please select a Customer for Sales.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      if (category === 'Sales') {
        // Create Order for Sales
        const result = await api.createOrder({
          type: 'sales',
          entity_id: Number(selectedEntity),
          items: cart.map(item => ({ product_id: item.product_id, quantity: item.quantity, price: item.price })),
          notes
        });
        setMessage(`Success! Sales Order #${result.ref} created.`);
      } else {
        // Manual Transaction (Adjustment, Scrap, etc.)
        for (const item of cart) {
          await api.addTransaction({
            type: type === 'purchase' ? 'in' : 'out',
            product_id: item.product_id,
            quantity: item.quantity,
            category: category,
            notes: notes
          });
        }
        setMessage(`Success! ${category} transaction recorded.`);
      }
      
      setCart([]);
      setSelectedEntity('');
      setNotes('');
      // Refresh products to show updated stock
      api.getProducts().then(setProducts);
    } catch (err) {
      setMessage('Error processing transaction');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateDocument = () => {
    alert(`Generating ${type === 'purchase' ? 'Purchase Order' : 'Invoice'}... (Feature coming soon)`);
  };

  const handleProductSelect = (id: number) => {
    setSelectedProduct(id);
    const product = products.find(p => p.id === id);
    if (product) {
      setPrice(product.cost_price || 0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Transaction Entry</h1>
      </div>

      {!hideTypeToggle && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => { setType('purchase'); setCart([]); setSelectedEntity(''); }}
            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
              type === 'purchase' 
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                : 'border-gray-200 hover:border-emerald-200'
            }`}
          >
            <ArrowLeft className="h-6 w-6" />
            <span className="font-bold">Stock IN (Purchase)</span>
          </button>
          <button
            onClick={() => { setType('sales'); setCart([]); setSelectedEntity(''); }}
            className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
              type === 'sales' 
                ? 'border-red-500 bg-red-50 text-red-700' 
                : 'border-gray-200 hover:border-red-200'
            }`}
          >
            <ArrowRight className="h-6 w-6" />
            <span className="font-bold">Stock OUT (Sales)</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Input */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4">1. Transaction Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select 
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={lockCategory}
                >
                  {(type === 'purchase' 
                    ? ['Manual', 'Return', 'Sample', 'Adjustment'] 
                    : ['Sales', 'Lost Items', 'Damaged Goods', 'Internal Testing', 'Adjustment']
                  ).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {category === 'Sales' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {type === 'purchase' ? 'Supplier' : 'Customer'}
                  </label>
                  <select 
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={selectedEntity}
                    onChange={(e) => setSelectedEntity(e.target.value)}
                  >
                    <option value="">-- Select {type === 'purchase' ? 'Supplier' : 'Customer'} --</option>
                    {type === 'purchase' 
                      ? suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                      : customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                    }
                  </select>
                </div>
              )}

              {category !== 'Sales' && type === 'purchase' && (
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier (Optional)</label>
                  <select 
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    value={selectedEntity}
                    onChange={(e) => setSelectedEntity(e.target.value)}
                  >
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea 
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={category !== 'Sales' ? "Reason (e.g. Broken)" : "Reference No, etc."}
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
                      {p.sku} - {p.name} ({p.stock} {p.unit})
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
                <Plus className="h-4 w-4" /> Add to List
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
                Items List
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

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={generateDocument}
                disabled={cart.length === 0 || !selectedEntity}
                className="py-3 px-4 border-2 border-gray-200 rounded-lg text-gray-600 font-bold hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <FileText className="h-5 w-5" />
                {type === 'purchase' ? 'Generate PO' : 'Generate Invoice'}
              </button>
              
              <button 
                onClick={handleSubmit}
                disabled={cart.length === 0 || (category === 'Sales' && !selectedEntity) || loading}
                className={`py-3 px-4 rounded-lg text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 ${
                  type === 'purchase' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                } ${category !== 'Sales' ? 'col-span-2' : ''}`}
              >
                {loading ? 'Processing...' : 'Confirm Transaction'}
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

