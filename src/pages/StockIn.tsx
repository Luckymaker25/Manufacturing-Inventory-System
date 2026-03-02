import React, { useState } from 'react';
import Purchasing from './Purchasing';
import GoodsInward from './GoodsInward';
import { ShoppingCart, ClipboardList } from 'lucide-react';

export default function StockIn() {
  const [activeTab, setActiveTab] = useState<'purchasing' | 'goods-inward'>('purchasing');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Stock In Management</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('purchasing')}
          className={`pb-4 px-2 font-medium transition-colors relative ${
            activeTab === 'purchasing' ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Purchase Order (New)
          </div>
          {activeTab === 'purchasing' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('goods-inward')}
          className={`pb-4 px-2 font-medium transition-colors relative ${
            activeTab === 'goods-inward' ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Goods Inward (Receive)
          </div>
          {activeTab === 'goods-inward' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'purchasing' ? <Purchasing /> : <GoodsInward />}
      </div>
    </div>
  );
}
