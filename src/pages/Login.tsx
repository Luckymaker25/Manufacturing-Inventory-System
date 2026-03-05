import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Lock, User } from 'lucide-react';

const CREDENTIALS: Record<string, { password: string; role: UserRole }> = {
  'admin': { password: 'admin123', role: 'Admin' },
  'warehouse': { password: 'warehouse123', role: 'Warehouse Staff' },
  'production': { password: 'production123', role: 'Production Manager' },
  'finance': { password: 'finance123', role: 'Finance Staff' },
  'sales': { password: 'sales123', role: 'Sales Officer' },
  'purchasing': { password: 'purchasing123', role: 'Purchasing Officer' },
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = CREDENTIALS[username.toLowerCase()];
    
    if (user && user.password === password) {
      login(user.role);
      navigate('/');
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">ManufactureOS</h1>
          <p className="text-slate-500 mt-2">Sign in to your account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-rose-500 text-sm text-center font-medium">{error}</p>}
          
          <div className="relative">
            <User className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              required
            />
          </div>
          
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
