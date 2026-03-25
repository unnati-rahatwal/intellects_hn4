'use client';

import { useState, useEffect } from 'react';
import { Settings, User, Bell, Shield, GitBranch, ChevronRight, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UserData {
  id: string;
  name: string;
  email: string;
  githubConnected: boolean;
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [browserNotifs, setBrowserNotifs] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/user/me')
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8"><div className="spinner-lg" /></div>;

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <Settings size={28} className="text-cyan-500" /> Settings
        </h1>
        <p className="page-subtitle">Manage your account and platform preferences</p>
      </div>

      <div className="flex flex-col gap-6">
        {/* Profile Section */}
        <section className="glass-card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User size={18} className="text-slate-400" /> Profile Information
          </h2>
          <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-xl border border-white/5">
            <div className="w-12 h-12 rounded-full bg-linear-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-xl font-bold">
              {user?.name?.[0] || 'U'}
            </div>
            <div>
              <p className="font-medium">{user?.name || 'User'}</p>
              <p className="text-sm text-slate-400">{user?.email || 'email@example.com'}</p>
            </div>
          </div>
        </section>

        {/* GitHub Integration */}
        <section className="glass-card">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <GitBranch size={18} className="text-slate-400" /> Integrations
          </h2>
          <p className="text-sm text-slate-400 mb-4">Connect external services to automate your workflow.</p>
          
          <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-800 rounded-lg">
                <GitBranch size={20} className={user?.githubConnected ? "text-emerald-500" : "text-slate-400"} />
              </div>
              <div>
                <p className="font-medium">GitHub CI/CD</p>
                <p className="text-xs text-slate-500">{user?.githubConnected ? 'Account connected' : 'Not authorized'}</p>
              </div>
            </div>
            {user?.githubConnected ? (
              <span className="badge badge-success">Connected</span>
            ) : (
              <a href="/api/github/auth" className="btn btn-sm btn-primary">Connect</a>
            )}
          </div>
        </section>

        {/* Notifications */}
        <section className="glass-card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bell size={18} className="text-slate-400" /> Notifications
          </h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">Email Alerts</p>
                <p className="text-xs text-slate-500">Receive scan reports via email</p>
              </div>
              <button 
                onClick={() => setEmailAlerts(!emailAlerts)}
                className={`w-12 h-6 rounded-full transition-colors relative ${emailAlerts ? 'bg-cyan-500' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${emailAlerts ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-white/5">
              <div>
                <p className="text-sm font-medium">Scan Completion</p>
                <p className="text-xs text-slate-500">Browser notifications when scans finish</p>
              </div>
              <button 
                onClick={() => setBrowserNotifs(!browserNotifs)}
                className={`w-12 h-6 rounded-full transition-colors relative ${browserNotifs ? 'bg-cyan-500' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${browserNotifs ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="glass-card border-red-500/20">
          <h2 className="text-lg font-semibold mb-4 text-red-400 flex items-center gap-2">
            <Shield size={18} /> Danger Zone
          </h2>
          <button 
            onClick={() => {
              document.cookie = "accessiq_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
              localStorage.removeItem("accessiq_token");
              router.push('/login');
            }}
            className="btn btn-ghost text-red-400 hover:bg-red-500/10 w-full justify-start gap-4"
          >
            <LogOut size={18} /> Sign Out of Platform
          </button>
        </section>
      </div>
    </div>
  );
}
