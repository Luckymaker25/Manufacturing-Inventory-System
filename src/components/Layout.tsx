import React, { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, ArrowRightLeft, Factory, FileCode, Menu, X, Truck, Users, ShoppingCart, ShoppingBag, ClipboardCheck, ArrowDownCircle, ArrowUpCircle, Bell, Settings, DollarSign, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, Product } from '@/lib/api';
import { useAuth, UserRole } from '@/lib/auth';

export default function Layout() {
  const [isOpen, setIsOpen] = React.useState(true);
  const [notifications, setNotifications] = useState<Product[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const { role, setRole, hasPermission } = useAuth();

  useEffect(() => {
    // Check for low stock items
    api.getProducts().then(products => {
      const lowStock = products.filter(p => p.stock <= p.min_stock);
      setNotifications(lowStock);
    });
  }, []);

  const roles: UserRole[] = [
    'Admin',
    'Warehouse Staff',
    'Production Manager',
    'Finance Staff',
    'Sales Officer',
    'Purchasing Officer'
  ];

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: [] },
    { to: '/stock', icon: ArrowRightLeft, label: 'Stock Operations', roles: ['Warehouse Staff'] },
    { to: '/production', icon: Factory, label: 'Production', roles: ['Production Manager'] },
    { to: '/purchasing', icon: ShoppingCart, label: 'Purchasing', roles: ['Purchasing Officer', 'Finance Staff'] },
    { to: '/sales', icon: ShoppingBag, label: 'Sales', roles: ['Sales Officer'] },
    { to: '/inventory', icon: Package, label: 'Inventory', roles: ['Warehouse Staff', 'Production Manager', 'Purchasing Officer'] },
    { to: '/suppliers', icon: Truck, label: 'Suppliers', roles: ['Purchasing Officer'] },
    { to: '/customers', icon: Users, label: 'Customers', roles: ['Sales Officer'] },
    { to: '/finance', icon: DollarSign, label: 'Finance', roles: ['Finance Staff'] },
    { to: '/settings', icon: Settings, label: 'Settings', roles: ['Admin'] },
  ].filter(item => item.roles.length === 0 || hasPermission(item.roles as UserRole[]));

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
          !isOpen && "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-100">
          <span className="font-bold text-xl tracking-tight text-slate-900">
            MANUFACTURE<span className="text-emerald-600">OS</span>
          </span>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-500 hover:text-slate-700">
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )
              }
            >
              <item.icon className={cn("h-5 w-5", ({ isActive }: { isActive: boolean }) => isActive ? "text-emerald-600" : "text-slate-400")} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-gray-50/50">
          {showRoleSwitcher && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-bottom-2">
              <div className="px-4 py-2 border-b border-gray-50 mb-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Switch Role</p>
              </div>
              {roles.map(r => (
                <button
                  key={r}
                  onClick={() => {
                    setRole(r);
                    setShowRoleSwitcher(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm transition-colors hover:bg-slate-50",
                    role === r ? "text-emerald-600 font-bold bg-emerald-50/50" : "text-slate-600"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
          <button 
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-100 transition-colors group"
          >
            <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border border-emerald-200 shadow-sm">
              {role[0]}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-bold text-slate-900 truncate">{role}</p>
              <p className="text-[10px] text-slate-500 truncate uppercase tracking-tighter">ManufactureOS User</p>
            </div>
            <ChevronUp className={cn("h-4 w-4 text-slate-400 transition-transform", showRoleSwitcher && "rotate-180")} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-8 justify-between shadow-sm z-10">
          <button onClick={() => setIsOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-md">
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-4">
             {/* Breadcrumb placeholder or page title could go here */}
             <span className="text-sm text-slate-500 font-medium">Overview</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative"
              >
                <span className="sr-only">Notifications</span>
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <div className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full ring-2 ring-white"></div>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-50 flex justify-between items-center">
                    <h3 className="font-semibold text-sm text-slate-900">Notifications</h3>
                    <span className="text-xs text-slate-500">{notifications.length} alerts</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-slate-500 text-sm">
                        No new notifications
                      </div>
                    ) : (
                      notifications.map(product => (
                        <div key={product.id} className="px-4 py-3 hover:bg-slate-50 border-b border-gray-50 last:border-0">
                          <p className="text-sm font-medium text-slate-800">Low Stock Alert</p>
                          <p className="text-xs text-slate-500 mt-1">
                            <span className="font-semibold text-slate-700">{product.name}</span> is below minimum stock level ({product.stock} / {product.min_stock} {product.unit}).
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-8 bg-gray-50/50">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
