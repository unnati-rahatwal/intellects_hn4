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
  Copy,
  Check,
  X
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
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
  const [copied, setCopied] = useState(false);
  
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
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
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Code Diff</h4>
                  <button
                    onClick={() => handleCopy(ai.remediatedCode)}
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-md border border-slate-700 transition-all"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-green-400" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy Fixed Code
                      </>
                    )}
                  </button>
                </div>
                <div className="rounded-lg overflow-x-auto border border-slate-800 code-scroll">
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
        const token = localStorage.getItem('accessiq_token');
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
      const token = localStorage.getItem('accessiq_token');
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
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
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
              <span className="text-slate-600">ΓÇó</span>
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
                <div className="w-6 h-6 text-blue-400">Γû╢</div>
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
                  <p>ΓåÆ Script generation in progress...</p>
                  <p>ΓåÆ Audio synthesis in progress...</p>
                  <p>ΓåÆ Avatar video creation in progress...</p>
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
                Γû╢
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
                  Γ£ô Waiting for AI summary to complete before video generation
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
                          <span className="text-amber-500 font-bold">ΓÇó</span>
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

        {/* AI Performance Explanation (unit-consistent, computed from shown metrics) */}
        {((scan.performanceSummary?.avgLoadTime || 0) > 0 || (scan.performanceSummary?.avgFcp || 0) > 0) && pages.some((p: { aiInsights?: { performanceExplanation?: string } }) => p.aiInsights?.performanceExplanation) && (
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
            <p>No browser-level issues detected ΓÇö great!</p>
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

      {/* Page-Level Violation Analytics - Stacked Bar Chart */}
      <div className="overflow-hidden border border-slate-700/50 rounded-2xl p-6 bg-slate-900/30">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes slideInRight { 0% { opacity:0; transform:translateX(30px); } 100% { opacity:1; transform:translateX(0); } }
          .animate-slide-in { animation: slideInRight 0.3s ease-out both; }
          @keyframes fadeIn { 0% { opacity:0; } 100% { opacity:1; } }
          .animate-fade-in { animation: fadeIn 0.25s ease-out both; }
          .drilldown-scroll::-webkit-scrollbar { width: 5px; }
          .drilldown-scroll::-webkit-scrollbar-track { background: transparent; }
          .drilldown-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
          .drilldown-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
          .code-scroll::-webkit-scrollbar { height: 6px; }
          .code-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
          .code-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
          .code-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        `}} />

        {(() => {
          const SEVERITY_COLORS: Record<string, string> = { critical: '#ef4444', serious: '#f97316', moderate: '#eab308', minor: '#3b82f6' };
          const SEVERITY_BG: Record<string, string> = { critical: 'rgba(239,68,68,0.15)', serious: 'rgba(249,115,22,0.15)', moderate: 'rgba(234,179,8,0.15)', minor: 'rgba(59,130,246,0.15)' };
          const SEVERITY_LABELS: Record<string, string> = { critical: 'Critical', serious: 'Serious', moderate: 'Moderate', minor: 'Minor' };

          // Group violations by pageUrl
          const grouped: Record<string, typeof violations> = {};
          violations.forEach((v: any) => {
            const key = v.pageUrl || 'Unknown';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(v);
          });

          const barData = Object.entries(grouped).map(([url, items]) => {
            let label = 'root';
            try {
              const u = new URL(url);
              const parts = (u.pathname + u.hash).split(/[/#]/).filter(Boolean);
              label = parts[parts.length - 1] || u.hostname;
            } catch { label = url.split('/').filter(Boolean).pop() || url; }
            return {
              name: label.length > 18 ? label.substring(0, 16) + '..' : label,
              fullUrl: url,
              critical: items.filter(v => v.impact === 'critical').length,
              serious: items.filter(v => v.impact === 'serious').length,
              moderate: items.filter(v => v.impact === 'moderate').length,
              minor: items.filter(v => v.impact === 'minor').length,
            };
          });

          // Check if we're in drill-down mode
          const isDrillDown = selectedViolationId?.startsWith('drill:');
          let drillUrl = '';
          let drillImpact = '';
          let detailId: string | null = null;

          if (isDrillDown && selectedViolationId) {
            const raw = selectedViolationId;
            // Extract detail ID if present
            if (raw.includes('|detail:')) {
              detailId = raw.split('|detail:')[1];
            }
            const base = raw.split('|detail:')[0]; // drill:url:impact
            const colonParts = base.split(':');
            drillImpact = colonParts[colonParts.length - 1];
            drillUrl = colonParts.slice(1, -1).join(':');
          }

          const drillViolations = isDrillDown
            ? violations.filter((v: any) => v.pageUrl === drillUrl && v.impact === drillImpact)
            : [];

          const setDetailId = (id: string | null) => {
            if (id) setSelectedViolationId(`drill:${drillUrl}:${drillImpact}|detail:${id}`);
            else setSelectedViolationId(`drill:${drillUrl}:${drillImpact}`);
          };

          // ============ CHART VIEW ============
          if (!isDrillDown) {
            return (
              <>
                <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <Layers className="w-6 h-6 text-cyan-500" /> Page-Level Violation Analytics
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                      Interactive stacked chart ΓÇö click any colored segment to see issues.
                    </p>
                  </div>
                  <div className="text-sm border border-slate-700 bg-slate-800 px-3 py-1.5 rounded-lg text-slate-400 font-medium">
                    {violations.length} total issues ┬╖ {barData.length} pages
                  </div>
                </div>
                {barData.length > 0 ? (
                  <div className="w-full" style={{ height: Math.max(450, barData.length * 60 + 160) + 'px', minHeight: '450px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                          dataKey="name"
                          stroke="#94a3b8"
                          fontSize={12}
                          fontWeight={600}
                          tickLine={false}
                          axisLine={false}
                          interval={0}
                          angle={-30}
                          textAnchor="end"
                          height={70}
                        />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px' }}
                          itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                          labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}
                          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle" />
                        {(['critical', 'serious', 'moderate', 'minor'] as const).map((sev, i) => (
                          <Bar
                            key={sev}
                            dataKey={sev}
                            name={SEVERITY_LABELS[sev]}
                            stackId="a"
                            fill={SEVERITY_COLORS[sev]}
                            radius={i === 3 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                            onClick={(data: any) => {
                              if (data && data[sev] > 0) {
                                setSelectedViolationId(`drill:${data.fullUrl}:${sev}`);
                              }
                            }}
                            className="cursor-pointer transition-opacity hover:opacity-80"
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center border border-white/5 bg-white/5 rounded-xl">
                    <p className="text-slate-500 text-sm">No violations detected for this scan.</p>
                  </div>
                )}
              </>
            );
          }

          // ============ DRILL-DOWN VIEW (inline, replaces chart) ============
          let pageLabel = drillUrl;
          try {
            const u = new URL(drillUrl);
            pageLabel = u.pathname + (u.hash || '');
            if (pageLabel === '/') pageLabel = u.hostname;
          } catch { /* keep raw */ }

          return (
            <div className="animate-slide-in">
              {/* Header with back button + page name */}
              <div className="flex items-center gap-4 mb-5 pb-4 border-b border-slate-800">
                <button
                  onClick={() => setSelectedViolationId(null)}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 pl-3 pr-4 py-2 rounded-xl transition-all border border-slate-700 hover:border-slate-500 shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Chart
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Globe className="w-5 h-5 text-cyan-400 shrink-0" />
                    <h2 className="text-xl font-bold text-white truncate">{pageLabel}</h2>
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shrink-0"
                      style={{ backgroundColor: SEVERITY_BG[drillImpact], color: SEVERITY_COLORS[drillImpact] }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[drillImpact] }} />
                      {drillImpact} ┬╖ {drillViolations.length} issues
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-mono truncate">{drillUrl}</p>
                </div>
              </div>

              {/* Split panel: list + detail */}
              <div className="flex gap-0 border border-white/5 rounded-2xl overflow-hidden bg-slate-900/50" style={{ minHeight: '560px' }}>
                {/* Left: Issue List */}
                <div className={`${detailId ? 'w-[38%] border-r border-white/5' : 'w-full'} overflow-y-auto drilldown-scroll transition-all`} style={{ maxHeight: '600px' }}>
                  <div className="p-3 space-y-1.5">
                    {drillViolations.map((v: any, idx: number) => (
                      <div
                        key={v._id}
                        onClick={() => setDetailId(detailId === v._id ? null : v._id)}
                        className={`group p-3.5 rounded-xl cursor-pointer transition-all border ${
                          detailId === v._id
                            ? 'border-l-2 bg-white/[0.06]'
                            : 'border-transparent hover:bg-white/[0.03]'
                        }`}
                        style={detailId === v._id ? { borderLeftColor: SEVERITY_COLORS[drillImpact] } : {}}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className="text-[10px] font-bold rounded-md w-6 h-6 flex items-center justify-center shrink-0"
                            style={{ backgroundColor: SEVERITY_BG[drillImpact], color: SEVERITY_COLORS[drillImpact] }}
                          >
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">{v.ruleId}</p>
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{v.description}</p>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-600 shrink-0 mt-0.5 transition-transform ${detailId === v._id ? 'rotate-180 text-slate-300' : ''}`} />
                        </div>
                      </div>
                    ))}
                    {drillViolations.length === 0 && (
                      <div className="text-center py-12 text-slate-500 text-sm">No issues found for this selection.</div>
                    )}
                  </div>
                </div>

                {/* Right: Detail Panel */}
                {detailId && (() => {
                  const detail = violations.find((v: any) => v._id === detailId);
                  if (!detail) return null;
                  return (
                    <div className="w-[62%] overflow-y-auto drilldown-scroll animate-slide-in" style={{ maxHeight: '600px' }}>
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                          <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <FileText className="w-4 h-4 text-cyan-400" /> Issue Details
                          </h3>
                          <button
                            onClick={() => setDetailId(null)}
                            className="text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors border border-slate-700 flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" /> Close
                          </button>
                        </div>
                        <ViolationCard violation={detail} onPreview={handlePreviewImage} />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })()}
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
