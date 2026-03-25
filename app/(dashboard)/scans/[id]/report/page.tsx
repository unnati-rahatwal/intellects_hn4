'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  CheckCircle,
  Code,
  FileText,
  Shield,
  Zap,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Calendar,
  Globe,
  Image as ImageIcon,
  Eye,
  Lock,
  Unlock,
  Network,
  Layers,
  Download,
  Printer
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import ReactDiffViewer from 'react-diff-viewer-continued';

interface ScanReport {
  scan: {
    _id: string;
    targetUrls: string[];
    completedAt: string;
    accessibilityScore: number;
    totalViolations: number;
    criticalIssues: number;
    seriousIssues: number;
    moderateIssues: number;
    minorIssues: number;
    performanceSummary?: {
      avgLoadTime: number;
      avgFcp: number;
      avgTaskDuration: number;
    };
    aiSummary?: {
      executiveSummary: string;
      keyFindings: string[];
      recommendations: string[];
      generatedAt: string | null;
    };
    pagesScanned?: number;
  };
  pages: any[];
  violations: any[];
}

const SEVERITY_COLORS = {
  critical: '#ef4444',
  serious: '#f97316',
  moderate: '#eab308',
  minor: '#3b82f6',
};

const STAGE_LABELS: Record<string, string> = {
  PAGE_LOADED: 'Page Loaded',
  CDP_CAPTURED: 'Browser Metrics',
  AXE_ANALYZED: 'Axe Analysis',
  VISION_EMULATION: 'Vision Emulation',
  FINAL: 'Final Snapshot',
};

function ScoreGauge({ score, label, icon: Icon }: { score: number; label: string; icon: React.ElementType }) {
  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-green-500';
    if (s >= 50) return 'text-amber-500';
    return 'text-red-500';
  };
  
  const colorClass = getScoreColor(score);
  
  return (
    <div className="glass-card flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-2xl">
      <div className="relative w-32 h-32 flex items-center justify-center mb-4">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-white/10"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className={colorClass}
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray={`${score}, 100`}
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={`text-4xl font-bold ${colorClass}`}>{score}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-slate-300 font-medium">
        <Icon className="w-5 h-5" />
        {label}
      </div>
    </div>
  );
}

