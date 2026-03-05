import React, { useState, useEffect } from 'react';
import Purchasing from './Purchasing';
import { ShoppingCart, History, Download, Printer } from 'lucide-react';
import { api, Order } from '@/lib/api';
import { exportToCSV } from '@/lib/exportUtils';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export default function PurchasingManagement() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'purchasing' | 'history'>(
    hasPermission(['Purchasing Officer']) ? 'purchasing' : 'history'
  );
  const [history, setHistory] = useState<Order[]>([]);

  useEffect(() => {
    if (activeTab === 'history') {
      api.getOrders({ type: 'purchase' }).then(data => {
        setHistory(data);
      });
    }
  }, [activeTab]);

  const handleExport = () => {
    const dataToExport = history.map(o => ({
      Date: new Date(o.date).toLocaleString(),
      Ref: o.reference_number,
      Supplier: o.supplier_name,
      Status: o.status,
      Payment: o.payment_status || 'unpaid',
      Items: o.items.length,
      Total: o.items.reduce((sum, i) => sum + (i.quantity * (i.price || 0)), 0)
    }));
    exportToCSV(dataToExport, 'purchase_orders');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Purchase Management</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto">
        {hasPermission(['Purchasing Officer']) && (
          <button
            onClick={() => setActiveTab('purchasing')}
            className={`pb-4 px-2 font-medium transition-colors relative whitespace-nowrap ${
              activeTab === 'purchasing' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Purchase Order (New)
            </div>
            {activeTab === 'purchasing' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
            )}
          </button>
        )}
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-4 px-2 font-medium transition-colors relative whitespace-nowrap ${
            activeTab === 'history' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            PO History
          </div>
          {activeTab === 'history' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'purchasing' && hasPermission(['Purchasing Officer']) && <Purchasing />}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Purchase Order History</h3>
              <button 
                onClick={handleExport}
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2 text-sm font-medium"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-slate-500 uppercase text-xs font-semibold tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">PO Number</th>
                    <th className="px-6 py-4">Supplier</th>
                    <th className="px-6 py-4 text-center">Items</th>
                    <th className="px-6 py-4 text-right">Total Value</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Payment</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-slate-500 italic">
                        No purchase orders found.
                      </td>
                    </tr>
                  ) : (
                    history.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                          {new Date(order.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 font-mono font-medium text-slate-900">
                          {order.reference_number}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{order.supplier_name || '-'}</td>
                        <td className="px-6 py-4 text-center text-slate-600">
                          {order.items.length}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-slate-900">
                          {order.items.reduce((sum, i) => sum + (i.quantity * (i.price || 0)), 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {order.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {order.payment_status ? order.payment_status.toUpperCase() : 'UNPAID'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link 
                            to={`/document?type=purchase&id=${order.id}`} 
                            target="_blank"
                            className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium text-xs bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md transition-colors"
                          >
                            <Printer className="h-3 w-3" />
                            Print PO
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
