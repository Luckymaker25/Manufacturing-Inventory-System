import React from 'react';
import { X } from 'lucide-react';
import { SupplierTransaction } from '@/lib/api';

interface TransactionHistoryModalProps {
  title: string;
  subtitle: string;
  history: SupplierTransaction[];
  onClose: () => void;
}

/**
 * Generic transaction history modal.
 * Replaces the identical modal markup duplicated in Suppliers.tsx and Customers.tsx.
 */
export function TransactionHistoryModal({
  title,
  subtitle,
  history,
  onClose,
}: TransactionHistoryModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs sticky top-0">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Ref Number</th>
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
                    No transactions found.
                  </td>
                </tr>
              ) : (
                history.map((tx, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-3 whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs">{tx.po_number}</td>
                    <td className="px-6 py-3">{tx.product_name}</td>
                    <td className="px-6 py-3 text-right text-gray-600">
                      ${tx.price.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right font-medium">{tx.quantity}</td>
                    <td className="px-6 py-3 text-right font-bold text-emerald-600">
                      ${tx.total.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg border border-gray-300 bg-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
