'use client';

import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, GitCompare, CheckCircle, AlertTriangle, Bug } from 'lucide-react';

interface ScanData {
  createdAt: string;
  accessibilityScore: number;
  totalViolations: number;
  criticalIssues: number;
  seriousIssues: number;
  moderateIssues: number;
  minorIssues: number;
}

interface ViolationData {
  ruleId: string;
  cssSelector: string;
  impact: string;
}

interface CompareData {
  scanA: { scan: ScanData; violations: ViolationData[] } | null;
  scanB: { scan: ScanData; violations: ViolationData[] } | null;
  loading: boolean;
  error: string | null;
}

export default function CompareScansPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const scanA_id = searchParams.get('scanA');
  const scanB_id = searchParams.get('scanB');
  
  const [data, setData] = useState<CompareData>({ scanA: null, scanB: null, loading: true, error: null });

  useEffect(() => {
    if (!scanA_id || !scanB_id) {
      setData(prev => ({ ...prev, loading: false, error: 'Please select two scans to compare.' }));
      return;
    }

    async function fetchScans() {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        const [resA, resB] = await Promise.all([
          fetch(`/api/scans/${scanA_id}/report`, { headers }),
          fetch(`/api/scans/${scanB_id}/report`, { headers })
        ]);

        if (!resA.ok || !resB.ok) throw new Error('Failed to load scan data');

        const [dataA, dataB] = await Promise.all([resA.json(), resB.json()]);

        // Ensure chronological order (A is older, B is newer)
        const timeA = new Date(dataA.scan.createdAt).getTime();
        const timeB = new Date(dataB.scan.createdAt).getTime();

        if (timeA > timeB) {
          setData({ scanA: dataB, scanB: dataA, loading: false, error: null });
        } else {
          setData({ scanA: dataA, scanB: dataB, loading: false, error: null });
        }
      } catch (err: unknown) {
        setData(prev => ({ ...prev, loading: false, error: err instanceof Error ? err.message : String(err) }));
      }
    }
    fetchScans();
  }, [scanA_id, scanB_id]);

  if (data.loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <GitCompare className="w-12 h-12 text-cyan-500 animate-bounce" />
          <p className="text-slate-400 font-medium">Analyzing version differences...</p>
        </div>
      </div>
    );
  }

  if (data.error || !data.scanA || !data.scanB) {
    return (
      <div className="empty-state">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2>Comparison Error</h2>
        <p className="text-slate-400">{data.error}</p>
        <Link href={`/projects/${id}`} className="btn btn-primary mt-6">Back to Project</Link>
      </div>
    );
  }

  const sA = data.scanA.scan;
  const sB = data.scanB.scan;

  // Compute Diffs
  const scoreDelta = sB.accessibilityScore - sA.accessibilityScore;
  const issueDelta = sB.totalViolations - sA.totalViolations;

  // Compute Violation Resolution matches
  // A violation is unique by ruleId + cssSelector
  const getSignature = (v: ViolationData) => `${v.ruleId}::${v.cssSelector}`;

  const vA = new Map(data.scanA.violations.map(v => [getSignature(v), v]));
  const vB = new Map(data.scanB.violations.map(v => [getSignature(v), v]));

  const resolved: ViolationData[] = [];
  const introduced: ViolationData[] = [];
  const persistent: ViolationData[] = [];

  for (const [sig, v] of vA.entries()) {
    if (!vB.has(sig)) resolved.push(v);
    else persistent.push(v);
  }

  for (const [sig, v] of vB.entries()) {
    if (!vA.has(sig)) introduced.push(v);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-16">
      <Link href={`/projects/${id}`} className="btn btn-ghost btn-sm">
        <ArrowLeft size={14} /> Back to History
      </Link>

      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <GitCompare className="w-8 h-8 text-cyan-500" /> Version Comparison
          </h1>
          <p className="text-slate-400 mt-2">
            Comparing <span className="text-white font-medium">{new Date(sA.createdAt).toLocaleString()}</span> vs <span className="text-white font-medium">{new Date(sB.createdAt).toLocaleString()}</span>
          </p>
        </div>
      </div>

      {/* Delta Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DeltaCard title="Accessibility Score" valA={sA.accessibilityScore} valB={sB.accessibilityScore} delta={scoreDelta} higherIsBetter={true} suffix="%" />
        <DeltaCard title="Total Issues" valA={sA.totalViolations} valB={sB.totalViolations} delta={issueDelta} higherIsBetter={false} />
        <DeltaCard title="Critical Issues" valA={sA.criticalIssues} valB={sB.criticalIssues} delta={sB.criticalIssues - sA.criticalIssues} higherIsBetter={false} />
        <DeltaCard title="Serious Issues" valA={sA.seriousIssues} valB={sB.seriousIssues} delta={sB.seriousIssues - sA.seriousIssues} higherIsBetter={false} />
      </div>

      {/* Issue Resolution Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Resolved */}
        <div className="glass-card bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-green-400 flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5" /> Resolved ({resolved.length})
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {resolved.length === 0 ? <p className="text-sm text-slate-500">No issues resolved.</p> : resolved.map((v, i) => (
              <div key={i} className="bg-slate-800/50 p-3 rounded-xl border border-green-900/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-300">{v.impact}</span>
                  <span className="text-sm text-white font-medium">{v.ruleId}</span>
                </div>
                <code className="text-xs text-green-300 block truncate">{v.cssSelector}</code>
              </div>
            ))}
          </div>
        </div>

        {/* Introduced */}
        <div className="glass-card bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5" /> Newly Introduced ({introduced.length})
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {introduced.length === 0 ? <p className="text-sm text-slate-500">No new issues! Great job.</p> : introduced.map((v, i) => (
              <div key={i} className="bg-slate-800/50 p-3 rounded-xl border border-red-900/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-300">{v.impact}</span>
                  <span className="text-sm text-white font-medium">{v.ruleId}</span>
                </div>
                <code className="text-xs text-red-300 block truncate">{v.cssSelector}</code>
              </div>
            ))}
          </div>
        </div>

        {/* Persistent */}
        <div className="glass-card bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-slate-300 flex items-center gap-2 mb-4">
            <Bug className="w-5 h-5 text-slate-500" /> Unresolved ({persistent.length})
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {persistent.length === 0 ? <p className="text-sm text-slate-500">No lingering issues.</p> : persistent.map((v, i) => (
              <div key={i} className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-400">{v.impact}</span>
                  <span className="text-sm text-slate-300 font-medium">{v.ruleId}</span>
                </div>
                <code className="text-xs text-slate-500 block truncate">{v.cssSelector}</code>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}

function DeltaCard({ title, valA, valB, delta, higherIsBetter, suffix = '' }: { title: string, valA: number, valB: number, delta: number, higherIsBetter: boolean, suffix?: string }) {
  const isZero = delta === 0;
  const isPositive = delta > 0;
  
  let colorClass = 'text-slate-400';
  let badgeClass = 'bg-slate-800 text-slate-400';
  let sign = '';

  if (!isZero) {
    const isGood = higherIsBetter ? isPositive : !isPositive;
    colorClass = isGood ? 'text-green-400' : 'text-red-400';
    badgeClass = isGood ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400';
    sign = isPositive ? '+' : ''; // negative delta already has '-' sign
  }

  return (
    <div className="glass-card bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
      <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">{title}</h4>
      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold text-white">{valB}{suffix}</span>
        {!isZero && (
          <span className={`text-sm font-bold px-2 py-1 rounded-md mb-1 ${badgeClass}`}>
            {sign}{delta}{suffix}
          </span>
        )}
      </div>
      <div className="text-xs text-slate-500 flex justify-between mt-3 font-medium">
        <span>Prev: {valA}{suffix}</span>
        {isZero && <span>No Change</span>}
      </div>
      {/* Decorative background gradient indicator based on delta direction */}
      {!isZero && (
        <div className={`absolute -right-4 -bottom-4 w-24 h-24 blur-2xl opacity-10 rounded-full ${colorClass === 'text-green-400' ? 'bg-green-500' : 'bg-red-500'} pointer-events-none`} />
      )}
    </div>
  );
}
