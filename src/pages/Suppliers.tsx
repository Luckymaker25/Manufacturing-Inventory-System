import React, { useEffect, useState } from 'react';
import { api, Supplier, SupplierTransaction, EntityFormData } from '@/lib/api';
import { Truck, Plus, Package } from 'lucide-react';
import { EntityCard } from '@/components/EntityCard';
import { EntityFormModal } from '@/components/EntityFormModal';
import { TransactionHistoryModal } from '@/components/TransactionHistoryModal';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

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
    setHistory([]);
    setHistoryModalOpen(true);
    try {
      const data = await api.getSupplierTransactions(supplier.id);
      setHistory(data);
    } catch (e) {
      console.error('Failed to load supplier history', e);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: EntityFormData) => {
    if (editingSupplier) {
      await api.updateSupplier(editingSupplier.id, data);
    } else {
      await api.addSupplier(data);
    }
    setIsModalOpen(false);
    setEditingSupplier(null);
    loadSuppliers();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Supplier Management</h1>
        <button
          onClick={handleAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map((supplier) => (
          <EntityCard
            key={supplier.id}
            entity={supplier}
            icon={<Truck className="h-6 w-6" />}
            iconBgClass="bg-blue-50"
            iconColorClass="text-blue-600"
            onEdit={handleEdit}
            onViewHistory={handleViewHistory}
            extra={
              <div className="border-t pt-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                  <Package className="h-3 w-3" /> Supplied Items
                </h4>
                <div className="flex flex-wrap gap-2">
                  {supplier.products && supplier.products.length > 0 ? (
                    supplier.products.map((p) => (
                      <span
                        key={p.id}
                        className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100"
                      >
                        {p.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">No items assigned</span>
                  )}
                </div>
              </div>
            }
          />
        ))}
      </div>

      {isModalOpen && (
        <EntityFormModal
          title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
          defaultValues={editingSupplier ?? undefined}
          nameLabel="Company Name"
          onSubmit={handleSubmit}
          onClose={() => {
            setIsModalOpen(false);
            setEditingSupplier(null);
          }}
        />
      )}

      {historyModalOpen && selectedSupplier && (
        <TransactionHistoryModal
          title="Transaction History"
          subtitle={selectedSupplier.name}
          history={history}
          onClose={() => setHistoryModalOpen(false)}
        />
      )}
    </div>
  );
}
