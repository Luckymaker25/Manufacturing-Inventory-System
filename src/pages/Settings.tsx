import React, { useEffect, useState } from 'react';
import { api, Settings as SettingsType } from '@/lib/api';
import { Save, Building } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.getSettings().then(data => {
      setSettings(data);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      await api.updateSettings(settings);
      setMessage('Settings updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to update settings.');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
          <Building className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Company Settings</h1>
          <p className="text-slate-500">Manage your company details for documents.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
            <input 
              type="text" 
              value={settings?.company_name || ''} 
              onChange={e => setSettings(prev => prev ? ({ ...prev, company_name: e.target.value }) : null)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              required
            />
          </div>
          
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <textarea 
              value={settings?.address || ''} 
              onChange={e => setSettings(prev => prev ? ({ ...prev, address: e.target.value }) : null)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              value={settings?.email || ''} 
              onChange={e => setSettings(prev => prev ? ({ ...prev, email: e.target.value }) : null)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input 
              type="text" 
              value={settings?.phone || ''} 
              onChange={e => setSettings(prev => prev ? ({ ...prev, phone: e.target.value }) : null)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              required
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Logo URL (Optional)</label>
            <input 
              type="text" 
              value={settings?.logo_url || ''} 
              onChange={e => setSettings(prev => prev ? ({ ...prev, logo_url: e.target.value }) : null)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="https://example.com/logo.png"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Currency Symbol</label>
            <input 
              type="text" 
              value={settings?.currency || ''} 
              onChange={e => setSettings(prev => prev ? ({ ...prev, currency: e.target.value }) : null)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="$"
            />
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm ${message.includes('success') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {message}
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button 
            type="submit" 
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 font-medium"
          >
            <Save className="h-4 w-4" />
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
