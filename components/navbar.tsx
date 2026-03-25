'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Accessibility, 
  ChevronRight, 
  User, 
  LogOut, 
  Bell, 
  Menu,
  X
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    
    // Auth check - optimized to avoid unnecessary state updates
    const token = localStorage.getItem('token');
    const hasToken = !!token;
    if (isLoggedIn !== hasToken) {
      setIsLoggedIn(hasToken);
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname, isLoggedIn]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    router.push('/');
    router.refresh();
  };

  const isDashboard = pathname.startsWith('/dashboard') || 
                      pathname.startsWith('/projects') || 
                      pathname.startsWith('/scans');

  // Breadcrumb logic
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = `/${pathSegments.slice(0, index + 1).join('/')}`;
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    return { label, href };
  });

  return (
    <header 
      className={`fixed top-0 right-0 z-40 transition-all duration-300 border-b ${
        isScrolled 
          ? 'bg-[#0A0F1C]/80 backdrop-blur-md border-white/10 py-3' 
          : 'bg-transparent border-transparent py-5'
      }`}
      style={{ 
        left: isDashboard ? 'var(--sidebar-width)' : '0',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
        {/* Left Section: Branding or Breadcrumbs */}
        <div className="flex items-center gap-4 overflow-hidden text-white">
          {!isDashboard ? (
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
                <Accessibility size={24} />
              </div>
              <span className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-linear-to-r from-cyan-400 to-indigo-400">
                AccessIQ
              </span>
            </Link>
          ) : (
            <div className="flex items-center gap-2 text-sm font-medium animate-fade-in group text-slate-400">
              <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
                Dashboard
              </Link>
              {breadcrumbs.length > 1 && breadcrumbs.slice(1).map((crumb, i) => (
                <div key={crumb.href} className="flex items-center gap-2">
                  <ChevronRight size={14} className="text-slate-600" />
                  <Link 
                    href={crumb.href} 
                    className={`${i === breadcrumbs.length - 2 ? 'text-cyan-400' : 'text-slate-400 hover:text-white'} transition-colors whitespace-nowrap`}
                  >
                    {crumb.label}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Section: Navigation Tools */}
        <div className="flex items-center gap-3">
          {!isLoggedIn ? (
            <div className="hidden md:flex items-center gap-6 mr-4 font-medium text-sm text-slate-300">
              <Link href="/#features" className="hover:text-cyan-400 transition-colors">Features</Link>
              <Link href="/#demo" className="hover:text-cyan-400 transition-colors">Demo</Link>
              <Link href="/login" className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-white transition-all">Sign In</Link>
              <Link href="/register" className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-bold shadow-lg shadow-cyan-500/20 transition-all">Get Started</Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {!isDashboard && (
                 <Link href="/dashboard" className="hidden md:block px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-white font-medium mr-2">
                    Open Dashboard
                 </Link>
              )}
              <button className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5 relative">
                <Bell size={20} />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-cyan-500 border-2 border-[#0A0F1C]"></span>
              </button>
              <div className="h-6 w-px bg-white/10 mx-1"></div>
              <div className="flex items-center gap-3 pl-2">
                 <div className="w-9 h-9 rounded-full bg-linear-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center text-slate-300">
                    <User size={18} />
                 </div>
                 <button 
                  onClick={handleLogout}
                  className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-all border border-rose-500/10"
                  title="Logout"
                 >
                    <LogOut size={20} />
                 </button>
              </div>
            </div>
          )}
          
          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2.5 rounded-lg bg-white/5 text-slate-300"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-[#0A101E] border-b border-white/10 p-6 md:hidden animate-fade-in-down">
          <nav className="flex flex-col gap-4 text-center">
            {!isLoggedIn ? (
              <>
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="py-3 text-slate-300 font-medium">Login</Link>
                <Link href="/register" onClick={() => setIsMobileMenuOpen(false)} className="py-4 bg-cyan-600 rounded-xl text-white font-bold">Sign Up Free</Link>
              </>
            ) : (
              <>
                <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="py-3 text-white font-bold text-lg">Go to Dashboard</Link>
                <button onClick={handleLogout} className="py-3 text-rose-500 font-bold border-t border-white/5 mt-2">Sign Out</button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
