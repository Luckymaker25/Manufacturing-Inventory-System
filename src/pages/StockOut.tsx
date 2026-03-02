import React, { useState } from 'react';
import Production from './Production';
import Transactions from './Transactions';
import { ShoppingBag, Factory, AlertTriangle } from 'lucide-react';

export default function StockOut() {
  const [activeTab, setActiveTab] = useState<'sales' | 'manufacturing' | 'adjustments'>('sales');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Stock Out Management</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('sales')}
          className={`pb-4 px-2 font-medium transition-colors relative ${
            activeTab === 'sales' ? 'text-red-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Sales
          </div>
          {activeTab === 'sales' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('manufacturing')}
          className={`pb-4 px-2 font-medium transition-colors relative ${
            activeTab === 'manufacturing' ? 'text-red-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Manufacturing
          </div>
          {activeTab === 'manufacturing' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('adjustments')}
          className={`pb-4 px-2 font-medium transition-colors relative ${
            activeTab === 'adjustments' ? 'text-red-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Adjustments / Others
          </div>
          {activeTab === 'adjustments' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'sales' && (
          <Transactions 
            defaultType="sales" 
            defaultCategory="Sales" 
            lockCategory={true} 
            hideTypeToggle={true} 
          />
        )}
        {activeTab === 'manufacturing' && <Production />}
        {activeTab === 'adjustments' && (
          <Transactions 
            defaultType="sales" 
            hideTypeToggle={true} 
            defaultCategory="Lost Items"
          />
        )}
      </div>
    </div>
  );
}
