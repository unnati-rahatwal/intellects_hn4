'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, ArrowLeft, ScanSearch, Settings } from 'lucide-react';
import Link from 'next/link';

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Scan options
  const [startScan, setStartScan] = useState(true);
  const [discoverRoutes, setDiscoverRoutes] = useState(true);
  const [securityAudit, setSecurityAudit] = useState(true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Create project
      const projRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, baseUrl, description }),
      });

      if (!projRes.ok) {
        const data = await projRes.json();
        throw new Error(data.error || 'Failed to create project');
      }

      const project = await projRes.json();

      // Optionally start a scan immediately
      if (startScan) {
        try {
          await fetch('/api/scans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: project._id,
              urls: [baseUrl],
              options: {
                discoverRoutes,
                securityAudit,
                maxDepth: 3,
                includeShadowDom: true,
                includeIframes: true,
                visionEmulation: false,
              },
            }),
          });
        } catch {
          // Scan creation failed but project was created
        }
      }

      router.push(`/projects/${project._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: 640 }}>
      <Link href="/projects" className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to Projects
      </Link>

      <div className="page-header">
        <h1 className="page-title">New Project</h1>
        <p className="page-subtitle">Create a project and start your first accessibility audit</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="glass-card-static" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Globe size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Project Details</h3>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="label">Project Name</label>
            <input
              className="input"
              placeholder="e.g., Company Website Audit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="label">Website URL</label>
            <input
              className="input"
              type="url"
              placeholder="https://example.com"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Description (optional)</label>
            <textarea
              className="input"
              placeholder="Brief description of this audit project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        <div className="glass-card-static" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Settings size={18} color="var(--accent-primary)" />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Scan Options</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Start scan immediately</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Begin scanning as soon as the project is created</div>
              </div>
              <div className={`toggle ${startScan ? 'active' : ''}`} onClick={() => setStartScan(!startScan)} />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Auto-discover routes</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Crawl sitemap and DOM for additional pages</div>
              </div>
              <div className={`toggle ${discoverRoutes ? 'active' : ''}`} onClick={() => setDiscoverRoutes(!discoverRoutes)} />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Security header audit</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Check for missing CSP, HSTS, and other headers</div>
              </div>
              <div className={`toggle ${securityAudit ? 'active' : ''}`} onClick={() => setSecurityAudit(!securityAudit)} />
            </label>
          </div>
        </div>

        {error && (
          <div style={{ padding: 12, background: 'var(--severity-critical-bg)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--severity-critical)', marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '12px 24px', fontSize: 15 }}>
          {loading ? (
            <><div className="spinner" /> Creating...</>
          ) : (
            <><ScanSearch size={18} /> Create Project {startScan ? '& Start Scan' : ''}</>
          )}
        </button>
      </form>
    </div>
  );
}
