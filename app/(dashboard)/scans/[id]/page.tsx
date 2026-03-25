'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Activity, 
  AlertCircle, 
  Clock, 
  Shield, 
  Search, 
  ArrowRight,
  Loader2,
  Calendar,
  Globe,
  FileText
} from 'lucide-react';

interface ProgressLog {
  message: string;
  timestamp: string;
  status?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
}

interface ScanData {
  _id: string;
  projectId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  accessibilityScore: number;
  totalViolations: number;
  criticalIssues: number;
  seriousIssues: number;
  moderateIssues: number;
  minorIssues: number;
  pagesScanned: number;
  discoveredRoutes?: string[];
  progressLog: ProgressLog[];
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export default function ScanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [scan, setScan] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScan = async () => {
      if (!id || id === 'undefined') {
        setError('Invalid or missing scan ID');
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('accessiq_token');
        if (!token) {
          router.push('/login');
          return;
        }

        const res = await fetch(`/api/scans/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          if (res.status === 401) router.push('/login');
          throw new Error('Failed to fetch scan details');
        }

        const data = await res.json();
        setScan(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchScan();
    
    // Poll if processing
    const interval = setInterval(() => {
      if (scan?.status === 'PENDING' || scan?.status === 'PROCESSING') {
        fetchScan();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [id, router, scan?.status]);

  const [timeElapsed, setTimeElapsed] = useState(0);
  const isProcessing = scan?.status === 'PENDING' || scan?.status === 'PROCESSING';

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const startTime = scan?.startedAt || scan?.createdAt;
    if (isProcessing && startTime) {
      const start = new Date(startTime).getTime();
      timer = setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isProcessing, scan?.startedAt, scan?.createdAt]);

  if (loading && !scan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full animate-pulse" />
          <Loader2 className="w-12 h-12 text-cyan-500 animate-spin relative" />
        </div>
        <p className="text-slate-400 font-medium tracking-wide">Syncing with Secure Cloud...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied or Error</h2>
        <p className="text-slate-400 mb-6 max-w-md">{error}</p>
        <button 
          onClick={() => router.back()}
          className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (!scan) return null;

  const lastLog = scan.progressLog?.[scan.progressLog.length - 1];
  const discoveredCount = Math.max(scan.discoveredRoutes?.length || 0, 1);
  const progressPercent = Math.min(Math.round((scan.pagesScanned / discoveredCount) * 100), 99);
  
  // Estimation: 5s per page
  const estimatedTotal = discoveredCount * 5;
  const timeRemaining = Math.max(estimatedTotal - timeElapsed, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-cyan-400 uppercase tracking-wider">
            <Activity className={`w-4 h-4 ${scan.status === 'PROCESSING' ? 'animate-pulse' : ''}`} />
            <span>{scan.status === 'COMPLETED' ? 'Audit Finalized' : 'Live Analysis Matrix'}</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            {scan.status === 'COMPLETED' ? 'Compliance Report' : 'Scanning Infrastructure'}
          </h1>
          <div className="flex items-center gap-4 text-slate-400">
            <p className="flex items-center gap-2">
              ID: <span className="font-mono text-xs bg-white/5 px-2 py-0.5 rounded text-slate-300">{scan._id}</span>
            </p>
            {isProcessing && (
              <div className="flex items-center gap-2 px-3 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
                {scan.status === 'PROCESSING' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />}
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                  {scan.status === 'PROCESSING' ? 'Active Engine' : 'Engine Queued'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {scan.status === 'COMPLETED' ? (
            <>
              <button
                onClick={() => router.push(`/scans/${scan._id}/report`)}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <FileText className="w-4 h-4" />
                Executive Report
              </button>
              <button
                onClick={() => router.push(`/scans/${scan._id}/explore`)}
                className="flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Visual Explorer
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
             <div className="flex items-center gap-4 px-5 py-3 bg-white/5 border border-white/10 rounded-2xl">
               <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Time Elapsed</p>
                  <p className="text-lg font-mono font-bold text-white">{Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}</p>
               </div>
               <div className="w-px h-8 bg-white/10" />
               <div className="flex items-center gap-3">
                 <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                 <span className="text-sm font-medium text-slate-300 italic">Processing... ({progressPercent}%)</span>
               </div>
             </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats & Summary */}
        <div className="lg:col-span-2 space-y-8">
          {scan.status === 'COMPLETED' ? (
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="bg-white/3 border border-white/5 p-6 rounded-2xl hover:bg-white/5 transition-colors group">
                 <p className="text-slate-400 text-sm mb-2 group-hover:text-cyan-400 transition-colors">Compliance</p>
                 <div className="flex items-baseline gap-1">
                   <h3 className="text-3xl font-bold text-white">{scan.accessibilityScore}</h3>
                   <span className="text-xs text-slate-500 italic">/100</span>
                 </div>
               </div>
               <div className="bg-white/3 border border-white/5 p-6 rounded-2xl">
                 <p className="text-slate-400 text-sm mb-2">Violations</p>
                 <h3 className="text-3xl font-bold text-white">{scan.totalViolations}</h3>
               </div>
               <div className="bg-white/3 border border-white/5 p-6 rounded-2xl">
                 <p className="text-slate-400 text-sm mb-2">Critical</p>
                 <h3 className="text-3xl font-bold text-red-400">{scan.criticalIssues || 0}</h3>
               </div>
               <div className="bg-white/3 border border-white/5 p-6 rounded-2xl">
                 <p className="text-slate-400 text-sm mb-2">Depth</p>
                 <h3 className="text-3xl font-bold text-white">{scan.pagesScanned} <span className="text-xs text-slate-500 font-normal">pages</span></h3>
               </div>
             </div>
          ) : (
            <div className="relative group">
               <div className="absolute -inset-0.5 bg-linear-to-r from-cyan-500 to-indigo-500 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
               <div className="relative h-[320px] w-full bg-[#0D1220] border border-white/10 rounded-3xl p-8 flex flex-col justify-between overflow-hidden">
                <div className="flex justify-between items-start">
                  <div className="space-y-4 max-w-md">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                      <Activity className="w-6 h-6 text-cyan-400" />
                      Auditing System Targets
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {lastLog?.message || 'Establishing secure connection to target infrastructure...'}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-6 pt-4">
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Discovery Level</p>
                        <p className="text-xl font-bold text-white">{scan.pagesScanned} / {discoveredCount} <span className="text-xs text-slate-500 italic">URLs</span></p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Est. Completion</p>
                        <p className="text-xl font-bold text-cyan-400">{Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="hidden md:block">
                    {scan.status === 'PENDING' && scan.progressLog.length === 0 ? (
                      <div className="flex flex-col items-center gap-3 p-6 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl animate-in zoom-in duration-500">
                        <AlertCircle className="w-10 h-10 text-yellow-500 animate-bounce" />
                        <div className="text-center">
                          <p className="text-xs font-bold text-yellow-500 uppercase tracking-tighter">Engine Pending</p>
                          <p className="text-[9px] text-slate-500 max-w-[120px]">Run `npm run worker` to start the analysis</p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-32 h-32">
                         <div className="absolute inset-0 flex items-center justify-center">
                           <span className="text-2xl font-bold text-white font-mono">{progressPercent}%</span>
                         </div>
                         <svg className="w-full h-full -rotate-90">
                           <circle cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-white/5" />
                           <circle cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray={364.4} strokeDashoffset={364.4 - (364.4 * progressPercent) / 100} className="text-cyan-500 transition-all duration-1000" />
                         </svg>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <span>Scan Momentum</span>
                    <span className="text-cyan-400">{progressPercent}% Optimized</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-linear-to-r from-cyan-500 to-indigo-500 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(6,182,212,0.5)]" 
                      style={{ width: `${progressPercent}%` }} 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Stats (If completed) */}
          {scan.status === 'COMPLETED' && (
            <div className="bg-white/2 border border-white/5 rounded-3xl p-8 space-y-8">
               <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-cyan-400" />
                    Security & Compliance Overview
                  </h2>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Severity Distribution</h3>
                    <div className="space-y-3">
                      <SeverityRow label="Critical" count={scan.criticalIssues} color="bg-red-500" total={scan.totalViolations} />
                      <SeverityRow label="Serious" count={scan.seriousIssues} color="bg-orange-500" total={scan.totalViolations} />
                      <SeverityRow label="Moderate" count={scan.moderateIssues} color="bg-yellow-500" total={scan.totalViolations} />
                      <SeverityRow label="Minor" count={scan.minorIssues} color="bg-blue-500" total={scan.totalViolations} />
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Audit Metadata</h3>
                    <div className="grid grid-cols-1 gap-3">
                      <MetaItem icon={Calendar} label="Scan Date" value={new Date(scan.createdAt).toLocaleDateString()} />
                      <MetaItem icon={Clock} label="Duration" value={scan.completedAt ? `${Math.round((new Date(scan.completedAt).getTime() - new Date(scan.startedAt || scan.createdAt).getTime()) / 1000)}s` : 'Calculating...'} />
                      <MetaItem icon={Globe} label="Pages Found" value={`${scan.pagesScanned} total URLs`} />
                    </div>
                 </div>
               </div>
            </div>
          )}
        </div>

        {/* Right Column: Progress Feed (Live) */}
        <div className="lg:col-span-1">
          <div className="bg-[#0D1220] border border-white/5 rounded-3xl h-[600px] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/2">
                <div className="flex items-center gap-2">
                   <Activity className="w-4 h-4 text-cyan-400" />
                   <h3 className="text-sm font-semibold text-white">Console Output</h3>
                </div>
                {isProcessing && <span className="flex h-2 w-2 rounded-full bg-cyan-500 animate-ping" />}
              </div>

               <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-3 custom-scrollbar">
                <div className="flex items-center justify-between px-3 py-1 bg-white/5 rounded-t-lg border-x border-t border-white/5 text-[9px] text-slate-500 italic">
                  <span>Engine Heartbeat</span>
                  <span>{lastLog ? `Last update: ${Math.floor((Date.now() - new Date(lastLog.timestamp).getTime()) / 1000)}s ago` : 'Disconnected'}</span>
                </div>
                {scan.progressLog?.length > 0 ? (
                  [...scan.progressLog].reverse().map((log, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border transition-all ${
                      log.status === 'SUCCESS' ? 'bg-green-500/5 border-green-500/10 text-green-400' :
                      log.status === 'ERROR' ? 'bg-red-500/5 border-red-500/10 text-red-400' :
                      log.status === 'WARNING' ? 'bg-yellow-500/5 border-yellow-500/10 text-yellow-400' :
                      'bg-white/2 border-white/5 text-slate-400'
                    }`}>
                      <div className="flex justify-between items-start gap-3 mb-1">
                        <span className="flex-1 opacity-90">{log.message}</span>
                        <span className="text-[10px] opacity-50 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-30 text-slate-500">
                    <Search className="w-8 h-8 mb-2" />
                    <p>Waiting for engine...</p>
                  </div>
                )}
              </div>

              <div className="p-5 bg-white/1 border-t border-white/5">
                <div className="flex items-center justify-between text-[11px] mb-2">
                   <span className="text-slate-500 uppercase tracking-tighter font-bold">Engine Estimation</span>
                   <span className="text-cyan-400 font-mono">~3-5s / page</span>
                </div>
                <p className="text-[10px] text-slate-600 leading-normal">
                  Our system simulates realistic user interactions and performs deep DOM analysis including shadow roots and third-party scripts.
                </p>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SeverityRow({ label, count, color, total }: { label: string, count: number, color: string, total: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="group">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-slate-400 group-hover:text-white transition-colors">{label}</span>
        <span className="text-white font-mono font-bold">{count}</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-1000 ease-out`} 
          style={{ width: `${Math.max(percentage, 2)}%` }} 
        />
      </div>
    </div>
  );
}

function MetaItem({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/2 rounded-xl border border-white/5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
          <Icon className="w-4 h-4 text-slate-400" />
        </div>
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}
