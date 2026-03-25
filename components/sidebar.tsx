'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  ScanSearch,
  Accessibility,
  ChevronLeft,
  ChevronRight,
  Settings,
  HelpCircle
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/projects/new', label: 'New Scan', icon: ScanSearch },
];

const secondaryItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/support', label: 'Support', icon: HelpCircle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const width = collapsed ? '72px' : '260px'; // Matching globals.css
    document.documentElement.style.setProperty('--current-sidebar-width', width);
  }, [collapsed]);

  return (
    <aside
      className="fixed top-0 left-0 h-full z-50 flex flex-col transition-all duration-300 bg-[#0A0F1C] border-r border-white/5 shadow-2xl print:hidden"
      style={{
        width: 'var(--current-sidebar-width, 260px)',
      }}
    >
      {/* Branding Area */}
      <div
        className="flex items-center gap-3 px-6 flex-shrink-0 border-b border-white/5"
        style={{ height: 'var(--header-height)' }}
      >
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Accessibility size={22} />
          </div>
          {!collapsed && (
            <span className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-linear-to-r from-cyan-400 to-indigo-400 animate-fade-in whitespace-nowrap">
              AccessIQ
            </span>
          )}
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-8 px-4 flex flex-col gap-2">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-3 mb-2">
          {collapsed ? 'Main' : 'Main Navigation'}
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                isActive 
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon size={20} className={`${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
              {isActive && !collapsed && (
                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
              )}
            </Link>
          );
        })}

        <div className="mt-8 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-3 mb-2">
          {collapsed ? 'App' : 'Application'}
        </div>
        {secondaryItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-white/5 text-white' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              <Icon size={20} />
              {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-4 border-t border-white/5 bg-[#060913]/50">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5"
        >
          {collapsed ? <ChevronRight size={18} /> : (
            <div className="flex items-center gap-2">
              <ChevronLeft size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Collapse Menu</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
