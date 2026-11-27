import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { PlusCircle, List, Menu, X, Building2, LayoutDashboard, Sparkles, History, Layout, Settings, Code, Users } from 'lucide-react';
import BrowserCacheControls from '../components/BrowserCacheControls';
const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Nova análise', href: '/create', icon: PlusCircle },
  { name: 'Gestor de leads', href: '/leads', icon: Sparkles },
  { name: 'Histórico de buscas', href: '/leads/history', icon: History },
  { name: 'Minhas análises', href: '/sites', icon: List },
  { name: 'Templates', href: '/templates', icon: Layout },
  { name: 'Configurações', href: '/settings', icon: Settings },
  { name: 'API externa', href: '/api-docs', icon: Code },
  { name: 'Usuários', href: '/users', icon: Users },
];

export default function DashboardLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const renderLinks = (mobile = false) => navigation.map((item) => {
    const active = location.pathname === item.href;
    return (
      <Link
        key={item.href}
        to={item.href}
        onClick={() => mobile && setIsMobileMenuOpen(false)}
        className={`group flex items-center rounded-md font-medium ${mobile ? 'px-3 py-3 text-base' : 'px-2 py-2 text-sm'} ${active ? 'bg-emerald-600 text-white' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'}`}
      >
        <item.icon className={`mr-3 h-5 w-5 shrink-0 ${active ? 'text-white' : 'text-zinc-400 group-hover:text-white'}`} />
        {item.name}
      </Link>
    );
  });

  return (
    <div className="min-h-screen bg-zinc-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-zinc-900 md:flex">
        <div className="flex h-16 shrink-0 items-center bg-zinc-950 px-4">
          <Building2 className="h-8 w-8 text-emerald-500" />
          <span className="ml-3 text-lg font-bold text-white">DS Company</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">{renderLinks()}</nav>
      </aside>

      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between bg-zinc-900 px-4 md:hidden">
        <div className="flex items-center">
          <Building2 className="h-8 w-8 text-emerald-500" />
          <span className="ml-3 text-lg font-bold text-white">DS Company</span>
        </div>
        <button aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'} onClick={() => setIsMobileMenuOpen((open) => !open)} className="text-zinc-300 hover:text-white">
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-zinc-900 px-2 pb-6 pt-20 md:hidden">
          <nav className="space-y-1">{renderLinks(true)}</nav>
        </div>
      )}
      <main className="min-h-screen pt-16 md:ml-64 md:pt-0">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 md:px-8">
          <div className="mb-4 flex justify-end">
            <BrowserCacheControls />
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
