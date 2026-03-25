"use client";

import { useEffect, useState } from "react";
import { Loader2, Accessibility, Zap, AlertTriangle, CheckCircle2, Search } from "lucide-react";

export default function ExtensionPopup() {
  const [loading, setLoading] = useState(false);
  const [scanningDom, setScanningDom] = useState(false);
  const [issues, setIssues] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    // Listen for DOM result from parent iframe wrapper
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.action === "DOM_RESULT") {
        setScanningDom(false);
        setLoading(true);
        console.log("Received DOM from extension wrapper", event.data.dom);
        
        try {
          // Send to Next.js API for Featherless Analysis
          const res = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ domElements: event.data.dom }),
          });
          
          const data = await res.json();
          if (res.ok) {
            setIssues(data.issues || []);
            // Send issues back to parent so content.js can highlight them
            if (data.issues && data.issues.length > 0) {
              window.parent.postMessage({ action: "HIGHLIGHT_ISSUES", issues: data.issues }, "*");
            }
          } else {
            setError(data.error || "Failed to analyze page");
          }
        } catch (err) {
          setError("Server error during analysis");
        } finally {
          setLoading(false);
        }
      } else if (event.data.action === "DOM_ERROR") {
        setScanningDom(false);
        setError("Failed to extract DOM from active page. Ensure you are not on a chrome:// URL.");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleAudit = () => {
    setError("");
    setIssues([]);
    setScanningDom(true);
    // Request DOM extraction from wrapper
    window.parent.postMessage({ action: "EXTRACT_DOM" }, "*");
  };

  const getSeverityIcon = (level: string) => {
    if (level === "critical") return <Zap className="text-rose-500" size={16} />;
    if (level === "warning") return <AlertTriangle className="text-amber-500" size={16} />;
    return <CheckCircle2 className="text-emerald-500" size={16} />;
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-slate-300 p-6 flex flex-col font-sans">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-6">
        <Accessibility className="text-cyan-400" size={24} />
        <h1 className="text-xl font-bold text-white tracking-tight">AccessIQ <span className="text-slate-500 font-normal">Auditor</span></h1>
      </div>

      {!loading && !scanningDom && issues.length === 0 && (
        <div className="flex-grow flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-cyan-900/30 flex items-center justify-center mb-2">
            <Search className="text-cyan-400" size={32} />
          </div>
          <p className="text-slate-400 text-sm">
            Ready to scan the active tab for WCAG 2.2 accessibility violations.
          </p>
          <button
            onClick={handleAudit}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg shadow-[0_0_15px_rgba(8,145,178,0.3)] transition-all flex items-center justify-center gap-2 mt-4"
          >
            Run Page Audit
          </button>
        </div>
      )}

      {(loading || scanningDom) && (
        <div className="flex-grow flex flex-col items-center justify-center space-y-4">
          <Loader2 className="animate-spin text-cyan-400" size={40} />
          <p className="text-sm font-medium text-slate-300">
            {scanningDom ? "Extracting Semantic DOM..." : "AI Analyzing Elements via Featherless API..."}
          </p>
          {!scanningDom && (
            <div className="w-full max-w-[200px] h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 animate-[pulse_1s_ease-in-out_infinite]" style={{ width: '60%' }}></div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-lg text-rose-400 text-sm mb-4">
          {error}
        </div>
      )}

      {issues.length > 0 && (
        <div className="flex-grow flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white text-lg">Found {issues.length} Issues</h2>
            <button onClick={handleAudit} className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded hover:bg-slate-700 transition">
              Re-scan
            </button>
          </div>
          
          <div className="space-y-3 overflow-y-auto pr-2 max-h-[350px]">
            {issues.map((issue, idx) => (
              <div key={idx} className="bg-[#111827] border border-white/5 p-4 rounded-xl shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getSeverityIcon(issue.severity)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">{issue.type}</h3>
                    <p className="text-xs text-secondary text-slate-400 mt-1 mb-2 leading-relaxed">
                      {issue.suggestion}
                    </p>
                    <div className="inline-block bg-[#0A0F1C] border border-white/10 px-2 py-1 rounded text-[10px] font-mono text-emerald-400 truncate max-w-[300px]">
                      {issue.selector}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs text-slate-500 text-center">
              Check the main browser window. Issues are highlighted directly on the page elements.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
