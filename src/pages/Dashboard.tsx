import React, { useEffect, useState } from 'react';
import { api, Product, Transaction } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Package, AlertTriangle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    Promise.all([api.getProducts(), api.getTransactions()]).then(([p, t]) => {
      setProducts(p);
      setTransactions(t);
    });
  }, []);

  const lowStockItems = products.filter(p => p.stock <= p.min_stock);
  const rawMaterials = products.filter(p => p.type === 'raw');
  const finishedGoods = products.filter(p => p.type === 'finished');

  const chartData = products.map(p => ({
    name: p.sku,
    stock: p.stock,
    min: p.min_stock
  }));

  // Calculate Category Breakdown
  const categoryStats = transactions.reduce((acc, t) => {
    const cat = t.category || (t.type === 'in' ? 'Manual In' : t.type === 'out' ? 'Manual Out' : 'Production');
    if (!acc[cat]) acc[cat] = 0;
    acc[cat] += t.quantity;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Products</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{products.length}</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Package className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Low Stock Alert</p>
              <h3 className="text-2xl font-bold text-red-600 mt-1">{lowStockItems.length}</h3>
            </div>
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Raw Materials</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{rawMaterials.reduce((acc, curr) => acc + curr.stock, 0)}</h3>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500">Finished Goods</p>
              <h3 className="text-2xl font-bold text-indigo-600 mt-1">{finishedGoods.reduce((acc, curr) => acc + curr.stock, 0)}</h3>
            </div>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold mb-4">Transaction Breakdown (Qty)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Object.entries(categoryStats).map(([cat, count]) => (
            <div key={cat} className="p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-xs text-gray-500 uppercase font-bold">{cat}</p>
              <p className="text-xl font-bold text-gray-800">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Stock Levels</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="stock" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
          <div className="overflow-auto max-h-80">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Item</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 10).map((t) => (
                  <tr key={t.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        t.type === 'in' ? "bg-green-100 text-green-800" :
                        t.type === 'out' ? "bg-red-100 text-red-800" :
                        "bg-blue-100 text-blue-800"
                      )}>
                        {t.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{t.category || '-'}</td>
                    <td className="px-4 py-3 font-medium">{t.product_name}</td>
                    <td className="px-4 py-3 text-right">{t.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
