import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, Order, Settings } from '@/lib/api';
import { Printer } from 'lucide-react';

export default function DocumentPreview() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const type = searchParams.get('type'); // 'purchase' | 'sales'
  
  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && type) {
      Promise.all([
        api.getOrders({ type, status: undefined }).then(orders => orders.find(o => o.id === Number(id))),
        api.getSettings()
      ]).then(([orderData, settingsData]) => {
        setOrder(orderData || null);
        setSettings(settingsData);
        setLoading(false);
      });
    }
  }, [id, type]);

  if (loading) return <div className="p-8 text-center">Loading document...</div>;
  if (!order || !settings) return <div className="p-8 text-center text-red-500">Document not found</div>;

  const isPO = type === 'purchase';
  const title = isPO ? 'PURCHASE ORDER' : 'INVOICE';
  const total = order.items.reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0);

  return (
    <div className="min-h-screen bg-gray-100 p-8 print:p-0 print:bg-white">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl overflow-hidden print:shadow-none print:rounded-none">
        {/* Toolbar */}
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center print:hidden">
          <h2 className="font-bold">Document Preview</h2>
          <button 
            onClick={() => window.print()} 
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </button>
        </div>

        {/* Document Content */}
        <div className="p-12 print:p-8">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-gray-100 pb-8 mb-8">
            <div>
              {settings.logo_url && (
                <img src={settings.logo_url} alt="Logo" className="h-12 mb-4 object-contain" />
              )}
              <h1 className="text-2xl font-bold text-slate-900">{settings.company_name}</h1>
              <div className="text-slate-500 text-sm mt-2 whitespace-pre-line max-w-xs">
                {settings.address}
              </div>
              <div className="text-slate-500 text-sm mt-1">
                {settings.phone} | {settings.email}
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-bold text-slate-200 tracking-widest">{title}</h2>
              <div className="mt-4 space-y-1">
                <div className="flex justify-between gap-8 text-sm">
                  <span className="text-slate-500 font-medium">Reference:</span>
                  <span className="font-mono font-bold text-slate-900">{order.reference_number}</span>
                </div>
                <div className="flex justify-between gap-8 text-sm">
                  <span className="text-slate-500 font-medium">Date:</span>
                  <span className="text-slate-900">{new Date(order.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between gap-8 text-sm">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <span className="uppercase font-bold text-slate-900">{order.status}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recipient */}
          <div className="mb-12">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              {isPO ? 'Vendor / Supplier' : 'Bill To'}
            </h3>
            <div className="text-lg font-bold text-slate-900">{order.supplier_name || 'Unknown Entity'}</div>
            {/* We might need to fetch entity address details if not stored in order. For now, name is available. */}
          </div>

          {/* Items Table */}
          <table className="w-full mb-8">
            <thead>
              <tr className="border-b-2 border-slate-100">
                <th className="text-left py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Item / Description</th>
                <th className="text-right py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-24">Qty</th>
                <th className="text-right py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Unit Price</th>
                <th className="text-right py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {order.items.map((item, i) => (
                <tr key={i}>
                  <td className="py-4">
                    <div className="font-bold text-slate-900">{item.product_name}</div>
                    <div className="text-xs text-slate-500 font-mono">{item.sku}</div>
                  </td>
                  <td className="py-4 text-right text-slate-700">{item.quantity} {item.unit}</td>
                  <td className="py-4 text-right text-slate-700">
                    {settings.currency} {item.price?.toLocaleString()}
                  </td>
                  <td className="py-4 text-right font-medium text-slate-900">
                    {settings.currency} {((item.price || 0) * item.quantity).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-100">
                <td colSpan={3} className="pt-4 text-right font-bold text-slate-500">Total</td>
                <td className="pt-4 text-right font-bold text-2xl text-slate-900">
                  {settings.currency} {total.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Footer */}
          <div className="border-t border-gray-100 pt-8 mt-12 text-center text-slate-400 text-sm">
            <p>Thank you for your business.</p>
            <p className="mt-1 text-xs">Generated by ManufactureOS</p>
          </div>
        </div>
      </div>
    </div>
  );
}
