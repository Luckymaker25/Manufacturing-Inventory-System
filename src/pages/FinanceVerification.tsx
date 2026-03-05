import React, { useEffect, useState } from 'react';
import { api, Order } from '@/lib/api';
import { CheckCircle, XCircle, DollarSign, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FinanceVerification() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = () => {
    setLoading(true);
    api.getOrders({ type: 'purchase' }).then(data => {
      setOrders(data);
      setLoading(false);
    });
  };

  const handleTogglePayment = async (order: Order) => {
    const newStatus = order.payment_status === 'paid' ? 'unpaid' : 'paid';
    try {
      await api.updateOrderPaymentStatus(order.id, newStatus);
      // Optimistic update
      setOrders(orders.map(o => o.id === order.id ? { ...o, payment_status: newStatus } : o));
    } catch (error) {
      console.error('Failed to update payment status', error);
      alert('Failed to update payment status');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading orders...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Finance Verification</h3>
          <p className="text-slate-500 text-sm">Verify and update payment status for Purchase Orders.</p>
        </div>
        <div className="flex gap-2">
           <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
             <CheckCircle className="h-4 w-4" /> Paid
           </div>
           <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium">
             <AlertCircle className="h-4 w-4" /> Unpaid
           </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/50 text-slate-500 uppercase text-xs font-semibold tracking-wider border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">PO Number</th>
              <th className="px-6 py-4">Supplier</th>
              <th className="px-6 py-4 text-right">Total Amount</th>
              <th className="px-6 py-4 text-center">Order Status</th>
              <th className="px-6 py-4 text-center">Payment Status</th>
              <th className="px-6 py-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500 italic">
                  No purchase orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const total = order.items.reduce((sum, i) => sum + (i.quantity * (i.price || 0)), 0);
                const isPaid = order.payment_status === 'paid';

                return (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                      {new Date(order.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-slate-900">
                      {order.reference_number}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{order.supplier_name || '-'}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                      ${total.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        order.status === 'completed' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                      )}>
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border",
                        isPaid 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      )}>
                        {isPaid ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        {isPaid ? 'PAID' : 'UNPAID'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleTogglePayment(order)}
                        className={cn(
                          "text-xs font-medium px-3 py-1.5 rounded-lg transition-all border shadow-sm flex items-center gap-1 mx-auto",
                          isPaid
                            ? "bg-white text-slate-600 border-gray-200 hover:bg-gray-50 hover:text-slate-900"
                            : "bg-emerald-600 text-white border-transparent hover:bg-emerald-700"
                        )}
                      >
                        <DollarSign className="h-3 w-3" />
                        {isPaid ? 'Mark Unpaid' : 'Mark as Paid'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
