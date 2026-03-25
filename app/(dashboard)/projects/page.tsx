'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Globe, ArrowRight, Search } from 'lucide-react';

interface Project {
  _id: string;
  name: string;
  baseUrl: string;
  description: string;
  createdAt: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auth Guard
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch('/api/projects')
      .then(r => r.json())
      .then(data => setProjects(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.baseUrl.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Manage your accessibility audit projects</p>
        </div>
        <Link href="/projects/new" className="btn btn-primary">
          <Plus size={16} /> New Project
        </Link>
      </div>

      <div style={{ marginBottom: 24, position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
        <input
          className="input"
          style={{ paddingLeft: 36 }}
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid-cards">
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 140 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card-static empty-state">
          <Globe size={48} />
          <h3 style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>
            {search ? 'No matching projects' : 'No projects yet'}
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
            {search ? 'Try a different search term' : 'Create your first project to get started'}
          </p>
          {!search && (
            <Link href="/projects/new" className="btn btn-primary">
              <Plus size={16} /> Create Project
            </Link>
          )}
        </div>
      ) : (
        <div className="grid-cards">
          {filtered.map((project) => (
            <Link key={project._id} href={`/projects/${project._id}`} style={{ textDecoration: 'none' }}>
              <div className="glass-card" style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ padding: 10, borderRadius: 'var(--radius-sm)', background: 'var(--accent-glow)' }}>
                    <Globe size={20} color="var(--accent-primary)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{project.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-all' }}>{project.baseUrl}</div>
                  </div>
                  <ArrowRight size={16} color="var(--text-muted)" />
                </div>
                {project.description && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{project.description}</p>
                )}
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
