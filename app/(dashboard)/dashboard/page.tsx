'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Plus,
  TrendingUp,
  GlobeIcon as Globe,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Project {
  _id: string;
  name: string;
  baseUrl: string;
  createdAt: string;
}

interface Scan {
  _id: string;
  projectId: string;
  status: string;
  accessibilityScore: number;
  totalViolations: number;
  criticalIssues: number;
  seriousIssues: number;
  pagesScanned: number;
  completedAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentScans, setRecentScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auth Guard
    const token = localStorage.getItem('accessiq_token');
    if (!token) {
      router.push('/login');
      return;
    }

    async function fetchData() {
      try {
        const [projRes] = await Promise.all([
          fetch('/api/projects'),
        ]);
        const projData = await projRes.json();
        setProjects(Array.isArray(projData) ? projData : []);

        // Fetch recent scans for each project
        const allScans: Scan[] = [];
        for (const proj of (Array.isArray(projData) ? projData : []).slice(0, 5)) {
          try {
            const scanRes = await fetch(`/api/projects/${proj._id}/scans`);
            const scanData = await scanRes.json();
            if (Array.isArray(scanData)) {
              allScans.push(...scanData.slice(0, 3));
            }
          } catch { /* ignore */ }
        }
        setRecentScans(allScans.sort((a, b) =>
          new Date(b.completedAt || b._id).getTime() - new Date(a.completedAt || a._id).getTime()
        ).slice(0, 8));
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router]);

  const avgScore = recentScans.length > 0
    ? Math.round(recentScans.reduce((sum, s) => sum + (s.accessibilityScore || 0), 0) / recentScans.length)
    : 0;
  const totalViolations = recentScans.reduce((sum, s) => sum + (s.totalViolations || 0), 0);
  const criticalTotal = recentScans.reduce((sum, s) => sum + (s.criticalIssues || 0), 0);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="skeleton" style={{ width: 200, height: 32, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 300, height: 16 }} />
        </div>
        <div className="stats-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: 120 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your accessibility audit projects</p>
        </div>
        <Link href="/projects/new" className="btn btn-primary">
          <Plus size={16} />
          New Project
        </Link>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 32 }}>
        <div className="glass-card-static" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ padding: 12, borderRadius: 'var(--radius-sm)', background: 'rgba(99, 102, 241, 0.15)' }}>
            <FolderIcon />
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{projects.length}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Projects</div>
          </div>
        </div>

        <div className="glass-card-static" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ padding: 12, borderRadius: 'var(--radius-sm)', background: 'rgba(34, 197, 94, 0.15)' }}>
            <TrendingUp size={24} color="var(--success)" />
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{avgScore || '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Score</div>
          </div>
        </div>

        <div className="glass-card-static" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ padding: 12, borderRadius: 'var(--radius-sm)', background: 'var(--severity-serious-bg)' }}>
            <AlertTriangle size={24} color="var(--severity-serious)" />
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{totalViolations}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Issues</div>
          </div>
        </div>

        <div className="glass-card-static" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ padding: 12, borderRadius: 'var(--radius-sm)', background: 'var(--severity-critical-bg)' }}>
            <Shield size={24} color="var(--severity-critical)" />
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{criticalTotal}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Critical</div>
          </div>
        </div>
      </div>

      {/* Projects */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Projects</h2>
          <Link href="/projects" className="btn btn-ghost btn-sm">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="glass-card-static empty-state">
            <Globe size={48} />
            <h3 style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>No projects yet</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Create your first project to start auditing</p>
            <Link href="/projects/new" className="btn btn-primary">
              <Plus size={16} /> Create Project
            </Link>
          </div>
        ) : (
          <div className="grid-cards">
            {projects.slice(0, 6).map((project) => (
              <Link key={project._id} href={`/projects/${project._id}`} style={{ textDecoration: 'none' }}>
                <div className="glass-card" style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ padding: 8, borderRadius: 'var(--radius-sm)', background: 'var(--accent-glow)' }}>
                      <Globe size={18} color="var(--accent-primary)" />
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{project.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{project.baseUrl}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Scans */}
      {recentScans.length > 0 && (
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Recent Scans</h2>
          <div className="glass-card-static table-container">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Issues</th>
                  <th>Pages</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentScans.map((scan) => (
                  <tr key={scan._id}>
                    <td>
                      <span className={`badge badge-${scan.status === 'COMPLETED' ? 'success' : scan.status === 'FAILED' ? 'critical' : 'pending'}`}>
                        {scan.status === 'COMPLETED' ? <CheckCircle size={12} /> : scan.status === 'PROCESSING' ? <Clock size={12} /> : null}
                        {scan.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: getScoreColor(scan.accessibilityScore) }}>
                      {scan.accessibilityScore || '—'}
                    </td>
                    <td>{scan.totalViolations}</td>
                    <td>{scan.pagesScanned}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                      {scan.completedAt ? new Date(scan.completedAt).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <Link href={`/scans/${scan._id}`} className="btn btn-ghost btn-sm">
                        View <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function FolderIcon() {
  return <Globe size={24} color="var(--accent-primary)" />;
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'var(--success)';
  if (score >= 70) return 'var(--severity-moderate)';
  if (score >= 50) return 'var(--severity-serious)';
  return 'var(--severity-critical)';
}
