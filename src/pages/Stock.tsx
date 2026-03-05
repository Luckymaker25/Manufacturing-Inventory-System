import React, { useState } from 'react';
import VerifyPO from './GoodsInward';
import Transactions from './Transactions';
import StockOut from './StockOut';
import { ClipboardList, Factory, AlertTriangle, Clock, PackageCheck } from 'lucide-react';

export default function Stock() {
  const [activeTab, setActiveTab] = useState<'verify-po' | 'stock-out' | 'adjustments'>('verify-po');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Stock Management</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('verify-po')}
          className={`pb-4 px-2 font-medium transition-colors relative whitespace-nowrap ${
            activeTab === 'verify-po' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Verify PO
          </div>
          {activeTab === 'verify-po' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('stock-out')}
          className={`pb-4 px-2 font-medium transition-colors relative whitespace-nowrap ${
            activeTab === 'stock-out' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5" />
            Stock Out Requests
          </div>
          {activeTab === 'stock-out' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('adjustments')}
          className={`pb-4 px-2 font-medium transition-colors relative whitespace-nowrap ${
            activeTab === 'adjustments' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Adjustments / Others
          </div>
          {activeTab === 'adjustments' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'verify-po' && <VerifyPO />}
        {activeTab === 'stock-out' && <StockOut />}
        {activeTab === 'adjustments' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Stock Adjustments & Manual Entry</h2>
              <Transactions 
                hideTypeToggle={false} 
                defaultCategory="Adjustment"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
