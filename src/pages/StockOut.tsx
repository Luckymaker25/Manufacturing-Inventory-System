import React, { useEffect, useState } from 'react';
import { api, WorkOrder, WorkOrderMaterial, PendingSalesProduction } from '@/lib/api';
import { CheckCircle2, AlertTriangle, Clock, Factory, Printer, Loader2, ClipboardList, XCircle, ShoppingCart, PackageCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const hasInsufficientStock = materials.some(item => item.current_stock < item.planned_qty);

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
            disabled={loading || approving || hasInsufficientStock}
            className={cn(
              "flex-[2] py-4 px-6 rounded-2xl text-sm font-black text-white shadow-2xl shadow-slate-200 transition-all disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest",
              hasInsufficientStock ? "bg-slate-400 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800"
            )}
          >
            {approving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : hasInsufficientStock ? (
              <XCircle className="h-5 w-5" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
            {hasInsufficientStock ? "Insufficient Stock" : "Approve & Issue Materials"}
          </button>
        </div>
      </div>
    </div>
  );
};

const ProductionMaterialRequests = () => {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getWorkOrders();
      setOrders(data.filter(o => o.status === 'Pending'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (id: number) => {
    try {
      await api.approveWorkOrder(id);
      alert('Work Order Approved & Materials Issued');
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.response?.data?.error || err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {selectedOrder && (
        <MaterialRequestModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
          onApprove={handleApprove}
        />
      )}

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-12 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            Loading requests...
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-20 text-emerald-500" />
            No pending material requests
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Factory className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                        {order.batch_id}
                      </span>
                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(order.date).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg">{order.product_name}</h3>
                    <p className="text-sm text-slate-500 font-medium">Target: {order.target_qty} {order.unit}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrder(order)}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200 flex items-center gap-2"
                >
                  Review Materials
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const SalesFulfillmentRequests = () => {
  const [requests, setRequests] = useState<PendingSalesProduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getFulfillmentRequests();
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (item: PendingSalesProduction) => {
    const currentId = item.item_id || (item as any).id || item.order_id;

    if (confirmId !== currentId) {
      setConfirmId(currentId);
      setTimeout(() => setConfirmId(null), 3000);
      return;
    }
    
    setProcessingId(currentId);
    setConfirmId(null);

    try {
      await api.approveFulfillment(item.order_id);
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-12 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            Loading requests...
          </div>
        ) : !Array.isArray(requests) || requests.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-20 text-emerald-500" />
            No pending fulfillment requests
          </div>
        ) : (
          requests.map((item) => {
            const currentId = item.item_id || (item as any).id || item.order_id;
            const isInsufficient = (item.current_stock || 0) < item.target_qty;
            
            return (
              <div key={currentId} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <ShoppingCart className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                          {item.ref_no}
                        </span>
                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(item.date).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-lg">{item.product_name}</h3>
                      <div className="text-sm text-slate-500 font-medium mt-1 space-y-1">
                        <p>Customer: <span className="text-slate-900">{item.customer_name || 'Walk-in'}</span></p>
                        <div className="flex items-center gap-3 text-xs uppercase tracking-wider font-bold">
                          <span className="bg-slate-100 px-2 py-1 rounded-md text-slate-600">
                            Req: {item.target_qty}
                          </span>
                          <span className={cn(
                            "px-2 py-1 rounded-md",
                            isInsufficient ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                          )}>
                            Stock: {item.current_stock || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleApprove(item)}
                    disabled={processingId === currentId || isInsufficient}
                    className={cn(
                      "px-4 py-2 text-white text-xs font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
                      confirmId === currentId
                        ? "bg-rose-600 hover:bg-rose-700 shadow-rose-100 animate-pulse"
                        : isInsufficient 
                          ? "bg-slate-400 shadow-none" 
                          : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                    )}
                  >
                    {processingId === currentId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : confirmId === currentId ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : isInsufficient ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      <PackageCheck className="h-4 w-4" />
                    )}
                    {confirmId === currentId ? "Are you sure?" : isInsufficient ? "Insufficient Stock" : "Approve & Release"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default function StockOut() {
  const [activeTab, setActiveTab] = useState<'production' | 'sales'>('production');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock Out Requests</h1>
          <p className="text-slate-500">Manage material issuance and sales fulfillment</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('production')}
          className={`pb-4 px-2 font-medium transition-colors relative whitespace-nowrap ${
            activeTab === 'production' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Production Material Requests
          </div>
          {activeTab === 'production' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`pb-4 px-2 font-medium transition-colors relative whitespace-nowrap ${
            activeTab === 'sales' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Sales Fulfillment Requests
          </div>
          {activeTab === 'sales' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
          )}
        </button>
      </div>

      <div className="mt-6">
        {activeTab === 'production' ? <ProductionMaterialRequests /> : <SalesFulfillmentRequests />}
      </div>
    </div>
  );
}
