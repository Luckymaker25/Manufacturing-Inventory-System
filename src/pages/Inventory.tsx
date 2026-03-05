import React, { useEffect, useState, useRef } from 'react';
import { api, Product, Supplier, Transaction } from '@/lib/api';
import { exportToCSV } from '@/lib/exportUtils';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, Search, Plus, Trash2, Edit, X, Download, AlertTriangle, ShoppingCart, Send } from 'lucide-react';

interface SupplierBadgeProps {
  supplier: Supplier;
}

const SupplierBadge: React.FC<SupplierBadgeProps> = ({ supplier }) => {
  const [isOpen, setIsOpen] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (badgeRef.current && !badgeRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={badgeRef} className="relative inline-block">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          "text-xs px-2 py-1 rounded-md border transition-colors inline-block cursor-pointer select-none",
          isOpen
            ? "bg-slate-800 text-white border-slate-800"
            : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:text-slate-800"
        )}
      >
        {supplier.name}
      </button>
      {isOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl shadow-xl z-50 text-left cursor-auto">
          <div className="font-bold text-emerald-400 mb-1.5 text-sm border-b border-slate-700 pb-1">{supplier.name}</div>
          <div className="space-y-1.5 text-slate-300">
            <div className="flex items-start gap-2">
              <span className="opacity-50 font-mono text-[10px] uppercase tracking-wider mt-0.5">Email</span>
              <span className="flex-1 break-all">{supplier.email || 'N/A'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="opacity-50 font-mono text-[10px] uppercase tracking-wider mt-0.5">Addr</span>
              <span className="flex-1">{supplier.address || 'N/A'}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="opacity-50 font-mono text-[10px] uppercase tracking-wider mt-0.5">Tel</span>
              <span className="flex-1">{supplier.contact || 'N/A'}</span>
            </div>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
        </div>
      )}
    </div>
  );
};

