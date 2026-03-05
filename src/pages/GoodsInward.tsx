import React, { useEffect, useState } from 'react';
import { api, Order } from '@/lib/api';
import { CheckCircle, ClipboardList } from 'lucide-react';

export default function VerifyPO() {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [receiveItems, setReceiveItems] = useState<{product_id: number, quantity: number, price: number}[]>([]);

  useEffect(() => {
    loadPendingOrders();
  }, []);

  const loadPendingOrders = () => {
    api.getOrders({ status: 'pending', type: 'purchase' }).then(setPendingOrders);
  };

  const handleVerifyClick = (order: Order) => {
    setSelectedOrder(order);
    setReceiveItems(order.items.map(i => ({
      product_id: i.product_id,
      quantity: i.quantity,
      price: i.price || 0
    })));
    setIsModalOpen(true);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const newItems = [...receiveItems];
    newItems[index].quantity = qty;
    setReceiveItems(newItems);
  };

  const handleConfirmReceive = async () => {
    if (!selectedOrder) return;
    
    try {
      await api.receiveOrder(selectedOrder.id, receiveItems);
      setIsModalOpen(false);
      setSelectedOrder(null);
      loadPendingOrders();
    } catch (e) {
      console.error(e);
      alert('Failed to receive order');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Verify Purchase Orders</h1>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {!Array.isArray(pendingOrders) || pendingOrders.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center text-slate-500">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>No pending Purchase Orders found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendingOrders.map(order => (
              <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono font-bold text-lg text-slate-900">{order.reference_number}</span>
                    <span className="bg-amber-50 text-amber-700 border border-amber-100 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                      {order.status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 mb-3 flex items-center gap-2">
                    <span>{new Date(order.date).toLocaleDateString()}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className="font-medium text-slate-700">{order.supplier_name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {order.items.map((item, i) => (
                      <span key={i} className="text-xs bg-slate-50 text-slate-600 border border-slate-100 px-2 py-1 rounded-lg">
                        {item.product_name} <span className="font-medium text-slate-900">(x{item.quantity})</span>
                      </span>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={() => handleVerifyClick(order)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 font-medium whitespace-nowrap"
                >
                  <CheckCircle className="h-4 w-4" />
                  Receive
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verify Modal */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden ring-1 ring-slate-900/5">
            <div className="p-6 border-b border-gray-100 bg-white">
              <h2 className="text-xl font-bold text-slate-900">Verify Receipt: <span className="font-mono text-emerald-600">{selectedOrder.reference_number}</span></h2>
              <p className="text-sm text-slate-500 mt-1">Confirm actual quantities received from {selectedOrder.supplier_name}.</p>
            </div>
            
            <div className="p-0 overflow-auto max-h-[60vh]">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-500 uppercase text-xs font-semibold tracking-wider border-b border-gray-100 sticky top-0 backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4 text-right">Ordered</th>
                    <th className="px-6 py-4 text-right">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {selectedOrder.items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{item.product_name}</div>
                        <div className="text-xs text-slate-500 font-mono">{item.sku}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <input 
                          type="number" 
                          className="w-24 border border-gray-200 rounded-lg px-3 py-1.5 text-right focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-900"
                          value={receiveItems[index]?.quantity || 0}
                          onChange={(e) => handleQuantityChange(index, Number(e.target.value))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-white hover:text-slate-900 rounded-xl border border-transparent hover:border-gray-200 hover:shadow-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReceive}
                className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Confirm Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
