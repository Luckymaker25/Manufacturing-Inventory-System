import React, { useEffect, useState } from 'react';
import { api, Product, BomItem } from '@/lib/api';
import { Factory, AlertCircle } from 'lucide-react';

export default function Production() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [bom, setBom] = useState<BomItem[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.getProducts().then(setProducts);
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      api.getBom(selectedProduct).then(setBom);
    } else {
      setBom([]);
    }
  }, [selectedProduct]);

  const handleProduction = async () => {
    if (!selectedProduct) return;
    setLoading(true);
    setMessage('');
    try {
      await api.runProduction({
        finished_good_id: selectedProduct,
        quantity,
        notes: `Production Run: ${new Date().toLocaleString()}`
      });
      setMessage('Production successful! Stock updated.');
      setQuantity(1);
    } catch (err: any) {
      setMessage(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const finishedGoods = products.filter(p => p.type === 'finished');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl">
          <Factory className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manufacturing Module</h1>
          <p className="text-gray-500">Convert Raw Materials into Finished Goods</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Selection Panel */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Product to Manufacture</label>
            <select 
              className="w-full rounded-lg border border-gray-300 px-4 py-2 mb-4"
              onChange={(e) => setSelectedProduct(Number(e.target.value))}
              value={selectedProduct || ''}
            >
              <option value="">-- Select Finished Good --</option>
              {finishedGoods.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>

            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity to Produce</label>
            <input 
              type="number" 
              min="1" 
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 mb-6"
            />

            <button
              onClick={handleProduction}
              disabled={!selectedProduct || loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Processing...' : 'Run Production'}
            </button>
            
            {message && (
              <div className={`mt-4 p-3 rounded-lg text-sm ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {message}
              </div>
            )}
          </div>
        </div>

        {/* BOM Preview Panel */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Bill of Materials (BOM) Requirement</h3>
            
            {!selectedProduct ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <AlertCircle className="h-12 w-12 mb-2 opacity-20" />
                <p>Select a product to view material requirements</p>
              </div>
            ) : bom.length === 0 ? (
              <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg">
                No BOM defined for this product. Production cannot proceed.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">Raw Material</th>
                      <th className="px-4 py-3 text-right">Qty Per Unit</th>
                      <th className="px-4 py-3 text-right">Total Required</th>
                      <th className="px-4 py-3 text-right">Current Stock</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bom.map((item) => {
                      const required = item.quantity * quantity;
                      // In a real app, we'd fetch current stock for each BOM item. 
                      // For this demo, we'll assume we have the data or fetch it.
                      // Simplified: We'll just show the requirement.
                      return (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="px-4 py-3 font-medium">{item.raw_material_name}</td>
                          <td className="px-4 py-3 text-right">{item.quantity} {item.unit}</td>
                          <td className="px-4 py-3 text-right font-bold">{required} {item.unit}</td>
                          <td className="px-4 py-3 text-right text-gray-400">-</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">Check Stock</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
