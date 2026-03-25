'use client';

import { useEffect, useState, useRef, useCallback, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ZoomIn, ZoomOut, Maximize2, List, Eye } from 'lucide-react';

interface Violation {
  _id: string;
  pageUrl: string;
  ruleId: string;
  impact: string;
  description: string;
  failureSummary: string;
  cssSelector: string;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  serious: '#f97316',
  moderate: '#eab308',
  minor: '#3b82f6',
};

export default function VisualExplorerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [violations, setViolations] = useState<Violation[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>('');
  const [hoveredViolation, setHoveredViolation] = useState<string | null>(null);
  const [selectedViolation, setSelectedViolation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [showPanel, setShowPanel] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/scans/${id}/violations`);
        const data = await res.json();
        const viols = data.violations || [];
        setViolations(viols);

        const uniquePages = [...new Set(viols.map((v: Violation) => v.pageUrl))] as string[];
        setPages(uniquePages);
        if (uniquePages.length > 0) setSelectedPage(uniquePages[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const pageViolations = violations.filter(v => v.pageUrl === selectedPage);

  const drawOverlays = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas to container
    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    pageViolations.forEach((v) => {
      if (!v.boundingBox) return;

      const { x, y, width, height } = v.boundingBox;
      const sx = x * zoom;
      const sy = y * zoom;
      const sw = width * zoom;
      const sh = height * zoom;

      const color = SEVERITY_COLORS[v.impact] || '#6366f1';
      const isHovered = hoveredViolation === v._id;
      const isSelected = selectedViolation === v._id;

      // Draw rectangle
      ctx.strokeStyle = color;
      ctx.lineWidth = isHovered || isSelected ? 3 : 2;
      ctx.setLineDash(isSelected ? [] : [6, 3]);
      ctx.strokeRect(sx, sy, sw, sh);

      // Fill with transparency
      ctx.fillStyle = `${color}${isHovered || isSelected ? '30' : '15'}`;
      ctx.fillRect(sx, sy, sw, sh);

      // Label
      if (isHovered || isSelected) {
        const label = `${v.ruleId} (${v.impact})`;
        ctx.font = 'bold 11px Inter, sans-serif';
        const textWidth = ctx.measureText(label).width;
        
        ctx.fillStyle = color;
        ctx.fillRect(sx, sy - 22, textWidth + 12, 20);
        
        ctx.fillStyle = 'white';
        ctx.fillText(label, sx + 6, sy - 7);
      }
    });
  }, [pageViolations, hoveredViolation, selectedViolation, zoom]);

  useEffect(() => {
    drawOverlays();
  }, [drawOverlays]);

  useEffect(() => {
    const handleResize = () => drawOverlays();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawOverlays]);

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ width: 200, height: 32, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 600 }} />
      </div>
    );
  }

  const proxyUrl = selectedPage
    ? `/api/proxy?url=${encodeURIComponent(selectedPage)}`
    : '';

  return (
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href={`/scans/${id}`} className="btn btn-ghost btn-sm">
            <ArrowLeft size={14} />
          </Link>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>Visual Explorer</h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {pageViolations.length} violations on this page
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Page selector */}
          <select
            value={selectedPage}
            onChange={(e) => setSelectedPage(e.target.value)}
            className="input"
            style={{ width: 'auto', minWidth: 200, padding: '6px 12px', fontSize: 12 }}
          >
            {pages.map(p => (
              <option key={p} value={p}>{new URL(p).pathname || '/'}</option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>
              <ZoomOut size={14} />
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 40, textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>
              <ZoomIn size={14} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setZoom(1)}>
              <Maximize2 size={14} />
            </button>
          </div>

          <button className="btn btn-ghost btn-sm" onClick={() => setShowPanel(!showPanel)}>
            {showPanel ? <Eye size={14} /> : <List size={14} />}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', gap: 16, overflow: 'hidden' }}>
        {/* Viewport */}
        <div
          ref={containerRef}
          style={{ flex: 1, position: 'relative', overflow: 'auto', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}
        >
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${100/zoom}%` }}>
            {proxyUrl && (
              <iframe
                ref={iframeRef}
                src={proxyUrl}
                style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
                sandbox="allow-same-origin"
                title="Page preview"
                onLoad={() => setTimeout(drawOverlays, 500)}
              />
            )}
          </div>

          {/* Canvas overlay */}
          <canvas
            ref={canvasRef}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          />
        </div>

        {/* Side panel */}
        {showPanel && (
          <div style={{ width: 340, flexShrink: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Issues ({pageViolations.length})
            </div>

            {pageViolations.map((v) => (
              <div
                key={v._id}
                className="glass-card-static"
                style={{
                  padding: 12,
                  cursor: 'pointer',
                  border: selectedViolation === v._id ? `1px solid ${SEVERITY_COLORS[v.impact]}` : undefined,
                  background: hoveredViolation === v._id ? 'var(--bg-card-hover)' : undefined,
                }}
                onMouseEnter={() => setHoveredViolation(v._id)}
                onMouseLeave={() => setHoveredViolation(null)}
                onClick={() => setSelectedViolation(selectedViolation === v._id ? null : v._id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span className={`badge badge-${v.impact}`} style={{ fontSize: 9 }}>{v.impact}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{v.ruleId}</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {v.description}
                </p>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                  {v.cssSelector}
                </div>

                {selectedViolation === v._id && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Failure:</div>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {v.failureSummary}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