export default function Inventory() {
  const [activeTab, setActiveTab] = useState<'all' | 'low-stock'>('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  // Purchase Request State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestProduct, setRequestProduct] = useState<Product | null>(null);
  const [requestQty, setRequestQty] = useState(0);
  const [requestNotes, setRequestNotes] = useState('');
  const [requestedProductIds, setRequestedProductIds] = useState<number[]>([]);
  const { role, hasPermission } = useAuth();

  // Form State
  const [itemType, setItemType] = useState<'raw' | 'finished'>('raw');
  const [selectedSuppliers, setSelectedSuppliers] = useState<number[]>([]);
  const [bomItems, setBomItems] = useState<{ raw_material_id: number; quantity: number }[]>([]);

  useEffect(() => {
    loadData();
    loadRequestedProducts();
  }, []);

  const loadData = () => {
    api.getProducts().then(setProducts);
    api.getSuppliers().then(setSuppliers);
  };

  const loadRequestedProducts = async () => {
    try {
      const requests = await api.getPurchaseRequests();
      if (Array.isArray(requests)) {
        setRequestedProductIds(requests.map(r => r.product_id));
      } else {
        setRequestedProductIds([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestPurchase = (product: Product) => {
    setRequestProduct(product);
    const suggestedQty = Math.max(product.min_stock * 2 - product.stock, 1);
    setRequestQty(suggestedQty); 
    setRequestNotes('');
    setIsRequestModalOpen(true);
  };

  const submitPurchaseRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestProduct) return;

    try {
      await api.createPurchaseRequest({
        product_id: requestProduct.id,
        requested_qty: requestQty,
        notes: requestNotes
      });
      setRequestedProductIds([...requestedProductIds, requestProduct.id]);
      setIsRequestModalOpen(false);
      alert('Purchase Request Sent!');
    } catch (err) {
      alert('Failed to send request');
    }
  };

  const handleExport = () => {
    const dataToExport = products.map(p => ({
      ID: p.id,
      Name: p.name,
      SKU: p.sku,
      Type: p.type,
      Stock: p.stock,
      Unit: p.unit,
      MinStock: p.min_stock,
      CostPrice: p.cost_price,
      Suppliers: p.suppliers?.map(s => s.name).join(', ') || ''
    }));
    exportToCSV(dataToExport, 'inventory_data');
  };

  const handleEdit = async (product: Product) => {
    // Fetch full product details including BOM if needed (though current list might have it if we updated the API to return BOM always, but let's fetch single to be safe or assume list has it)
    // Actually the list API returns suppliers. For BOM, we might need to fetch it if it's not in the list.
    // Let's check api.ts. getProducts returns Product[]. Product interface doesn't have BOM.
    // We need to fetch BOM if it's a finished good.
    
    setEditingProduct(product);
    setItemType(product.type);
    
    if (product.type === 'raw') {
      setSelectedSuppliers(product.suppliers?.map(s => s.id) || []);
      setBomItems([]);
    } else {
      setSelectedSuppliers([]);
      // Fetch BOM
      try {
        const bom = await api.getBom(product.id);
        setBomItems(bom.map(b => ({ raw_material_id: b.raw_material_id, quantity: b.quantity })));
      } catch (e) {
        setBomItems([]);
      }
    }
    
    setIsModalOpen(true);
  };

  const handleViewHistory = async (product: Product) => {
    setHistoryProduct(product);
    try {
      const data = await api.getProductTransactions(product.id);
      setHistory(data);
      setIsHistoryModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const columnHelper = createColumnHelper<Product>();

  const columns = [
    columnHelper.accessor('sku', {
      header: 'SKU',
      cell: info => <span className="font-mono font-medium text-gray-900">{info.getValue()}</span>,
    }),
    columnHelper.accessor('name', {
      header: 'Product Name',
      cell: info => (
        <button 
          onClick={() => handleViewHistory(info.row.original)}
          className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline text-left"
        >
          {info.getValue()}
        </button>
      ),
    }),
    columnHelper.accessor('type', {
      header: 'Type',
      cell: info => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          info.getValue() === 'raw' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
        }`}>
          {info.getValue().toUpperCase()}
        </span>
      ),
    }),
    columnHelper.accessor('cost_price', {
      header: 'HPP (Cost)',
      cell: info => (
        <span className="font-mono text-gray-600">
          ${(info.getValue() || 0).toLocaleString()}
        </span>
      ),
    }),
    columnHelper.accessor('stock', {
      header: ({ column }) => {
        return (
          <button
            className="flex items-center gap-1 hover:text-gray-900"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Stock
            <ArrowUpDown className="h-3 w-3" />
          </button>
        )
      },
      cell: info => (
        <span className={info.getValue() <= info.row.original.min_stock ? 'text-red-600 font-bold' : ''}>
          {info.getValue()} {info.row.original.unit}
        </span>
      ),
    }),
    columnHelper.accessor('suppliers', {
      header: 'Suppliers',
      cell: info => {
        const sups = info.getValue();
        if (!sups || sups.length === 0) return <span className="text-slate-400 text-xs italic">No suppliers</span>;
        return (
          <div className="flex flex-wrap gap-1.5">
            {sups.map(s => (
              <SupplierBadge key={s.id} supplier={s} />
            ))}
          </div>
        );
      }
    }),
    columnHelper.display({
      id: 'actions',
      cell: info => {
        const product = info.row.original;
        const isRequested = requestedProductIds.includes(product.id);
        return (
          <div className="flex items-center gap-1 justify-end">
            <button
              onClick={() => handleRequestPurchase(product)}
              disabled={isRequested}
              title={isRequested ? "Already Requested" : "Request Purchase"}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                isRequested 
                  ? "text-blue-400 bg-blue-50 cursor-not-allowed" 
                  : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"
              )}
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
            {hasPermission(['Warehouse Staff']) && (
              <button 
                onClick={() => handleEdit(product)}
                className="text-slate-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                title="Edit Product"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      }
    })
  ];

  const table = useReactTable({
    data: products,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const productData = {
      name: formData.get('name') as string,
      sku: formData.get('sku') as string,
      type: itemType,
      stock: Number(formData.get('stock')),
      unit: formData.get('unit') as string,
      min_stock: Number(formData.get('min_stock')),
      cost_price: Number(formData.get('cost_price')),
      supplier_ids: itemType === 'raw' ? selectedSuppliers : undefined,
      bom: itemType === 'finished' ? bomItems : undefined,
    };

    if (editingProduct) {
      await api.updateProduct(editingProduct.id, productData);
    } else {
      await api.addProduct(productData);
    }
    
    setIsModalOpen(false);
    resetForm();
    loadData();
  };

  const resetForm = () => {
    setEditingProduct(null);
    setItemType('raw');
    setSelectedSuppliers([]);
    setBomItems([]);
  };

  const toggleSupplier = (id: number) => {
    setSelectedSuppliers(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const addBomItem = () => {
    setBomItems([...bomItems, { raw_material_id: 0, quantity: 1 }]);
  };

  const updateBomItem = (index: number, field: 'raw_material_id' | 'quantity', value: number) => {
    const newBom = [...bomItems];
    newBom[index] = { ...newBom[index], [field]: value };
    setBomItems(newBom);
  };

  const removeBomItem = (index: number) => {
    setBomItems(bomItems.filter((_, i) => i !== index));
  };

  const rawMaterials = products.filter(p => p.type === 'raw');
  const lowStockProducts = products.filter(p => p.stock <= p.min_stock);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <div className="flex gap-2">
          {hasPermission(['Warehouse Staff']) && (
            <button 
              onClick={handleExport}
              className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 font-medium"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          )}
          {hasPermission(['Warehouse Staff']) && (
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 font-medium"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-4 px-2 font-medium transition-colors relative whitespace-nowrap ${
            activeTab === 'all' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          All Items
          {activeTab === 'all' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('low-stock')}
          className={`pb-4 px-2 font-medium transition-colors relative whitespace-nowrap ${
            activeTab === 'low-stock' ? 'text-rose-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Low Stock & Requests
            <span className="bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full">
              {lowStockProducts.length}
            </span>
          </div>
          {activeTab === 'low-stock' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600" />
          )}
        </button>
      </div>

      {activeTab === 'all' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(e.target.value)}
              placeholder="Search products..."
              className="pl-10 pr-4 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
          <div className="flex gap-2">
             {/* Future filters could go here */}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/50 border-b border-gray-100">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-6 py-4">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-gray-50">
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-4 text-slate-600 group-hover:text-slate-900 transition-colors">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              Low Stock Items
            </h2>
            <p className="text-slate-500 text-sm mt-1">Items below minimum stock level needing replenishment.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-500 uppercase text-xs font-semibold tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">SKU</th>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4 text-right">Current Stock</th>
                  <th className="px-6 py-4 text-right">Min Stock</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lowStockProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                      No low stock items found. Good job!
                    </td>
                  </tr>
                ) : (
                  lowStockProducts.map(product => {
                    const isRequested = requestedProductIds.includes(product.id);
                    return (
                      <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-slate-600">{product.sku}</td>
                        <td className="px-6 py-4 font-medium text-slate-900">{product.name}</td>
                        <td className="px-6 py-4 text-right font-bold text-rose-600">{product.stock} {product.unit}</td>
                        <td className="px-6 py-4 text-right text-slate-500">{product.min_stock} {product.unit}</td>
                        <td className="px-6 py-4 text-center">
                          {isRequested ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                              <Send className="h-3 w-3" /> Requested
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-100">
                              <AlertTriangle className="h-3 w-3" /> Low Stock
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleRequestPurchase(product)}
                            disabled={isRequested}
                            className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2 ml-auto"
                          >
                            <ShoppingCart className="h-3 w-3" />
                            {isRequested ? 'Requested' : 'Request Purchase'}
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
      )}

      {/* Purchase Request Modal */}
      {isRequestModalOpen && requestProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-900">Request Purchase</h3>
              <p className="text-sm text-slate-500">{requestProduct.name} ({requestProduct.sku})</p>
            </div>
            <form onSubmit={submitPurchaseRequest} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Current Stock</label>
                  <div className="text-rose-600 font-bold">{requestProduct.stock} {requestProduct.unit}</div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Min Stock</label>
                  <div className="text-slate-700 font-bold">{requestProduct.min_stock} {requestProduct.unit}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Requested Quantity</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  value={requestQty}
                  onChange={(e) => setRequestQty(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                <textarea 
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  rows={3}
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="Urgency, preferred supplier, etc."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsRequestModalOpen(false)}
                  className="flex-1 py-2.5 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl my-8">
            <h2 className="text-xl font-bold mb-4">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product Name</label>
                  <input name="name" defaultValue={editingProduct?.name} required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">SKU</label>
                  <input name="sku" defaultValue={editingProduct?.sku} required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="type" 
                      value="raw" 
                      checked={itemType === 'raw'} 
                      onChange={() => setItemType('raw')}
                    />
                    Raw Material
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name="type" 
                      value="finished" 
                      checked={itemType === 'finished'} 
                      onChange={() => setItemType('finished')}
                    />
                    Finished Good
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Initial Stock</label>
                  <input name="stock" type="number" defaultValue={editingProduct?.stock ?? 0} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit</label>
                  <input name="unit" defaultValue={editingProduct?.unit ?? 'pcs'} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Min Stock</label>
                  <input name="min_stock" type="number" defaultValue={editingProduct?.min_stock ?? 10} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Cost Price (HPP)</label>
                <input name="cost_price" type="number" defaultValue={editingProduct?.cost_price ?? 0} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
              </div>

              {/* Conditional Fields based on Type */}
              {itemType === 'raw' && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Suppliers</label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                    {suppliers.map(s => (
                      <label key={s.id} className="flex items-center gap-2 text-sm">
                        <input 
                          type="checkbox" 
                          checked={selectedSuppliers.includes(s.id)}
                          onChange={() => toggleSupplier(s.id)}
                        />
                        {s.name}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Select all suppliers that provide this item.</p>
                </div>
              )}

              {itemType === 'finished' && (
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Bill of Materials (BOM)</label>
                    <button type="button" onClick={addBomItem} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100">
                      + Add Material
                    </button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {bomItems.map((item, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <select 
                          className="flex-1 text-sm border rounded px-2 py-1"
                          value={item.raw_material_id}
                          onChange={(e) => updateBomItem(index, 'raw_material_id', Number(e.target.value))}
                        >
                          <option value={0}>Select Material</option>
                          {rawMaterials.map(rm => (
                            <option key={rm.id} value={rm.id}>{rm.name} ({rm.unit})</option>
                          ))}
                        </select>
                        <input 
                          type="number" 
                          className="w-20 text-sm border rounded px-2 py-1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateBomItem(index, 'quantity', Number(e.target.value))}
                        />
                        <button type="button" onClick={() => removeBomItem(index)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {bomItems.length === 0 && (
                      <p className="text-sm text-gray-400 italic">No materials added yet.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 border-t pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">{editingProduct ? 'Update Product' : 'Save Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isHistoryModalOpen && historyProduct && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-slate-900/5">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Transaction History</h2>
                <p className="text-sm text-slate-500 mt-1">{historyProduct.name} <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 ml-2">{historyProduct.sku}</span></p>
              </div>
              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-0">
              {history.length === 0 ? (
                <div className="text-center py-16 text-slate-500 italic bg-slate-50/50">
                  <p>No transactions found for this product.</p>
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/80 text-slate-500 uppercase text-xs font-semibold tracking-wider sticky top-0 backdrop-blur-sm border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4 text-right">Qty</th>
                      <th className="px-6 py-4 text-right">Balance</th>
                      <th className="px-6 py-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {history.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                          {new Date(t.date).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-semibold border",
                            t.type === 'in' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                            t.type === 'out' ? "bg-rose-50 text-rose-700 border-rose-100" :
                            "bg-blue-50 text-blue-700 border-blue-100"
                          )}>
                            {t.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{t.category || '-'}</td>
                        <td className={cn(
                          "px-6 py-4 text-right font-mono font-medium",
                          t.type === 'in' ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {t.type === 'in' ? '+' : '-'}{t.quantity}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">
                          {t.balance !== undefined ? t.balance : '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={t.notes}>
                          {t.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-gray-50 hover:text-slate-900 shadow-sm transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
