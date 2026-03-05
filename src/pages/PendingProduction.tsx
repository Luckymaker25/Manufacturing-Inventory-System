import React, { useEffect, useState } from 'react';
import { api, WorkOrder, WorkOrderMaterial } from '@/lib/api';
import { CheckCircle2, AlertTriangle, Clock, Factory, Printer, Loader2, ClipboardList, XCircle } from 'lucide-react';

const MaterialRequestModal = ({ 
  order, 
  onClose, 
  onApprove 
}: { 
  order: WorkOrder, 
  onClose: () => void, 
  onApprove: (id: number) => Promise<void> 
}) => {
  const [materials, setMaterials] = useState<WorkOrderMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    api.getWorkOrderMaterials(order.id).then(data => {
      setMaterials(data);
      setLoading(false);
    });
  }, [order.id]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await onApprove(order.id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Requested Materials</h2>
              <p className="text-sm font-medium text-slate-500">Batch: <span className="text-indigo-600 font-bold">{order.batch_id}</span> • {order.product_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <XCircle className="h-8 w-8" />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center py-12 text-slate-400">
              <Loader2 className="h-12 w-12 animate-spin mb-4" />
              <p className="font-bold uppercase text-xs tracking-widest">Loading Materials...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {materials.map((item) => {
                  const isInsufficient = item.current_stock < item.planned_qty;
                  return (
                    <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/30">
                      <div>
                        <div className="font-bold text-slate-900">{item.material_name}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Current Stock: <span className={isInsufficient ? "text-rose-600" : "text-emerald-600"}>{item.current_stock} {item.unit}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-indigo-600">{item.planned_qty.toFixed(2)}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Planned ({item.unit})</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-4 px-6 rounded-2xl text-sm font-black text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={loading || approving}
            className="flex-[2] py-4 px-6 rounded-2xl text-sm font-black text-white bg-slate-900 hover:bg-slate-800 shadow-2xl shadow-slate-200 transition-all disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest"
          >
            {approving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            Approve & Issue Materials
          </button>
        </div>
      </div>
    </div>
  );
};

const PendingProduction = () => {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [message, setMessage] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await api.getWorkOrders();
      setOrders(data.filter(o => o.status === 'Pending'));
    } catch (err) {
      console.error('Failed to load work orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleApprove = async (id: number) => {
    setMessage('');
    try {
      await api.approveWorkOrder(id);
      setMessage('Work order approved! Production team can now start the run.');
      loadOrders();
    } catch (err: any) {
      setMessage(`Error: ${err.response?.data?.error || err.message}`);
      throw err;
    }
  };

  const handlePrintBOM = async (order: WorkOrder) => {
    try {
      const materials = await api.getWorkOrderMaterials(order.id);
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const bomHtml = `
        <html>
          <head>
            <title>Material Release - ${order.batch_id}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #1e293b; }
              h1 { color: #0f172a; margin-bottom: 5px; }
              .subtitle { color: #64748b; font-size: 14px; margin-bottom: 30px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
              th { background-color: #f8fafc; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
              .header { margin-bottom: 30px; border-bottom: 2px solid #0f172a; padding-bottom: 15px; }
              .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
              .meta-item { font-size: 14px; }
              .meta-label { font-weight: bold; color: #64748b; text-transform: uppercase; font-size: 10px; }
              .footer { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 40px; text-align: center; }
              .signature-line { border-top: 1px solid #0f172a; margin-top: 50px; padding-top: 10px; font-size: 12px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Material Release Form</h1>
              <p class="subtitle">Production Batch: <strong>${order.batch_id}</strong></p>
            </div>
            
            <div class="meta">
              <div class="meta-item">
                <p class="meta-label">Product Details</p>
                <p><strong>${order.product_name}</strong></p>
                <p>${order.sku}</p>
              </div>
              <div class="meta-item">
                <p class="meta-label">Production Plan</p>
                <p>Target Qty: <strong>${order.target_qty} ${order.unit}</strong></p>
                <p>Date: ${new Date(order.date).toLocaleDateString()}</p>
              </div>
              <div class="meta-item">
                <p class="meta-label">Source / Reference</p>
                <p>${order.source_type} Order</p>
                <p>Ref: ${order.reference_no}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Raw Material</th>
                  <th style="text-align: right;">Planned Qty</th>
                  <th style="text-align: right;">Current Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${materials.map(item => `
                  <tr>
                    <td>
                      <strong>${item.material_name}</strong>
                    </td>
                    <td style="text-align: right;">${item.planned_qty} ${item.unit}</td>
                    <td style="text-align: right;">${item.current_stock} ${item.unit}</td>
                    <td>
                      ${item.current_stock >= item.planned_qty 
                        ? '<span style="color: #059669; font-weight: bold;">READY</span>' 
                        : '<span style="color: #dc2626; font-weight: bold;">INSUFFICIENT</span>'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="footer">
              <div>
                <div class="signature-line">Warehouse Staff</div>
              </div>
              <div>
                <div class="signature-line">Production Supervisor</div>
              </div>
              <div>
                <div class="signature-line">Plant Manager</div>
              </div>
            </div>
            <script>window.print();</script>
          </body>
        </html>
      `;
      printWindow.document.write(bomHtml);
      printWindow.document.close();
    } catch (err) {
      alert('Failed to load materials for printing');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading pending orders...</div>;

  return (
    <div className="space-y-4">
      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${message.includes('Error') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
          {message.includes('Error') ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          {message}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
            <tr>
              <th className="px-6 py-4">Batch ID</th>
              <th className="px-6 py-4">Source</th>
              <th className="px-6 py-4">Product</th>
              <th className="px-6 py-4 text-right">Target Qty</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-lg font-medium">No pending material requests</p>
                  <p className="text-sm">New production plans from PPIC will appear here for material release.</p>
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-black text-slate-900">
                    {order.batch_id}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      order.source_type === 'Sales' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {order.source_type}
                    </span>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">{order.reference_no}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{order.product_name}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{order.sku}</div>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-700">
                    {order.target_qty} <span className="text-[10px] font-normal text-slate-400 uppercase">{order.unit}</span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handlePrintBOM(order)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                      title="Print Material Release Form"
                    >
                      <Printer className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex inline-flex items-center gap-2"
                    >
                      <ClipboardList className="h-4 w-4" />
                      View Requested Materials
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <MaterialRequestModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
          onApprove={handleApprove} 
        />
      )}
    </div>
  );
};

export default PendingProduction;
