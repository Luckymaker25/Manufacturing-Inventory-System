import React, { useEffect, useState } from 'react';
import { api, Product, Supplier } from '@/lib/api';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, Search, Plus, Trash2, Edit, X } from 'lucide-react';

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  // Form State
  const [itemType, setItemType] = useState<'raw' | 'finished'>('raw');
  const [selectedSuppliers, setSelectedSuppliers] = useState<number[]>([]);
  const [bomItems, setBomItems] = useState<{ raw_material_id: number; quantity: number }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    api.getProducts().then(setProducts);
    api.getSuppliers().then(setSuppliers);
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
        if (!sups || sups.length === 0) return <span className="text-gray-400 text-xs">-</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {sups.map(s => (
              <span key={s.id} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                {s.name}
              </span>
            ))}
          </div>
        );
      }
    }),
    columnHelper.display({
      id: 'actions',
      cell: info => (
        <button 
          onClick={() => handleEdit(info.row.original)}
          className="text-gray-500 hover:text-emerald-600 p-1 rounded-full hover:bg-gray-100"
        >
          <Edit className="h-4 w-4" />
        </button>
      )
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(e.target.value)}
              placeholder="Search products..."
              className="pl-9 pr-4 py-2 w-full border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-6 py-3">
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
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="border-b hover:bg-gray-50">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Transaction History</h2>
                <p className="text-sm text-gray-500">{historyProduct.name} ({historyProduct.sku})</p>
              </div>
              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              {history.length === 0 ? (
                <div className="text-center py-12 text-gray-500 italic">
                  No transactions found for this product.
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.map((t) => (
                      <tr key={t.id}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {new Date(t.date).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${
                            t.type === 'in' ? 'bg-green-100 text-green-800' : 
                            t.type === 'out' ? 'bg-red-100 text-red-800' : 
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{t.category || '-'}</td>
                        <td className={`px-4 py-3 text-right font-bold ${
                          t.type === 'in' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {t.type === 'in' ? '+' : '-'}{t.quantity}
                        </td>
                        <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={t.notes}>
                          {t.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
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
