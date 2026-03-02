import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, ArrowRightLeft, Factory, FileCode, Menu, X, Truck, Users, ShoppingCart, ClipboardCheck, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Layout() {
  const [isOpen, setIsOpen] = React.useState(true);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/stock-in', icon: ArrowDownCircle, label: 'Stock In' },
    { to: '/stock-out', icon: ArrowUpCircle, label: 'Stock Out' },
    { to: '/inventory', icon: Package, label: 'Inventory' },
    { to: '/suppliers', icon: Truck, label: 'Suppliers' },
    { to: '/customers', icon: Users, label: 'Customers' },
    { to: '/gas-export', icon: FileCode, label: 'GAS Export' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
          !isOpen && "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 font-bold text-xl tracking-wider border-b border-slate-800">
          <span>MANUFACTURE<span className="text-emerald-400">OS</span></span>
          <button onClick={() => setIsOpen(false)} className="lg:hidden">
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive
                    ? "bg-emerald-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center px-4 lg:px-8 justify-between">
          <button onClick={() => setIsOpen(true)} className="lg:hidden p-2 -ml-2">
            <Menu className="h-6 w-6" />
          </button>
          <div className="font-medium text-gray-500">Professional Inventory System</div>
          <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
            A
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
