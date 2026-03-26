'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ScanSearch, Trash2, Clock, CheckCircle, AlertTriangle, ArrowRight, Globe, GitCompare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

interface Project {
  _id: string;
  name: string;
  baseUrl: string;
  description: string;
  totalScans: number;
  githubRepo?: string;
}

interface Scan {
  _id: string;
  status: string;
  accessibilityScore: number;
  securityScore: number;
  totalViolations: number;
  criticalIssues: number;
  seriousIssues: number;
  moderateIssues: number;
  minorIssues: number;
  pagesScanned: number;
  completedAt: string;
  createdAt: string;
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selectedScans, setSelectedScans] = useState<string[]>([]);

  const toggleScanSelection = (scanId: string) => {
    setSelectedScans(prev => {
      if (prev.includes(scanId)) return prev.filter(id => id !== scanId);
      if (prev.length >= 2) return [prev[1], scanId]; // Keep max 2
      return [...prev, scanId];
    });
  };

  useEffect(() => {
    // Auth Guard
    const token = localStorage.getItem('accessiq_token');
    if (!token) {
      router.push('/login');
      return;
    }

    async function fetchData() {
      try {
        const [projRes, scansRes] = await Promise.all([
          fetch(`/api/projects/${id}`),
          fetch(`/api/projects/${id}/scans`),
        ]);
        const projData = await projRes.json();
        const scansData = await scansRes.json();
        setProject(projData);
        setScans(Array.isArray(scansData) ? scansData : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, router]);

  // Poll for active scans
  useEffect(() => {
    const hasActive = scans.some(s => s.status === 'PENDING' || s.status === 'PROCESSING');
    if (!hasActive) return;

    const interval = setInterval(async () => {
      const res = await fetch(`/api/projects/${id}/scans`);
      const data = await res.json();
      if (Array.isArray(data)) setScans(data);
    }, 3000);

    return () => clearInterval(interval);
  }, [scans, id]);

  async function startNewScan() {
    if (!project) return;
    setScanning(true);
    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          urls: [project.baseUrl],
          options: { discoverRoutes: true, securityAudit: true, maxDepth: 3, includeShadowDom: true, includeIframes: true, visionEmulation: false },
        }),
      });
      
      if (res.ok) {
        const scan = await res.json();
        if (scan.scanId) {
          router.push(`/scans/${scan.scanId}`);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setScanning(false);
    }
  }

  async function deleteProject() {
    if (!confirm('Delete this project and all its scan data?')) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    router.push('/projects');
  }

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ width: 200, height: 32, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: 300, height: 16, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="empty-state">
        <h2>Project not found</h2>
        <Link href="/projects" className="btn btn-primary" style={{ marginTop: 16 }}>Back to Projects</Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Link href="/projects" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to Projects
      </Link>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Globe size={28} color="var(--accent-primary)" />
            {project.name}
          </h1>
          <p className="page-subtitle">{project.baseUrl}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={startNewScan} className="btn btn-primary" disabled={scanning}>
            {scanning ? <><div className="spinner" /> Scanning...</> : <><ScanSearch size={16} /> New Scan</>}
          </button>
          <button onClick={deleteProject} className="btn btn-ghost" title="Delete project">
            <Trash2 size={16} color="var(--severity-critical)" />
          </button>
        </div>
      </div>

      {/* Scans Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>
          Scan History <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>({scans.length} scans)</span>
        </h2>
        {scans.length >= 2 && (
          <Link 
            href={selectedScans.length === 2 ? `/projects/${id}/compare?scanA=${selectedScans[0]}&scanB=${selectedScans[1]}` : '#'}
            className={`btn btn-primary ${selectedScans.length !== 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={(e) => selectedScans.length !== 2 && e.preventDefault()}
          >
            <GitCompare size={16} /> Compare Selected ({selectedScans.length}/2)
          </Link>
        )}
      </div>

      {/* GitHub Integration Card */}
      <div className="glass-card bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 mt-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <Globe size={16} /> GitHub CI/CD Pipeline
            </h3>
            <p className="text-sm text-slate-400 mb-4 max-w-2xl">Connect your GitHub account and specify your repository to automatically run accessibility scans on every push. AccessIQ will automatically push a Markdown report directly to your branch.</p>
          </div>
          <a href="/api/github/auth" className="btn btn-ghost text-slate-300 border border-slate-700 hover:bg-slate-800">
             1. Connect GitHub App
          </a>
        </div>
        
        <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800">
            <label className="block text-xs font-semibold text-slate-400 mb-2">2. Link Target Repository</label>
            <div className="flex gap-2">
               <input 
                 type="text" 
                 className="input input-bordered w-full max-w-sm bg-slate-900 text-white border-slate-700 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" 
                 placeholder="e.g. Abhishek3102/portfolio"
                 defaultValue={project.githubRepo || ""}
                 id="githubRepoInput"
               />
               <button 
                 onClick={async () => {
                    const repoInput = document.getElementById('githubRepoInput') as HTMLInputElement;
                    if (!repoInput.value) return;
                    try {
                      await fetch(`/api/projects/${project._id}`, {
                         method: 'PUT',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({ githubRepo: repoInput.value })
                      });
                      alert('Repository linked successfully! Now add the Webhook URL below to your GitHub Repository Settings -> Webhooks.');
                      setProject({ ...project, githubRepo: repoInput.value });
                    } catch (_e) {
                      alert('Failed to save repository');
                    }
                 }}
                 className="btn btn-primary bg-cyan-600 hover:bg-cyan-500 border-0"
               >
                 Save Repo
               </button>
            </div>

            {project.githubRepo && (
               <div className="mt-6 pt-4 border-t border-slate-800/50">
                 <p className="text-xs font-semibold text-slate-400 mb-2">3. Add this Payload URL to GitHub Webhooks</p>
                 <code className="text-xs text-cyan-400 p-3 rounded-lg bg-slate-900 border border-cyan-900/30 block w-full overflow-x-auto shadow-inner select-all">
                   {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/webhooks/github?projectId={project._id}
                 </code>
                 <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <AlertTriangle size={12} /> Set Content Type to <strong className="text-slate-400">application/json</strong> and trigger on <strong className="text-slate-400">Just the push event</strong>.
                 </p>
               </div>
            )}
        </div>
      </div>

      {scans.length > 0 && (
        <div className="glass-card bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 mt-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <ActivityIcon /> Performance & Security Trends
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[...scans].filter(s => s.status === 'COMPLETED').reverse().map(s => ({
                date: new Date(s.createdAt).toLocaleDateString(),
                accessibility: s.accessibilityScore,
                security: s.securityScore || 0
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend verticalAlign="top" height={36}/>
                <Line name="Accessibility" type="monotone" dataKey="accessibility" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4, fill: '#06b6d4' }} activeDot={{ r: 6 }} />
                <Line name="Security" type="monotone" dataKey="security" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {scans.length === 0 ? (
        <div className="glass-card-static empty-state">
          <ScanSearch size={48} />
          <h3 style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>No scans yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Start your first scan to audit this website</p>
          <button onClick={startNewScan} className="btn btn-primary">
            <ScanSearch size={16} /> Start Scan
          </button>
        </div>
      ) : (
        <div className="glass-card-static table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Status</th>
                <th>A11y</th>
                <th>Security</th>
                <th>Critical</th>
                <th>Serious</th>
                <th>Moderate</th>
                <th>Minor</th>
                <th>Pages</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr key={scan._id} className={selectedScans.includes(scan._id) ? 'bg-cyan-900/20' : ''}>
                  <td>
                    {scan.status === 'COMPLETED' && (
                      <input 
                        type="checkbox" 
                        checked={selectedScans.includes(scan._id)}
                        onChange={() => toggleScanSelection(scan._id)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 focus:ring-cyan-500 text-cyan-500"
                        title="Select for comparison"
                      />
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${scan.status === 'COMPLETED' ? 'success' : scan.status === 'FAILED' ? 'critical' : scan.status === 'PROCESSING' ? 'moderate' : 'pending'}`}>
                      {scan.status === 'COMPLETED' ? <CheckCircle size={12} /> : scan.status === 'PROCESSING' ? <Clock size={12} /> : scan.status === 'FAILED' ? <AlertTriangle size={12} /> : null}
                      {scan.status}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, fontSize: 18, color: getScoreColor(scan.accessibilityScore) }}>
                    {scan.status === 'COMPLETED' ? scan.accessibilityScore : '—'}
                  </td>
                  <td style={{ fontWeight: 700, fontSize: 18, color: getScoreColor(scan.securityScore) }}>
                    {scan.status === 'COMPLETED' ? (scan.securityScore || '100') : '—'}
                  </td>
                  <td><span className="badge badge-critical">{scan.criticalIssues}</span></td>
                  <td><span className="badge badge-serious">{scan.seriousIssues}</span></td>
                  <td><span className="badge badge-moderate">{scan.moderateIssues}</span></td>
                  <td><span className="badge badge-minor">{scan.minorIssues}</span></td>
                  <td>{scan.pagesScanned}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {new Date(scan.createdAt).toLocaleString()}
                  </td>
                   <td>
                    {(scan.status === 'COMPLETED' || scan.status === 'PENDING' || scan.status === 'PROCESSING') && (
                      <Link href={`/scans/${scan._id}`} className="btn btn-ghost btn-sm">
                        View <ArrowRight size={12} />
                      </Link>
                    )}
                    {scan.status === 'PROCESSING' && (
                      <div className="spinner" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Helper icon component since it wasn't imported
function ActivityIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-500">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
  );
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'var(--success)';
  if (score >= 70) return 'var(--severity-moderate)';
  if (score >= 50) return 'var(--severity-serious)';
  return 'var(--severity-critical)';
}
