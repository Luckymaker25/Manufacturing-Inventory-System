import React, { useEffect, useState } from 'react';
import { api, Order, Product, Supplier } from '@/lib/api';
import { CheckCircle, ClipboardList, PackageCheck, ArrowRight, Search } from 'lucide-react';
import Transactions from './Transactions'; // Reuse the component for Direct Input

export default function GoodsInward() {
  const [activeTab, setActiveTab] = useState<'verify' | 'direct'>('verify');
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [receiveItems, setReceiveItems] = useState<{product_id: number, quantity: number, price: number}[]>([]);

  useEffect(() => {
    if (activeTab === 'verify') {
      loadPendingOrders();
    }
  }, [activeTab]);

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
        <h1 className="text-2xl font-bold text-gray-900">Goods Inward</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('verify')}
          className={`pb-4 px-2 font-medium transition-colors relative ${
            activeTab === 'verify' ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Verify PO
          </div>
          {activeTab === 'verify' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('direct')}
          className={`pb-4 px-2 font-medium transition-colors relative ${
            activeTab === 'direct' ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Direct Manual Input
          </div>
          {activeTab === 'direct' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
          )}
        </button>
      </div>

      {/* Content */}
      {activeTab === 'verify' ? (
        <div className="space-y-4">
          {pendingOrders.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-dashed border-gray-300 text-center text-gray-500">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No pending Purchase Orders found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingOrders.map(order => (
                <div key={order.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono font-bold text-lg text-gray-900">{order.reference_number}</span>
                      <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-medium uppercase">
                        {order.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mb-2">
                      {new Date(order.date).toLocaleDateString()} • {order.supplier_name}
                    </div>
                    <div className="flex gap-2">
                      {order.items.map((item, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {item.product_name} (x{item.quantity})
                        </span>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleVerifyClick(order)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Receive
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
           <div className="bg-white p-6 rounded-xl shadow-sm">
             <h3 className="font-bold text-gray-900 mb-4">Direct Stock IN (Non-PO)</h3>
             <Transactions defaultType="purchase" hideTypeToggle={true} />
           </div>
        </div>
      )}

      {/* Verify Modal */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Verify Receipt: {selectedOrder.reference_number}</h2>
              <p className="text-sm text-gray-500">Confirm actual quantities received.</p>
            </div>
            
            <div className="p-6 overflow-auto max-h-[60vh]">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-right">Ordered Qty</th>
                    <th className="px-4 py-3 text-right">Received Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedOrder.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.product_name}</div>
                        <div className="text-xs text-gray-500">{item.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input 
                          type="number" 
                          className="w-24 border rounded px-2 py-1 text-right"
                          value={receiveItems[index]?.quantity || 0}
                          onChange={(e) => handleQuantityChange(index, Number(e.target.value))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg border border-gray-300 bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReceive}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
              >
                Confirm Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
