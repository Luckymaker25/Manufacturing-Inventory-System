import React, { useEffect, useState } from 'react';
import { api, Product, Transaction } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Package, AlertTriangle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { hasPermission } = useAuth();

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-500">Welcome back, here's what's happening today.</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Products</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2 tracking-tight">{products.length}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600 group-hover:bg-blue-100 transition-colors">
              <Package className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-emerald-600 font-medium flex items-center">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              12%
            </span>
            <span className="text-slate-400 ml-2">from last month</span>
          </div>
        </div>

        {hasPermission(['Warehouse Staff', 'Production Manager', 'Purchasing Officer']) && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Low Stock Alert</p>
                <h3 className="text-3xl font-bold text-slate-900 mt-2 tracking-tight">{lowStockItems.length}</h3>
              </div>
              <div className={cn("p-3 rounded-xl transition-colors", lowStockItems.length > 0 ? "bg-red-50 text-red-600 group-hover:bg-red-100" : "bg-emerald-50 text-emerald-600")}>
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              {lowStockItems.length > 0 ? (
                <span className="text-red-600 font-medium">Action needed</span>
              ) : (
                <span className="text-emerald-600 font-medium">All good</span>
              )}
              <span className="text-slate-400 ml-2">in inventory</span>
            </div>
          </div>
        )}

        {hasPermission(['Warehouse Staff', 'Production Manager', 'Purchasing Officer']) && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Raw Materials</p>
                <h3 className="text-3xl font-bold text-slate-900 mt-2 tracking-tight">{rawMaterials.reduce((acc, curr) => acc + curr.stock, 0)}</h3>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                <ArrowDownLeft className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-slate-500 font-medium">{rawMaterials.length} items</span>
              <span className="text-slate-400 ml-2">in stock</span>
            </div>
          </div>
        )}

        {hasPermission(['Warehouse Staff', 'Production Manager', 'Sales Officer']) && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 group">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Finished Goods</p>
                <h3 className="text-3xl font-bold text-slate-900 mt-2 tracking-tight">{finishedGoods.reduce((acc, curr) => acc + curr.stock, 0)}</h3>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                <ArrowUpRight className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-slate-500 font-medium">{finishedGoods.length} items</span>
              <span className="text-slate-400 ml-2">ready to ship</span>
            </div>
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      {hasPermission(['Admin', 'Finance Staff']) && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Transaction Volume</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Object.entries(categoryStats).map(([cat, count]) => (
              <div key={cat} className="p-4 bg-slate-50 rounded-xl text-center border border-slate-100 hover:border-slate-200 transition-colors">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">{cat}</p>
                <p className="text-2xl font-bold text-slate-800">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {hasPermission(['Warehouse Staff', 'Production Manager']) && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Stock Levels</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  />
                  <Bar dataKey="stock" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {hasPermission(['Admin', 'Finance Staff', 'Warehouse Staff']) && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Transactions</h3>
            <div className="overflow-auto flex-1 -mx-6 px-6">
              <table className="w-full text-sm text-left border-separate border-spacing-y-2">
                <thead className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Category</th>
                    <th className="pb-2">Item</th>
                    <th className="pb-2 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  {transactions.slice(0, 8).map((t) => (
                    <tr key={t.id} className="group">
                      <td className="py-3 border-b border-slate-50 group-last:border-0">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="py-3 border-b border-slate-50 group-last:border-0">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-semibold border",
                          t.type === 'in' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                          t.type === 'out' ? "bg-rose-50 text-rose-700 border-rose-100" :
                          "bg-blue-50 text-blue-700 border-blue-100"
                        )}>
                          {t.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 border-b border-slate-50 group-last:border-0 text-slate-500">{t.category || '-'}</td>
                      <td className="py-3 border-b border-slate-50 group-last:border-0 font-medium text-slate-900">{t.product_name}</td>
                      <td className="py-3 border-b border-slate-50 group-last:border-0 text-right font-mono font-medium">{t.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
