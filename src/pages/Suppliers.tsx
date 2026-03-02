import React, { useEffect, useState } from 'react';
import { api, Supplier, SupplierTransaction } from '@/lib/api';
import { Truck, Plus, Mail, Phone, Package, MapPin, Edit, History, X } from 'lucide-react';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [history, setHistory] = useState<SupplierTransaction[]>([]);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = () => {
    api.getSuppliers().then(setSuppliers);
  };

  const handleViewHistory = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setHistoryModalOpen(true);
    try {
      const data = await api.getSupplierTransactions(supplier.id);
      setHistory(data);
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const supplierData = {
      name: formData.get('name') as string,
      contact: formData.get('contact') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
    };

    if (editingSupplier) {
      await api.updateSupplier(editingSupplier.id, supplierData);
    } else {
      await api.addSupplier(supplierData);
    }
    
    setIsModalOpen(false);
    setEditingSupplier(null);
    loadSuppliers();
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Supplier Management</h1>
        <button 
          onClick={() => { setEditingSupplier(null); setIsModalOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map((supplier) => (
          <div key={supplier.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative group">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => handleViewHistory(supplier)}
                className="text-blue-600 hover:text-blue-800 p-1"
                title="View History"
              >
                <History className="h-4 w-4" />
              </button>
              <button 
                onClick={() => handleEdit(supplier)}
                className="text-gray-400 hover:text-emerald-600 p-1"
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Truck className="h-6 w-6" />
              </div>
              <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                ID: {supplier.id}
              </span>
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 mb-1">{supplier.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{supplier.contact}</p>
            
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                {supplier.email}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                {supplier.address}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                <Package className="h-3 w-3" /> Supplied Items
              </h4>
              <div className="flex flex-wrap gap-2">
                {supplier.products && supplier.products.length > 0 ? (
                  supplier.products.map(p => (
                    <span key={p.id} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100">
                      {p.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic">No items assigned</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Company Name</label>
                <input name="name" defaultValue={editingSupplier?.name} required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                <input name="contact" defaultValue={editingSupplier?.contact} required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input name="email" type="email" defaultValue={editingSupplier?.email} required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <textarea name="address" defaultValue={editingSupplier?.address} required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" rows={3} />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">{editingSupplier ? 'Update Supplier' : 'Save Supplier'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* History Modal */}
      {historyModalOpen && selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Transaction History</h2>
                <p className="text-sm text-gray-500">{selectedSupplier.name}</p>
              </div>
              <button 
                onClick={() => setHistoryModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-0 overflow-auto flex-1">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs sticky top-0">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">PO Number</th>
                    <th className="px-6 py-3">Product</th>
                    <th className="px-6 py-3 text-right">Price</th>
                    <th className="px-6 py-3 text-right">Qty</th>
                    <th className="px-6 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                        No transactions found for this supplier.
                      </td>
                    </tr>
                  ) : (
                    history.map((tx, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-6 py-3 whitespace-nowrap">
                          {new Date(tx.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3 font-mono text-xs">
                          {tx.po_number}
                        </td>
                        <td className="px-6 py-3">
                          {tx.product_name}
                        </td>
                        <td className="px-6 py-3 text-right text-gray-600">
                          ${tx.price.toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-right font-medium">
                          {tx.quantity}
                        </td>
                        <td className="px-6 py-3 text-right font-bold text-emerald-600">
                          ${tx.total.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end flex-shrink-0">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg border border-gray-300 bg-white"
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

