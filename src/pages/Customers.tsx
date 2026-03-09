import React, { useEffect, useState } from 'react';
import { api, Customer, SupplierTransaction, EntityFormData } from '@/lib/api';
import { Users, Plus } from 'lucide-react';
import { EntityCard } from '@/components/EntityCard';
import { EntityFormModal } from '@/components/EntityFormModal';
import { TransactionHistoryModal } from '@/components/TransactionHistoryModal';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<SupplierTransaction[]>([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = () => {
    api.getCustomers().then(setCustomers);
  };

  const handleViewHistory = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setHistory([]);
    setHistoryModalOpen(true);
    try {
      const data = await api.getCustomerTransactions(customer.id);
      setHistory(data);
    } catch (e) {
      console.error('Failed to load customer history', e);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: EntityFormData) => {
    if (editingCustomer) {
      await api.updateCustomer(editingCustomer.id, data);
    } else {
      await api.addCustomer(data);
    }
    setIsModalOpen(false);
    setEditingCustomer(null);
    loadCustomers();
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(globalFilter.toLowerCase()) ||
      c.contact.toLowerCase().includes(globalFilter.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
        <button
          onClick={handleAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      {/* Search filter */}
      <div>
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search customers..."
          className="w-full max-w-sm px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((customer) => (
          <EntityCard
            key={customer.id}
            entity={customer}
            icon={<Users className="h-6 w-6" />}
            iconBgClass="bg-purple-50"
            iconColorClass="text-purple-600"
            onEdit={handleEdit}
            onViewHistory={handleViewHistory}
          />
        ))}
      </div>

      {isModalOpen && (
        <EntityFormModal
          title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
          defaultValues={editingCustomer ?? undefined}
          nameLabel="Customer Name"
          onSubmit={handleSubmit}
          onClose={() => {
            setIsModalOpen(false);
            setEditingCustomer(null);
          }}
        />
      )}

      {historyModalOpen && selectedCustomer && (
        <TransactionHistoryModal
          title="Transaction History"
          subtitle={selectedCustomer.name}
          history={history}
          onClose={() => setHistoryModalOpen(false)}
        />
      )}
    </div>
  );
}
