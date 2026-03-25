'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ScanSearch, Trash2, Clock, CheckCircle, AlertTriangle, ArrowRight, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Project {
  _id: string;
  name: string;
  baseUrl: string;
  description: string;
  totalScans: number;
}

interface Scan {
  _id: string;
  status: string;
  accessibilityScore: number;
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

  useEffect(() => {
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
  }, [id]);

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
      await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          urls: [project.baseUrl],
          options: { discoverRoutes: true, securityAudit: true, maxDepth: 3, includeShadowDom: true, includeIframes: true, visionEmulation: false },
        }),
      });
      const res = await fetch(`/api/projects/${id}/scans`);
      const data = await res.json();
      if (Array.isArray(data)) setScans(data);
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

      {/* Scans */}
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
        Scan History <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>({scans.length} scans)</span>
      </h2>

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
                <th>Status</th>
                <th>Score</th>
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
                <tr key={scan._id}>
                  <td>
                    <span className={`badge badge-${scan.status === 'COMPLETED' ? 'success' : scan.status === 'FAILED' ? 'critical' : scan.status === 'PROCESSING' ? 'moderate' : 'pending'}`}>
                      {scan.status === 'COMPLETED' ? <CheckCircle size={12} /> : scan.status === 'PROCESSING' ? <Clock size={12} /> : scan.status === 'FAILED' ? <AlertTriangle size={12} /> : null}
                      {scan.status}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, fontSize: 18, color: getScoreColor(scan.accessibilityScore) }}>
                    {scan.status === 'COMPLETED' ? scan.accessibilityScore : '—'}
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
                    {scan.status === 'COMPLETED' && (
                      <Link href={`/scans/${scan._id}`} className="btn btn-ghost btn-sm">
                        View <ArrowRight size={12} />
                      </Link>
                    )}
                    {(scan.status === 'PENDING' || scan.status === 'PROCESSING') && (
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

function getScoreColor(score: number): string {
  if (score >= 90) return 'var(--success)';
  if (score >= 70) return 'var(--severity-moderate)';
  if (score >= 50) return 'var(--severity-serious)';
  return 'var(--severity-critical)';
}