function ViolationCard({ violation }: { violation: any }) {
  const [expanded, setExpanded] = useState(false);
  const ai = violation.aiRemediation;
  const status = ai?.status || 'PENDING';
  const hasAi = status === 'GENERATED';
  const isPending = status === 'PENDING';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg mb-4 hover:border-slate-700 transition-colors">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer bg-slate-800/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <span
            className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md"
            style={{
              backgroundColor: `${SEVERITY_COLORS[violation.impact as keyof typeof SEVERITY_COLORS] || '#475569'}20`,
              color: SEVERITY_COLORS[violation.impact as keyof typeof SEVERITY_COLORS] || '#475569'
            }}
          >
            {violation.impact}
          </span>
          <span className="font-semibold text-slate-200">{violation.ruleId}</span>
          <span className="text-sm text-slate-400 max-w-lg truncate">{violation.description}</span>
        </div>
        <div className="flex items-center gap-4">
          {hasAi && (
            <span className="flex items-center gap-1 text-xs font-medium text-purple-400 bg-purple-500/10 px-2 py-1 rounded-md">
              <BrainCircuit className="w-3 h-3" /> AI Remediated
            </span>
          )}
          <div className="print:hidden">
            {expanded ? <ChevronUp className="text-slate-500" /> : <ChevronDown className="text-slate-500" />}
          </div>
        </div>
      </div>

      <div className={`p-6 border-t border-slate-800 space-y-6 ${expanded ? 'block' : 'hidden print:block'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400" /> {hasAi ? 'Specific Failure Diagnosis (AI)' : 'Failure Summary'}
            </h4>
            <div className="text-sm text-slate-400 leading-relaxed bg-black/20 p-3 rounded-lg border border-slate-800">
              {hasAi ? (
                <p>{ai?.analysis}</p>
              ) : isPending ? (
                <div className="flex items-center gap-2 text-cyan-400 animate-pulse">
                  <BrainCircuit className="w-4 h-4" />
                  <span>AI Diagnosis pending...</span>
                </div>
              ) : (
                <p>{violation.failureSummary || violation.help || violation.description || 'No summary available.'}</p>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
              <Code className="w-4 h-4 text-blue-400" /> Target Selector
            </h4>
            <code className="block text-xs text-blue-300 bg-blue-950/30 p-3 rounded-lg border border-blue-900/50 break-all">
              {violation.cssSelector}
            </code>

            {violation.screenshotPath && (
              <div className="mt-3 border border-slate-800 rounded-lg overflow-hidden">
                <div className="px-3 py-2 text-xs text-slate-400 bg-slate-900/70 border-b border-slate-800">
                  Issue Snapshot
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={violation.screenshotPath}
                  alt={`Issue snapshot for ${violation.ruleId}`}
                  className="w-full max-h-56 object-contain bg-black/40"
                  loading="lazy"
                />
              </div>
            )}
          </div>
        </div>

        {hasAi ? (
          <div className="mt-6 border border-purple-900/40 rounded-xl overflow-hidden">
            <div className="bg-purple-900/20 px-4 py-3 border-b border-purple-900/40 flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold text-purple-200">AI Remediation Analysis</h3>
            </div>
            <div className="p-5 space-y-6 bg-slate-900/50">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Fix Explanation</h4>
                <p className="text-sm text-slate-300 leading-relaxed border-l-2 border-purple-500 pl-3">
                  {ai.explanation}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Code Diff</h4>
                <div className="rounded-lg overflow-hidden border border-slate-800">
                  <ReactDiffViewer
                    oldValue={violation.htmlSnippet}
                    newValue={ai.remediatedCode}
                    splitView={false}
                    useDarkTheme={true}
                    styles={{
                      variables: {
                        dark: {
                          diffViewerBackground: '#0f172a',
                          diffViewerColor: '#cbd5e1',
                          addedBackground: '#064e3b',
                          addedColor: '#a7f3d0',
                          removedBackground: '#7f1d1d',
                          removedColor: '#fecaca',
                          wordAddedBackground: '#059669',
                          wordRemovedBackground: '#dc2626',
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
              <Code className="w-4 h-4 text-slate-400" /> HTML Snippet
            </h4>
            <pre className="text-xs text-slate-300 bg-black/40 p-4 rounded-lg border border-slate-800 overflow-x-auto">
              {violation.htmlSnippet}
            </pre>
          </div>
        )}

        {violation.visionDeficiencies && violation.visionDeficiencies.length > 0 && (
          <div className="mt-6 border-t border-slate-800 pt-6">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-4">
              <ImageIcon className="w-4 h-4 text-pink-400" /> Vision Deficiency Simulations
            </h4>
            <p className="text-xs text-slate-400 mb-4 print:hidden">
              This shows how users with different types of colorblindness perceive the target element.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {violation.visionDeficiencies.map((sim: any, idx: number) => (
                <div key={idx} className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
                  <div className="text-xs text-center text-slate-300 font-medium uppercase tracking-wider mb-2">
                    {sim.type}
                  </div>
                  <div className="relative aspect-video w-full rounded overflow-hidden bg-black/40 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={sim.base64Image} 
                      alt={`${sim.type} simulation`} 
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DetailedReportPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [data, setData] = useState<ScanReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      try {
        const token = localStorage.getItem('token');
        if (!token) return router.push('/login');

        const res = await fetch(`/api/scans/${id}/report`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Failed to load report');
        
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [id, router]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-medium">Generating Comprehensive Report...</p>
        </div>
      </div>
    );
  }

  const { scan, violations, pages } = data;
  const handleExportJson = () => {
    if (scan) {
      window.open(`/api/scans/${scan._id}/export`, '_blank');
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  // Severity Distribution Data for Pie Chart
  const severityData = [
    { name: 'Critical', value: scan.criticalIssues, color: SEVERITY_COLORS.critical },
    { name: 'Serious', value: scan.seriousIssues, color: SEVERITY_COLORS.serious },
    { name: 'Moderate', value: scan.moderateIssues, color: SEVERITY_COLORS.moderate },
    { name: 'Minor', value: scan.minorIssues, color: SEVERITY_COLORS.minor },
  ].filter(d => d.value > 0);

  // Performance calculation
  const perfScore = scan.performanceSummary?.avgFcp 
    ? Math.max(0, 100 - (scan.performanceSummary.avgFcp / 30)) 
    : 100;

  // Security calculation
  let secScore = 100;
  if (pages.length > 0) {
    const validPages = pages.filter(p => p.securityHeaders && typeof p.securityHeaders.score === 'number');
    if (validPages.length > 0) {
      secScore = Math.round(validPages.reduce((acc, p) => acc + p.securityHeaders.score, 0) / validPages.length);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/scans/${scan._id}`} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Executive Audit Report</h1>
            <p className="text-slate-400 flex items-center gap-2 mt-1">
              <Globe className="w-4 h-4" /> {scan.targetUrls[0]}
              <span className="text-slate-600">•</span>
              <Calendar className="w-4 h-4" /> {new Date(scan.completedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handlePrintPdf} className="btn bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 print:hidden text-sm px-4 py-2 flex items-center rounded-lg transition-colors">
            <Printer className="w-4 h-4 mr-2" /> Save PDF
          </button>
          <button onClick={handleExportJson} className="btn bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 print:hidden text-sm px-4 py-2 flex items-center rounded-lg transition-colors">
            <Download className="w-4 h-4 mr-2" /> Export JSON
          </button>
          <Link href={`/scans/${scan._id}/explore`} className="btn btn-primary bg-cyan-500 hover:bg-cyan-600 text-slate-900 print:hidden text-sm px-4 py-2 flex items-center rounded-lg font-medium transition-colors">
            <ImageIcon className="w-4 h-4 mr-2" /> Visual Explorer
          </Link>
        </div>
      </div>

      {/* Global Scores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ScoreGauge score={scan.accessibilityScore || 0} label="Accessibility Health" icon={Activity} />
        <ScoreGauge score={Math.round(perfScore)} label="Performance Profile" icon={Zap} />
        <ScoreGauge score={secScore} label="Security Posture" icon={Shield} />
      </div>

      {/* Main Grid: AI Summary + Violations Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Executive Summary */}
        <div className="lg:col-span-2 glass-card bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden relative">
          <div className="absolute inset-0 bg-linear-to-br from-purple-500/10 to-transparent pointer-events-none" />
          <div className="p-6 relative">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <BrainCircuit className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">AI Executive Summary</h2>
                <p className="text-xs text-purple-400 font-medium">Generated by Featherless Explainable AI</p>
              </div>
            </div>

            {scan.aiSummary?.executiveSummary ? (
              <div className="space-y-6">
                <p className="text-slate-300 leading-relaxed text-lg">
                  {scan.aiSummary.executiveSummary}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" /> Key Findings
                    </h3>
                    <ul className="space-y-3">
                      {scan.aiSummary.keyFindings.map((finding: string, i: number) => (
                        <li key={i} className="flex gap-3 text-sm text-slate-300 bg-slate-800/50 p-3 rounded-lg">
                          <span className="text-amber-500 font-bold">•</span>
                          {finding}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" /> Recommendations
                    </h3>
                    <ul className="space-y-3">
                      {scan.aiSummary.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="flex gap-3 text-sm text-slate-300 bg-slate-800/50 p-3 rounded-lg">
                          <span className="text-green-500 font-bold">{i + 1}.</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <BrainCircuit className="w-12 h-12 mb-4 opacity-50" />
                <p>AI Summary is being generated. Please refresh shortly.</p>
              </div>
            )}
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="glass-card bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col">
          <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-500" /> Impact Distribution
          </h2>
          <p className="text-sm text-slate-400 mb-6">Total {scan.totalViolations} issues identified</p>
          
          <div className="flex-1 min-h-[250px] relative">
            {scan.totalViolations > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                No violations found!
              </div>
            )}
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
              <span className="text-3xl font-bold text-white">{scan.totalViolations}</span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Issues</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Profile */}
      <div className="glass-card bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" /> Performance Intelligence
        </h2>
        <p className="text-sm text-slate-400 mb-6">Aggregate metrics from deep browser-level profiling</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Avg Load Time</h4>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-white">{Math.round(scan.performanceSummary?.avgLoadTime || 0)}</span>
              <span className="text-sm text-slate-500 mb-1">ms</span>
            </div>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">First Contentful Paint</h4>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-white">{(scan.performanceSummary?.avgFcp ? (scan.performanceSummary.avgFcp * 1000).toFixed(0) : 0)}</span>
              <span className="text-sm text-slate-500 mb-1">ms</span>
            </div>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Task Duration</h4>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-white">{(scan.performanceSummary?.avgTaskDuration ? (scan.performanceSummary.avgTaskDuration * 1000).toFixed(0) : 0)}</span>
              <span className="text-sm text-slate-500 mb-1">ms</span>
            </div>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Pages Analyzed</h4>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-white">{scan.pagesScanned}</span>
              <span className="text-sm text-slate-500 mb-1">URLs</span>
            </div>
          </div>
        </div>

        {/* AI Performance Explanation */}
        {pages.some((p: any) => p.aiInsights?.performanceExplanation) && (
          <div className="mt-6 bg-linear-to-r from-yellow-500/10 to-transparent border border-yellow-500/20 rounded-xl p-4">
            <h4 className="text-sm font-bold text-yellow-400 flex items-center gap-2 mb-2">
              <BrainCircuit className="w-4 h-4" /> AI Performance Analysis
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              {pages.find((p: any) => p.aiInsights?.performanceExplanation)?.aiInsights?.performanceExplanation}
            </p>
          </div>
        )}
      </div>

      {/* Per-Page Breakdown */}
      <div className="glass-card bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-500" /> Per-Page Breakdown
        </h2>
        <p className="text-sm text-slate-400 mb-6">Individual accessibility and performance scores for each analyzed URL</p>
        
        <div className="space-y-3">
          {pages.map((p: any) => (
            <div key={p._id} className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 hover:border-slate-600/60 transition-colors">
              {(() => {
                const stageShots = Array.isArray(p.stageScreenshots) && p.stageScreenshots.length > 0
                  ? p.stageScreenshots
                  : (p.screenshotPath
                    ? [{ stage: 'FINAL', imageData: p.screenshotPath, capturedAt: p.createdAt }]
                    : []);

                return (
                  <>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{p.url}</p>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <span className="text-xs text-slate-400">Score: <span className={`font-bold ${p.accessibilityScore >= 80 ? 'text-green-400' : p.accessibilityScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{p.accessibilityScore}%</span></span>
                    <span className="text-xs text-slate-400">Violations: <span className="text-white font-semibold">{p.violationCount}</span></span>
                    <span className="text-xs text-slate-400">Load: <span className="text-white font-semibold">{p.loadTimeMs}ms</span></span>
                    {p.performanceMetrics?.FirstContentfulPaint > 0 && (
                      <span className="text-xs text-slate-400">FCP: <span className="text-white font-semibold">{(p.performanceMetrics.FirstContentfulPaint * 1000).toFixed(0)}ms</span></span>
                    )}
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2 ${p.accessibilityScore >= 80 ? 'border-green-500 text-green-400' : p.accessibilityScore >= 50 ? 'border-amber-500 text-amber-400' : 'border-red-500 text-red-400'}`}>
                  {p.accessibilityScore}
                </div>
              </div>

              {stageShots.length > 0 && (
                <div className="mt-4 border-t border-slate-700/50 pt-4">
                  <div className="text-xs text-slate-400 mb-3">Scan Stage Snapshots</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {stageShots.map((shot: any, idx: number) => (
                      <div key={`${p._id}-stage-${idx}`} className="bg-slate-900/70 border border-slate-700 rounded-lg overflow-hidden">
                        <div className="px-2 py-1.5 text-[11px] font-medium text-slate-300 border-b border-slate-700">
                          {STAGE_LABELS[shot.stage] || shot.stage}
                        </div>
                        <div className="aspect-video bg-black/30">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={shot.imageData}
                            alt={`${STAGE_LABELS[shot.stage] || shot.stage} for ${p.url}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      </div>

      {/* Browser Intelligence (AI-explained browser audit issues) */}
      <div className="glass-card bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Network className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Browser Intelligence Analysis</h2>
            <p className="text-xs text-orange-400 font-medium">Automated browser-level audit findings explained by AI</p>
          </div>
        </div>

        {pages.some((p: any) => p.browserIssues?.length > 0 || p.aiInsights?.browserIssuesExplanation) ? (
          <div className="space-y-4">
            {pages.filter((p: any) => p.browserIssues?.length > 0 || p.aiInsights?.browserIssuesExplanation).map((p: any) => (
              <div key={p._id} className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4">
                <p className="text-white font-medium text-sm mb-3 truncate">{p.url}</p>
                {p.aiInsights?.browserIssuesExplanation ? (
                  <div className="bg-linear-to-r from-orange-500/10 to-transparent rounded-lg p-3 border border-orange-500/20">
                    <p className="text-sm text-slate-300 leading-relaxed flex gap-2">
                      <BrainCircuit className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                      {p.aiInsights.browserIssuesExplanation}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">AI analysis pending...</p>
                )}
                {p.browserIssues?.length > 0 && (
                  <p className="text-xs text-slate-500 mt-2">{p.browserIssues.length} raw issue(s) detected</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Network className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No browser-level issues detected — great!</p>
          </div>
        )}
      </div>

      {/* Security Headers Deep Dive */}
      <div className="glass-card bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Security Posture Analysis</h2>
            <p className="text-xs text-emerald-400 font-medium">HTTP security headers checklist with AI-powered recommendations</p>
          </div>
        </div>

        {pages.filter((p: any) => p.securityHeaders).length > 0 ? (
          <div className="space-y-4">
            {pages.filter((p: any) => p.securityHeaders).map((p: any) => (
              <div key={p._id} className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-white font-medium text-sm truncate flex-1">{p.url}</p>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.securityHeaders.score >= 80 ? 'bg-green-500/20 text-green-400' : p.securityHeaders.score >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                    {p.securityHeaders.score}%
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                  {[{ label: 'Content-Security-Policy', ok: p.securityHeaders.hasCSP },
                    { label: 'HSTS', ok: p.securityHeaders.hasHSTS },
                    { label: 'X-Frame-Options', ok: p.securityHeaders.hasXFrameOptions },
                    { label: 'X-Content-Type-Options', ok: p.securityHeaders.hasXContentTypeOptions },
                  ].map(h => (
                    <div key={h.label} className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg ${h.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {h.ok ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      {h.label}
                    </div>
                  ))}
                </div>

                {p.securityHeaders.missingHeaders?.length > 0 && (
                  <p className="text-xs text-red-400 mb-2">Missing: {p.securityHeaders.missingHeaders.join(', ')}</p>
                )}

                {p.screenshotPath && (
                  <div className="mb-3 border border-slate-700 rounded-lg overflow-hidden">
                    <div className="px-2 py-1.5 text-[11px] text-slate-400 bg-slate-900/70 border-b border-slate-700">
                      Page Section Snapshot
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.screenshotPath}
                      alt={`Page snapshot for ${p.url}`}
                      className="w-full max-h-64 object-contain bg-black/30"
                      loading="lazy"
                    />
                  </div>
                )}

                {p.aiInsights?.securityExplanation && (
                  <div className="bg-linear-to-r from-emerald-500/10 to-transparent rounded-lg p-3 border border-emerald-500/20">
                    <p className="text-sm text-slate-300 leading-relaxed flex gap-2">
                      <BrainCircuit className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      {p.aiInsights.securityExplanation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Security headers data not available for this scan.</p>
          </div>
        )}
      </div>

      {/* Accessibility Tree Intelligence */}
      <div className="glass-card bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Eye className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Screen Reader Compatibility Analysis</h2>
            <p className="text-xs text-violet-400 font-medium">AI evaluation of how assistive technologies interpret this page</p>
          </div>
        </div>

        {pages.some((p: any) => p.aiInsights?.axTreeExplanation) ? (
          <div className="space-y-4">
            {pages.filter((p: any) => p.aiInsights?.axTreeExplanation).map((p: any) => (
              <div key={p._id} className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4">
                <p className="text-white font-medium text-sm mb-3 truncate">{p.url}</p>
                <div className="bg-linear-to-r from-violet-500/10 to-transparent rounded-lg p-3 border border-violet-500/20">
                  <p className="text-sm text-slate-300 leading-relaxed flex gap-2">
                    <BrainCircuit className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                    {p.aiInsights.axTreeExplanation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-slate-500">
            <Eye className="w-10 h-10 mb-3 opacity-30" />
            <p>Accessibility tree analysis is being generated by AI. Please refresh shortly.</p>
          </div>
        )}
      </div>

      {/* detailed Violations section */}
      <div>
        <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-cyan-500" /> Detailed Violation Intelligence
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Top critical and serious issues are automatically analyzed and remediated by AI.
            </p>
          </div>
          <div className="text-sm text-slate-500 font-medium bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            {violations.length} total entries
          </div>
        </div>

        <div className="space-y-4">
          {violations.slice(0, 50).map((v: any) => (
            <ViolationCard key={v._id} violation={v} />
          ))}
          {violations.length > 50 && (
            <div className="text-center py-8 text-slate-500">
              Showing first 50 violations. Export report to view all {violations.length} issues.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
