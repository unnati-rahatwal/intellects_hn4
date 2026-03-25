'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createPortal } from 'react-dom';
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
  Printer,
  X
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
// @ts-ignore
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

function ViolationCard({
  violation,
  onPreview,
}: {
  violation: any;
  onPreview: (url: string, title: string) => void;
}) {
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
                  className="w-full max-h-56 object-contain bg-black/40 cursor-zoom-in"
                  loading="lazy"
                  onClick={() => onPreview(violation.screenshotPath, `Issue Snapshot: ${violation.ruleId}`)}
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
                      className="max-w-full max-h-full object-contain cursor-zoom-in"
                      onClick={() => onPreview(sim.base64Image, `${sim.type} Simulation`)}
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
  const [isExporting, setIsExporting] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [videoStatus, setVideoStatus] = useState<'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED' | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [selectedViolationId, setSelectedViolationId] = useState<string | null>(null);

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
        
        // Load existing video URL
        const videoRes = await fetch(`/api/scans/${id}/video`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (videoRes.ok) {
          const videoData = await videoRes.json();
          if (videoData.videoUrl) setVideoUrl(videoData.videoUrl);
          if (videoData.videoGenerationStatus) setVideoStatus(videoData.videoGenerationStatus);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [id, router]);

  useEffect(() => {
    if (!previewImage) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [previewImage]);

  const handleGenerateVideo = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      setVideoGenerating(true);
      setVideoStatus('GENERATING');

      const res = await fetch(`/api/scans/${id}/video`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const error = await res.json();
        alert(`Video generation failed: ${error.error || 'Unknown error'}`);
        setVideoStatus('FAILED');
        setVideoGenerating(false);
        return;
      }

      const result = await res.json();
      setVideoUrl(result.videoUrl);
      setVideoStatus('COMPLETED');
      setVideoGenerating(false);
    } catch (err) {
      console.error('Video generation error:', err);
      alert('Failed to generate video');
      setVideoStatus('FAILED');
      setVideoGenerating(false);
    }
  };

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

  const handlePrintPdf = async () => {
    setIsExporting(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('report-content');
      if (!element) return;
      
      const opt = {
        margin:       10,
        filename:     `AccessIQ-Report-${id}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true, 
          backgroundColor: '#0A0F1C', 
          windowWidth: 1200 // Force wide layout so charts aren't crunched
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      // Fallback to normal print if html2pdf fails
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const handlePreviewImage = (url: string, title: string) => {
    setPreviewImage({ url, title });
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

  const fullExecutiveSummary = scan.aiSummary?.executiveSummary || '';
  const summaryPreviewLimit = 160;
  const executiveSummaryPreview =
    fullExecutiveSummary.length > summaryPreviewLimit
      ? `${fullExecutiveSummary.slice(0, summaryPreviewLimit).trimEnd()}...`
      : fullExecutiveSummary;
  const visibleKeyFindings = isSummaryExpanded
    ? scan.aiSummary?.keyFindings || []
    : (scan.aiSummary?.keyFindings || []).slice(0, 1);
  const visibleRecommendations = isSummaryExpanded
    ? scan.aiSummary?.recommendations || []
    : (scan.aiSummary?.recommendations || []).slice(0, 1);
  const showSummaryReadMore =
    fullExecutiveSummary.length > summaryPreviewLimit ||
    (scan.aiSummary?.keyFindings?.length || 0) > 1 ||
    (scan.aiSummary?.recommendations?.length || 0) > 1;

  return (
    <div id="report-content" className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in relative">
      {/* Export loading overlay */}
      {isExporting && (
        <div className="fixed inset-0 z-50 bg-[#0A0F1C]/80 backdrop-blur-sm flex items-center justify-center print:hidden rounded-xl">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <h3 className="text-xl font-bold text-white tracking-tight">Generating PDF</h3>
            <p className="text-slate-400 text-sm">Capturing high-fidelity layout. Please wait...</p>
          </div>
        </div>
      )}
      
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
        <div className="flex flex-wrap gap-3" data-html2canvas-ignore>
          <button 
            onClick={handlePrintPdf} 
            disabled={isExporting}
            className="btn bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 print:hidden text-sm px-4 py-2 flex items-center rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className={`w-4 h-4 mr-2 ${isExporting ? 'animate-pulse' : ''}`} /> 
            {isExporting ? 'Saving...' : 'Save PDF'}
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

      {/* Executive Video Report */}
      <div className="glass-card bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 h-1" />
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <div className="w-6 h-6 text-blue-400">▶</div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Executive Video Summary</h2>
                <p className="text-xs text-blue-400 font-medium">AI-generated video report narrated by professional avatar</p>
              </div>
            </div>
            {videoUrl && videoStatus === 'COMPLETED' && !videoGenerating && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full">
                <CheckCircle className="w-3 h-3" /> Ready
              </span>
            )}
          </div>

          {videoUrl && videoStatus === 'COMPLETED' ? (
            <div className="space-y-4">
              <div className="aspect-video bg-black/50 rounded-lg overflow-hidden border border-slate-700">
                {/\.mp4(\?|$)/i.test(videoUrl) ? (
                  <video
                    key={videoUrl}
                    src={videoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full h-full bg-black"
                  >
                    Your browser does not support embedded video playback.
                  </video>
                ) : (
                  // eslint-disable-next-line jsx-a11y/iframe-has-title
                  <iframe
                    src={videoUrl}
                    className="w-full h-full"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleGenerateVideo}
                  disabled={videoGenerating}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" /> Regenerate Video
                </button>
                <a
                  href={videoUrl}
                  download
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
              </div>
            </div>
          ) : videoGenerating || videoStatus === 'GENERATING' ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-slate-700 rounded-full" />
                <div className="absolute inset-0 border-4 border-t-blue-500 border-r-purple-500 border-b-pink-500 border-l-blue-400 rounded-full animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-slate-200 font-medium">Generating Executive Video...</p>
                <p className="text-xs text-slate-500 mt-1">This may take 30-120 seconds</p>
                <div className="text-xs text-slate-400 mt-2 space-y-1">
                  <p>→ Script generation in progress...</p>
                  <p>→ Audio synthesis in progress...</p>
                  <p>→ Avatar video creation in progress...</p>
                </div>
              </div>
            </div>
          ) : videoStatus === 'FAILED' ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertTriangle className="w-10 h-10 text-red-400" />
              <div className="text-center">
                <p className="text-slate-200 font-medium">Video Generation Failed</p>
                <p className="text-xs text-slate-400 mt-2">Please ensure AI summary is complete and try again</p>
              </div>
              <button
                onClick={handleGenerateVideo}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm flex items-center gap-2 mt-2"
              >
                <Zap className="w-4 h-4" /> Retry
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                ▶
              </div>
              <div className="text-center">
                <p className="text-slate-200 font-medium">No Video Generated Yet</p>
                <p className="text-xs text-slate-400 mt-1">Create a professional executive summary video using AI</p>
              </div>
              <button
                onClick={handleGenerateVideo}
                disabled={videoGenerating || !scan.aiSummary?.executiveSummary}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
              >
                <Zap className="w-4 h-4" /> Generate Executive Video
              </button>
              {!scan.aiSummary?.executiveSummary && (
                <p className="text-xs text-amber-400 text-center mt-2">
                  ✓ Waiting for AI summary to complete before video generation
                </p>
              )}
            </div>
          )}
        </div>
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
                  {isSummaryExpanded ? fullExecutiveSummary : executiveSummaryPreview}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" /> Key Findings
                    </h3>
                    <ul className="space-y-3">
                      {visibleKeyFindings.map((finding: string, i: number) => (
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
                      {visibleRecommendations.map((rec: string, i: number) => (
                        <li key={i} className="flex gap-3 text-sm text-slate-300 bg-slate-800/50 p-3 rounded-lg">
                          <span className="text-green-500 font-bold">{i + 1}.</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {showSummaryReadMore && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setIsSummaryExpanded((prev) => !prev)}
                      className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      {isSummaryExpanded ? 'Show less' : 'Read more'}
                    </button>
                  </div>
                )}
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
                            className="w-full h-full object-cover cursor-zoom-in"
                            loading="lazy"
                            onClick={() => handlePreviewImage(shot.imageData, `${STAGE_LABELS[shot.stage] || shot.stage} - ${p.url}`)}
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
                      className="w-full max-h-64 object-contain bg-black/30 cursor-zoom-in"
                      loading="lazy"
                      onClick={() => handlePreviewImage(p.screenshotPath, `Page Snapshot - ${p.url}`)}
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
      <div className="overflow-hidden">
        <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-cyan-500" /> Organizational Violation Tree
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Issues algorithmically structured by severity hierarchy.
            </p>
          </div>
          <div className="text-sm border border-slate-700 bg-slate-800 px-3 py-1.5 rounded-lg text-slate-400 font-medium">
            {violations.length} total entries
          </div>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          .org-wrapper { overflow-x: auto; padding: 24px 20px 40px; display: block; border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; background: rgba(15,23,42,0.4); }
          .org-wrapper::-webkit-scrollbar { height: 8px; }
          .org-wrapper::-webkit-scrollbar-track { background: transparent; }
          .org-wrapper::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
          .org-wrapper::-webkit-scrollbar-thumb:hover { background: #475569; }
          .org-tree * { box-sizing: border-box; }
          
          /* Left to Right Tree CSS */
          .org-tree { display: inline-flex; flex-direction: row; align-items: center; justify-content: flex-start; position: relative; margin: 0; min-width: max-content; }
          .org-node { background: #0f172a; border: 2px solid rgba(255,255,255,0.1); padding: 12px 24px; border-radius: 12px; text-align: left; position: relative; z-index: 2; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
          .org-node-leaf { position: relative; z-index: 2; display: inline-block; cursor: pointer; transition: all 0.2s; }
          .org-node-leaf:hover { transform: translateX(4px); }
          
          .org-children { display: flex; flex-direction: column; justify-content: center; padding-left: 40px; position: relative; gap: 16px; }
          .org-children::before { content: ''; position: absolute; left: 0; top: 50%; width: 40px; border-top: 2px solid #334155; margin-top: -1px; }
          
          .org-child { position: relative; display: flex; flex-direction: row; align-items: center; }
          .org-child::before { content: ''; position: absolute; left: -40px; top: 50%; width: 40px; border-top: 2px solid #334155; margin-top: -1px; }
          .org-child::after { content: ''; position: absolute; left: -40px; top: 0; height: 100%; border-left: 2px solid #334155; margin-left: -1px; }
          
          .org-child:first-child::after { top: 50%; height: 50%; }
          .org-child:last-child::after { height: 50%; }
          .org-child:only-child::after { display: none; }
        `}} />

        <div className="org-wrapper">
          <div className="org-tree">
            <div className="org-node" style={{ borderColor: '#22d3ee', boxShadow: '0 0 25px rgba(34,211,238,0.15)', textAlign: 'center' }}>
               <div className="text-3xl mb-1">📄</div>
               <div className="text-white font-black tracking-wide text-sm whitespace-nowrap">ROOT VIEW</div>
               <div className="text-cyan-400 text-[10px] font-bold tracking-widest uppercase mt-1">{violations.length} Issues</div>
            </div>
            
            <div className="org-children">
              {(() => {
                const groups = [
                  { id: 'critical', title: 'CRITICAL', data: violations.filter(v => v.impact === 'critical'), color: { border: '#ef4444', bg: 'rgba(239,68,68,0.15)', text: '#ef4444' } },
                  { id: 'serious', title: 'SERIOUS', data: violations.filter(v => v.impact === 'serious'), color: { border: '#f97316', bg: 'rgba(249,115,22,0.15)', text: '#f97316' } },
                  { id: 'moderate', title: 'MODERATE', data: violations.filter(v => v.impact === 'moderate'), color: { border: '#eab308', bg: 'rgba(234,179,8,0.15)', text: '#eab308' } },
                  { id: 'minor', title: 'MINOR', data: violations.filter(v => v.impact === 'minor'), color: { border: '#3b82f6', bg: 'rgba(59,130,246,0.15)', text: '#3b82f6' } }
                ].filter(g => g.data.length > 0);

                return (
                  <>
                    {groups.map(g => (
                      <div className="org-child" key={g.id}>
                        <div className="org-node text-center whitespace-nowrap" style={{ borderColor: g.color.border, backgroundColor: g.color.bg }}>
                          <div style={{ color: g.color.text }} className="font-extrabold text-sm tracking-widest">{g.title}</div>
                          <div className="text-[10px] font-bold opacity-90 mt-1" style={{ color: g.color.text }}>{g.data.length} DETECTED</div>
                        </div>
                        <div className="org-children">
                          {g.data.slice(0, 15).map((v: any, i: number) => (
                            <div className="org-child" key={v._id}>
                              <div 
                                className="org-node-leaf text-left w-[260px] whitespace-normal rounded-xl bg-slate-900 border border-slate-700/50 p-3"
                                onClick={() => setSelectedViolationId(selectedViolationId === v._id ? null : v._id)}
                                style={{
                                   borderColor: selectedViolationId === v._id ? g.color.text : 'rgba(255,255,255,0.1)',
                                   boxShadow: selectedViolationId === v._id ? `0 0 15px ${g.color.bg}` : 'none'
                                 }}
                              >
                                 <div className="flex items-start gap-3 mb-2">
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ backgroundColor: g.color.bg, color: g.color.text }}>
                                      {i + 1}
                                    </div>
                                    <div className="text-xs font-bold text-white leading-tight break-words">{v.ruleId || v.type || 'Issue'}</div>
                                 </div>
                                 <div className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{v.description || v.suggestion}</div>
                              </div>
                            </div>
                          ))}
                          {g.data.length > 15 && (
                            <div className="org-child">
                              <div className="org-node-leaf text-left w-[260px] whitespace-normal rounded-xl bg-slate-800/50 border border-slate-700/50 p-3 italic text-slate-500 text-xs text-center border-dashed">
                                + {g.data.length - 15} more {g.title.toLowerCase()} issues
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Selected Issue Full Detail View */}
        {selectedViolationId && (
           <div className="mt-8 border border-slate-700/50 bg-slate-900/50 rounded-2xl p-6 animate-fade-in shadow-2xl relative">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
                 <h3 className="text-xl font-bold text-white flex items-center gap-2"><FileText className="w-5 h-5 text-cyan-400"/> Issue Deep Dive</h3>
                 <button onClick={() => setSelectedViolationId(null)} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors border border-slate-700"><X className="w-4 h-4"/> Close Display</button>
              </div>
              <ViolationCard violation={violations.find((v: any) => v._id === selectedViolationId)} onPreview={handlePreviewImage} />
           </div>
        )}
      </div>

      {previewImage && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative w-full max-w-6xl h-[92vh] border border-slate-700 rounded-xl bg-slate-950/95 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80">
              <p className="text-sm text-slate-200 truncate pr-4">{previewImage?.title}</p>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="w-full h-[calc(92vh-52px)] flex items-center justify-center bg-black/80 overflow-hidden">
              <img
                src={previewImage?.url}
                alt={previewImage?.title}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
