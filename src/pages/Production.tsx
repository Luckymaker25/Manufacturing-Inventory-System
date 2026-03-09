import React, { useEffect, useState } from 'react';
import { api, Product, BomItem, WorkOrder, WorkOrderMaterial, PendingSalesProduction } from '@/lib/api';
import {
  Factory, AlertTriangle, ClipboardList, TrendingUp, CheckCircle2,
  Printer, PlusCircle, Play, CheckCircle, XCircle, Loader2,
  ShoppingCart, LayoutDashboard, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// ---------------------------------------------------------------------------
// Section A: Make-to-Stock Form
// ---------------------------------------------------------------------------
const MakeToStockForm = ({ onPreview }: { onPreview: (product: Product, qty: number) => void }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [targetQty, setTargetQty] = useState(1);

  useEffect(() => {
    api.getProducts().then((data) => setProducts(data.filter((p) => p.type === 'finished')));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find((p) => p.id === selectedProduct);
    if (product) onPreview(product, targetQty);
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
          <Factory className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Make-to-Stock</h3>
          <p className="text-sm text-slate-500">Plan production for inventory replenishment</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Finished Good SKU
            </label>
            <select
              value={selectedProduct ?? ''}
              onChange={(e) => setSelectedProduct(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm bg-slate-50/50"
              required
            >
              <option value="">-- Select Product --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Target Quantity
            </label>
            <input
              type="number"
              min="1"
              value={targetQty}
              onChange={(e) => setTargetQty(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm bg-slate-50/50"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={!selectedProduct}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
        >
          <PlusCircle className="h-5 w-5" />
          Plan Production Order
        </button>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Section B: Pending Sales Queue
// ✅ FIX: Hapus semua (item as any) — gunakan item.item_id langsung
// ---------------------------------------------------------------------------
const PendingSalesQueue = ({
  onPreview,
  onRefresh,
}: {
  onPreview: (item: PendingSalesProduction) => void;
  onRefresh: () => void;
}) => {
  const [pending, setPending] = useState<PendingSalesProduction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [fulfillingId, setFulfillingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pendingData, productsData] = await Promise.all([
        api.getPendingSalesForProduction(),
        api.getProducts(),
      ]);
      setPending(pendingData);
      setProducts(productsData);
    } catch (err) {
      console.error('Failed to load pending sales', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRequestRelease = async (item: PendingSalesProduction) => {
    // ✅ FIX: item_id sekarang selalu ada — tidak perlu fallback chain
    const itemId = item.item_id;

    if (fulfillingId !== null) return;

    const product = products.find((p) => p.id === item.product_id);
    if (!product) return;

    if (confirmId !== itemId) {
      setConfirmId(itemId);
      setTimeout(() => setConfirmId(null), 3000);
      return;
    }

    setFulfillingId(itemId);
    setConfirmId(null);

    try {
      // requestFulfillment menggunakan order_id (bukan item_id)
      await api.requestFulfillment(item.order_id);
      loadData();
      onRefresh();
    } catch (err) {
      console.error('Request fulfillment failed', err);
    } finally {
      setFulfillingId(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Pending Sales Queue</h3>
            <p className="text-sm text-slate-500">Sales orders requiring production planning or fulfillment</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400"
        >
          <TrendingUp className="h-5 w-5" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-bold tracking-widest">
            <tr>
              <th className="px-8 py-4">Date</th>
              <th className="px-8 py-4">Ref No</th>
              <th className="px-8 py-4">Customer</th>
              <th className="px-8 py-4">Target Item</th>
              <th className="px-8 py-4 text-center">In Stock</th>
              <th className="px-8 py-4 text-right">Target Qty</th>
              <th className="px-8 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-8 py-12 text-center text-slate-400">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  Fetching pending sales...
                </td>
              </tr>
            ) : pending.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-8 py-12 text-center text-slate-400">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-20 text-emerald-500" />
                  No pending sales orders requiring action
                </td>
              </tr>
            ) : (
              pending.map((item) => {
                const product = products.find((p) => p.id === item.product_id);
                const hasStock = product ? product.stock >= item.target_qty : false;
                // ✅ FIX: Pakai item.item_id langsung — tidak ada lagi (item as any)
                const itemId = item.item_id;

                return (
                  <tr key={itemId} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-4 text-slate-500">
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-4 font-mono text-xs font-bold text-slate-900">
                      {item.ref_no}
                    </td>
                    <td className="px-8 py-4 text-slate-600 font-medium">
                      {item.customer_name || 'Walk-in Customer'}
                    </td>
                    <td className="px-8 py-4">
                      <div className="font-bold text-slate-900">{item.product_name}</div>
                      <div className="text-[10px] text-slate-400">{item.sku}</div>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <span
                        className={cn(
                          'px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest',
                          hasStock ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600',
                        )}
                      >
                        {product?.stock ?? 0} {product?.unit ?? 'pcs'}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-right font-bold text-slate-900">
                      {item.target_qty}
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleRequestRelease(item)}
                          disabled={fulfillingId === itemId}
                          className={cn(
                            'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                            confirmId === itemId
                              ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                              : hasStock
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-amber-500 hover:bg-amber-600 text-white',
                          )}
                        >
                          {fulfillingId === itemId ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : confirmId === itemId ? (
                            <AlertTriangle className="h-3 w-3" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          {confirmId === itemId ? 'Are you sure?' : 'Request Release'}
                        </button>
                        <button
                          onClick={() => onPreview(item)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold transition-all shadow-sm"
                        >
                          <PlusCircle className="h-3 w-3" />
                          Generate WO
                        </button>
                      </div>
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
};

// ---------------------------------------------------------------------------
// Material Request Preview Modal (create work order)
// ---------------------------------------------------------------------------
const MaterialRequestModal = ({
  product,
  targetQty,
  sourceType,
  referenceNo,
  onClose,
  onConfirm,
}: {
  product: { id: number; name: string; unit: string };
  targetQty: number;
  sourceType: 'Sales' | 'Restock';
  referenceNo: string;
  onClose: () => void;
  onConfirm: () => void;
}) => {
  const [bom, setBom] = useState<BomItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getBom(product.id).then((data) => {
      setBom(data);
      setLoading(false);
    });
  }, [product.id]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await api.createWorkOrder({
        source_type: sourceType,
        reference_no: referenceNo,
        finished_good_id: product.id,
        target_qty: targetQty,
      });
      onConfirm();
      onClose();
    } catch (err) {
      console.error('Failed to create work order', err);
      alert('Failed to create work order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Material Request Preview</h2>
              <p className="text-sm font-medium text-slate-500">
                Review BOM for {product.name} ({targetQty} {product.unit})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
          >
            <XCircle className="h-8 w-8" />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center py-12 text-slate-400">
              <Loader2 className="h-12 w-12 animate-spin mb-4" />
              <p className="font-bold uppercase text-xs tracking-widest">Calculating Requirements...</p>
            </div>
          ) : bom.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-bold">No BOM defined for this product.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {bom.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/30"
                >
                  <div>
                    <div className="font-bold text-slate-900">{item.raw_material_name}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Unit Requirement: {item.quantity} {item.unit}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-indigo-600">
                      {(item.quantity * targetQty).toFixed(2)}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Total Required ({item.unit})
                    </div>
                  </div>
                </div>
              ))}
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
            onClick={handleConfirm}
            disabled={loading || bom.length === 0}
            className="flex-[2] py-4 px-6 rounded-2xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xl shadow-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
            Confirm & Request Materials
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Complete Work Order Modal
// ---------------------------------------------------------------------------
const CompleteWOModal = ({
  wo,
  onClose,
  onCompleted,
}: {
  wo: WorkOrder;
  onClose: () => void;
  onCompleted: () => void;
}) => {
  const [materials, setMaterials] = useState<WorkOrderMaterial[]>([]);
  const [actualQtys, setActualQtys] = useState<Record<number, number>>({});
  const [goodQty, setGoodQty] = useState(wo.target_qty);
  const [rejectQty, setRejectQty] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getWorkOrderMaterials(wo.id).then((data) => {
      setMaterials(data);
      const initialQtys: Record<number, number> = {};
      data.forEach((m) => {
        initialQtys[m.raw_material_id] = m.planned_qty;
      });
      setActualQtys(initialQtys);
    });
  }, [wo.id]);

  const handleComplete = async () => {
    setLoading(true);
    setError('');
    try {
      await api.completeWorkOrder(wo.id, {
        actual_materials: Object.entries(actualQtys).map(([id, qty]) => ({
          raw_material_id: Number(id),
          actual_qty: Number(qty),
        })),
        good_qty: goodQty,
        reject_qty: rejectQty,
      });
      onCompleted();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Complete Production</h2>
              <p className="text-sm font-medium text-slate-500">
                Batch: <span className="text-indigo-600 font-bold">{wo.batch_id}</span> •{' '}
                {wo.product_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
          >
            <XCircle className="h-8 w-8" />
          </button>
        </div>

        <div className="p-8 space-y-10 overflow-y-auto flex-1">
          {/* Material usage */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-indigo-500" />
                Material Usage Report
              </h3>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                BOM SNAPSHOT
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {materials.map((mat) => {
                const actual = actualQtys[mat.raw_material_id] ?? 0;
                const variance = actual - mat.planned_qty;
                return (
                  <div
                    key={mat.id}
                    className="group grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all"
                  >
                    <div className="md:col-span-5">
                      <div className="font-bold text-slate-900 text-sm">{mat.material_name}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Planned: {mat.planned_qty} {mat.unit}
                      </div>
                    </div>
                    <div className="md:col-span-7 flex items-center gap-4">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          value={actual}
                          onChange={(e) =>
                            setActualQtys((prev) => ({
                              ...prev,
                              [mat.raw_material_id]: Number(e.target.value),
                            }))
                          }
                          className="w-full rounded-xl border-2 border-slate-100 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                          placeholder="Actual Qty"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">
                          {mat.unit}
                        </span>
                      </div>
                      <div
                        className={cn(
                          'text-[10px] font-black px-2 py-1 rounded-lg',
                          variance > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600',
                        )}
                      >
                        {variance.toFixed(1)} VAR
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Yield */}
          <section className="bg-slate-900 rounded-[2rem] p-8 text-white">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                Production Yield
              </h3>
              <div className="text-[10px] font-bold text-slate-400">
                TARGET: {wo.target_qty} {wo.unit}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                  Good Quantity (Passed QC)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={goodQty}
                    onChange={(e) => setGoodQty(Number(e.target.value))}
                    className="w-full rounded-2xl border-2 border-emerald-500/20 bg-emerald-500/5 px-6 py-4 text-2xl font-black text-emerald-400 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-500/40 uppercase">
                    {wo.unit}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-red-400 uppercase tracking-widest">
                  Reject / Scrap Quantity
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={rejectQty}
                    onChange={(e) => setRejectQty(Number(e.target.value))}
                    className="w-full rounded-2xl border-2 border-red-500/20 bg-red-500/5 px-6 py-4 text-2xl font-black text-red-400 focus:ring-4 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-red-500/40 uppercase">
                    {wo.unit}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm font-bold flex items-center gap-3">
              <AlertTriangle className="h-5 w-5" />
              {error}
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
            onClick={handleComplete}
            disabled={loading}
            className="flex-[2] py-4 px-6 rounded-2xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xl shadow-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle className="h-5 w-5" />
            )}
            Finalize Production Report
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Production Board
// ---------------------------------------------------------------------------
const ProductionBoard = ({
  orders,
  onUpdate,
}: {
  orders: WorkOrder[];
  onUpdate: () => void;
}) => {
  const [completingWO, setCompletingWO] = useState<WorkOrder | null>(null);

  const handleStartProduction = async (id: number) => {
    try {
      await api.updateWorkOrderStatus(id, 'WIP');
      onUpdate();
    } catch (err) {
      console.error('Failed to start production', err);
      alert('Failed to start production');
    }
  };

  const activeOrders = orders.filter((o) => ['Approved', 'WIP'].includes(o.status));

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Production Board</h3>
            <p className="text-sm text-slate-500">Execution monitoring and reporting</p>
          </div>
        </div>
        <div className="flex gap-4">
          {(['Pending', 'WIP', 'Done'] as const).map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={cn('h-2 w-2 rounded-full', [
                  'bg-slate-300',
                  'bg-blue-400',
                  'bg-emerald-400',
                ][i])}
              />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-bold tracking-widest">
            <tr>
              <th className="px-8 py-4">Batch ID</th>
              <th className="px-8 py-4">Source</th>
              <th className="px-8 py-4">Ref No</th>
              <th className="px-8 py-4">Target Item</th>
              <th className="px-8 py-4 text-right">Target Qty</th>
              <th className="px-8 py-4 text-center">Status</th>
              <th className="px-8 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {activeOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-8 py-12 text-center text-slate-400">
                  <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  No active work orders on the board
                </td>
              </tr>
            ) : (
              activeOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-4 font-black text-slate-900">{order.batch_id}</td>
                  <td className="px-8 py-4">
                    <span
                      className={cn(
                        'px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest',
                        order.source_type === 'Sales'
                          ? 'bg-purple-50 text-purple-600 border border-purple-100'
                          : 'bg-blue-50 text-blue-600 border border-blue-100',
                      )}
                    >
                      {order.source_type}
                    </span>
                  </td>
                  <td className="px-8 py-4 font-mono text-xs font-bold text-slate-400 group-hover:text-slate-900 transition-colors">
                    {order.reference_no}
                  </td>
                  <td className="px-8 py-4">
                    <div className="font-bold text-slate-900">{order.product_name}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {order.sku}
                    </div>
                  </td>
                  <td className="px-8 py-4 text-right font-black text-slate-700">
                    {order.target_qty}{' '}
                    <span className="text-[10px] font-normal text-slate-400 uppercase">
                      {order.unit}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <span
                      className={cn(
                        'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest',
                        order.status === 'Approved' &&
                          'bg-amber-50 text-amber-600 border border-amber-100',
                        order.status === 'WIP' &&
                          'bg-blue-50 text-blue-600 border border-blue-100',
                      )}
                    >
                      {order.status === 'Approved' && <CheckCircle className="h-3 w-3" />}
                      {order.status === 'WIP' && <Play className="h-3 w-3 animate-pulse" />}
                      {order.status}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    {order.status === 'Approved' && (
                      <button
                        onClick={() => handleStartProduction(order.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-slate-200"
                      >
                        <Play className="h-3 w-3" />
                        Start Production
                      </button>
                    )}
                    {order.status === 'WIP' && (
                      <button
                        onClick={() => setCompletingWO(order)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-100"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {completingWO && (
        <CompleteWOModal
          wo={completingWO}
          onClose={() => setCompletingWO(null)}
          onCompleted={onUpdate}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function Production() {
  const [activeTab, setActiveTab] = useState<'planning' | 'execution'>('execution');
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [previewData, setPreviewData] = useState<{
    product: { id: number; name: string; unit: string };
    qty: number;
    sourceType: 'Sales' | 'Restock';
    referenceNo: string;
  } | null>(null);

  const loadWorkOrders = async () => {
    try {
      const data = await api.getWorkOrders();
      setWorkOrders(data);
    } catch (err) {
      console.error('Failed to load work orders', err);
    }
  };

  useEffect(() => {
    loadWorkOrders();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-5 bg-slate-900 text-white rounded-[2rem] shadow-2xl shadow-slate-200">
            <Factory className="h-10 w-10" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Manufacturing ERP</h1>
            <p className="text-slate-500 font-bold uppercase text-xs tracking-[0.3em] mt-1">
              Production Control Center
            </p>
          </div>
        </div>

        <div className="flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
          {(['planning', 'execution'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600',
              )}
            >
              {tab === 'planning' ? 'PPIC / Planning' : 'Production Board'}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-8"
        >
          {activeTab === 'planning' && (
            <>
              <MakeToStockForm
                onPreview={(product, qty) =>
                  setPreviewData({
                    product,
                    qty,
                    sourceType: 'Restock',
                    referenceNo: 'AUTO',
                  })
                }
              />
              <PendingSalesQueue
                onRefresh={loadWorkOrders}
                onPreview={(item) =>
                  setPreviewData({
                    product: { id: item.product_id, name: item.product_name, unit: 'pcs' },
                    qty: item.target_qty,
                    sourceType: 'Sales',
                    referenceNo: item.ref_no,
                  })
                }
              />
            </>
          )}
          {activeTab === 'execution' && (
            <ProductionBoard orders={workOrders} onUpdate={loadWorkOrders} />
          )}
        </motion.div>
      </AnimatePresence>

      {previewData && (
        <MaterialRequestModal
          product={previewData.product}
          targetQty={previewData.qty}
          sourceType={previewData.sourceType}
          referenceNo={previewData.referenceNo}
          onClose={() => setPreviewData(null)}
          onConfirm={loadWorkOrders}
        />
      )}
    </div>
  );
}
