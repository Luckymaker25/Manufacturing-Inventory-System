import React, { useEffect, useState } from 'react';
import { api, AgingReport } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, DollarSign, Calendar, CheckCircle, AlertCircle, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Finance() {
  const [report, setReport] = useState<AgingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'payables' | 'receivables'>('overview');
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = () => {
    setLoading(true);
    api.getAgingReport().then(data => {
      setReport(data);
      setLoading(false);
    });
  };

  const handleMarkPaid = async (id: number) => {
    if (confirmId !== id) {
      setConfirmId(id);
      setTimeout(() => setConfirmId(null), 3000);
      return;
    }

    setProcessingId(id);
    setConfirmId(null);

    try {
      await api.updateOrderPaymentStatus(id, 'paid');
      fetchReport(); // Refresh data
    } catch (error) {
      alert('Failed to update status');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading || !report) return <div className="p-8 text-center text-slate-500">Loading finance data...</div>;

  const payablesData = [
    { name: '0-30 Days', amount: report.payables['0-30'] },
    { name: '31-60 Days', amount: report.payables['31-60'] },
    { name: '61-90 Days', amount: report.payables['61-90'] },
    { name: '90+ Days', amount: report.payables['90+'] },
  ];

  const receivablesData = [
    { name: '0-30 Days', amount: report.receivables['0-30'] },
    { name: '31-60 Days', amount: report.receivables['31-60'] },
    { name: '61-90 Days', amount: report.receivables['61-90'] },
    { name: '90+ Days', amount: report.receivables['90+'] },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Finance Dashboard</h1>
        <button 
          onClick={fetchReport}
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <Calendar className="h-4 w-4" />
          Updated: {new Date().toLocaleTimeString()}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Accounts Payable (PO)</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">${report.payables.total.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <ArrowDownRight className="h-6 w-6" />
            </div>
          </div>
          <div className="text-sm text-slate-500">
            Money you owe to suppliers
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Accounts Receivable (Inv)</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">${report.receivables.total.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <ArrowUpRight className="h-6 w-6" />
            </div>
          </div>
          <div className="text-sm text-slate-500">
            Money customers owe you
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            "pb-4 px-2 font-medium transition-colors relative",
            activeTab === 'overview' ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Overview Charts
          {activeTab === 'overview' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900" />}
        </button>
        <button
          onClick={() => setActiveTab('payables')}
          className={cn(
            "pb-4 px-2 font-medium transition-colors relative",
            activeTab === 'payables' ? "text-rose-600" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Payables (AP) Details
          {activeTab === 'payables' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600" />}
        </button>
        <button
          onClick={() => setActiveTab('receivables')}
          className={cn(
            "pb-4 px-2 font-medium transition-colors relative",
            activeTab === 'receivables' ? "text-emerald-600" : "text-slate-500 hover:text-slate-700"
          )}
        >
          Receivables (AR) Details
          {activeTab === 'receivables' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
        </button>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payables Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-slate-900 mb-6">Payables Aging (AP)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={payablesData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="amount" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Amount ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Receivables Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-slate-900 mb-6">Receivables Aging (AR)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={receivablesData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} name="Amount ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {(activeTab === 'payables' || activeTab === 'receivables') && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-slate-500 uppercase text-xs font-semibold tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Due Date</th>
                    <th className="px-6 py-4">Ref #</th>
                    <th className="px-6 py-4">{activeTab === 'payables' ? 'Supplier' : 'Customer'}</th>
                    <th className="px-6 py-4 text-center">Age (Days)</th>
                    <th className="px-6 py-4 text-center">Bucket</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {report[activeTab].details.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500 italic">
                        No unpaid {activeTab} found. Good job!
                      </td>
                    </tr>
                  ) : (
                    report[activeTab].details.sort((a, b) => b.age - a.age).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                          {new Date(item.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                          {item.due_date ? new Date(item.due_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 font-mono font-medium text-slate-900">
                          {item.reference_number}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{item.entity_name || '-'}</td>
                        <td className="px-6 py-4 text-center font-bold text-slate-700">
                          {item.age}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            item.bucket === '90+' ? "bg-red-100 text-red-700" :
                            item.bucket === '61-90' ? "bg-orange-100 text-orange-700" :
                            item.bucket === '31-60' ? "bg-amber-100 text-amber-700" :
                            "bg-blue-100 text-blue-700"
                          )}>
                            {item.bucket} Days
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-slate-900">
                          ${item.total_amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleMarkPaid(item.id)}
                            disabled={processingId === item.id}
                            className={cn(
                              "text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 mx-auto disabled:opacity-50",
                              confirmId === item.id 
                                ? "bg-rose-600 text-white hover:bg-rose-700 animate-pulse" 
                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                            )}
                          >
                            {processingId === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : confirmId === item.id ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                            {confirmId === item.id ? "Confirm?" : "Mark Paid"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
