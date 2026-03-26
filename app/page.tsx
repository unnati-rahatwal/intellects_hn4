"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Search,
  Eye,
  EyeOff,
  Wrench,
  BarChart3,
  LayoutDashboard,
  MonitorOff,
  Accessibility,
  Zap,
  Layout,
  X,
} from "lucide-react";

export default function Home() {
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0A1114] text-zinc-300 font-sans selection:bg-cyan-900 selection:text-cyan-50">
      {/* Floating Badge */}
      <div className="fixed bottom-6 right-6 z-50 animate-bounce">
        <button className="flex items-center gap-2 bg-indigo-600/20 border border-indigo-500/50 backdrop-blur-md px-4 py-3 rounded-full text-cyan-300 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:bg-indigo-600/40 hover:scale-105 transition-all cursor-pointer">
          <Zap size={16} className="text-yellow-400" />
          <span className="text-sm font-medium pr-1">
            Simulate Screen Reader Experience
          </span>
        </button>
      </div>

      {/* Navbar removed - using global Navbar */}

      {/* 1. Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        {/* Background Video (Hero Only) */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none opacity-100"
        >
          <source src="/homepg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[#0A1114]/40 z-0 pointer-events-none" />
        
        {/* Neon Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-600/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse relative">
              <span className="absolute inset-0 rounded-full bg-cyan-400 animate-ping opacity-75"></span>
            </span>
            WCAG 2.2 aligned · Multi-page analysis · AI-assisted fixes
          </div>

          <h1 className="text-9xl md:text-7xl lg:text-8xl font-black text-white tracking-tight mb-8 leading-[1.1] drop-shadow-2xl">
            See Your Website <br className="hidden md:block" /> the Way{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 via-blue-400 to-indigo-400 drop-shadow-sm">
              Users Actually Experience It
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-zinc-400 max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
            Scan entire web applications, visualize accessibility barriers in real
            context, and fix them instantly with AI-powered guidance.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="group relative px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-lg transition-all shadow-[0_0_20px_rgba(8,145,178,0.4)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)] flex items-center gap-2"
            >
              Start Accessibility Scan
              <ArrowRight
                size={20}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
            <button
              type="button"
              onClick={() => setIsDemoOpen(true)}
              className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-bold text-lg transition-all flex items-center gap-2 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            >
              <Eye size={20} className="text-zinc-400 group-hover:text-white" />
              View Demo Analysis
            </button>
          </div>
        </div>
      </section>

      {/* 2. Problem -> Impact Section */}
      <section className="py-32 bg-[#10191D] border-y border-white/5 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
              Accessibility Isn&apos;t Broken — It&apos;s{" "}
              <span className="text-rose-500 line-through decoration-rose-500/50 decoration-4 underline-offset-4">
                Invisible
              </span>
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto font-medium">
              Developers don&apos;t see the problem. Reports are confusing. Users
              silently struggle in the background.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-0 overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
            {/* Developer View */}
            <div className="p-10 md:p-14 bg-zinc-900 border-r border-white/5 h-full flex flex-col justify-center relative group">
              <div className="absolute top-4 left-4 text-xs font-mono font-bold tracking-wider text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded uppercase flex items-center gap-2">
                <Layout size={14} /> Normal View
              </div>
              <div className="mt-8 space-y-6">
                <div className="h-12 bg-[#1E293B] rounded-lg w-3/4 flex items-center px-4 shadow-sm border border-white/5">
                  <div className="w-1/2 h-4 bg-zinc-700/50 rounded text-transparent"></div>
                </div>
                <div className="mt-8">
                  <div className="h-48 bg-[#1E293B] rounded-xl w-full flex flex-col items-center justify-center p-6 border border-white/5 shadow-sm">
                     <span className="text-zinc-500 mb-6 font-medium">Pristine Component UI</span>
                     <div className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-md font-bold shadow-sm transition-colors cursor-pointer w-full text-center">
                       Proceed to Checkout
                     </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Screen Reader Experience */}
            <div className="p-10 md:p-14 bg-zinc-950 h-full flex flex-col justify-center relative group overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none"></div>
              
              <div className="absolute top-4 left-4 text-xs font-mono font-bold tracking-wider text-rose-500 bg-rose-500/10 px-3 py-1.5 rounded uppercase shadow-[0_0_10px_rgba(244,63,94,0.2)] flex items-center gap-2">
                <MonitorOff size={14} /> Keyboard/Screen Reader Only
              </div>
              
              <div className="mt-8 space-y-6 opacity-70 contrast-125 grayscale-20 transition-all group-hover:opacity-100">
                <div className="h-12 bg-zinc-800 rounded-lg w-3/4 ring-[3px] ring-amber-500/70 ring-offset-2 ring-offset-[#0A0F1C] shadow-[0_0_15px_rgba(245,158,11,0.3)]"></div>
                
                <div className="relative mt-8">
                  <div className="h-48 bg-zinc-800 rounded-xl w-full flex items-center justify-center border border-rose-500/30 ring-2 ring-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                      <div className="px-8 py-3 bg-indigo-900 text-cyan-200/50 font-bold rounded-md opacity-50 blur-[2px]">
                        Proceed to Checkout
                      </div>
                  </div>

                  <div className="absolute -bottom-6 -right-4 bg-rose-950/90 border border-rose-500 text-rose-200 text-sm p-4 rounded-lg shadow-2xl max-w-[260px] z-10 transition-transform translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 backdrop-blur">
                    <div className="flex items-center gap-2 mb-1">
                      <Accessibility size={16} className="text-rose-400"/>
                      <span className="font-bold text-rose-400">Screen Reader Info:</span>
                    </div>
                    &quot;Unlabeled button. To activate press spacebar.&quot;
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. How It Works */}
      <section className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
              How It Works
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto font-medium">
              From URL to flawless accessibility in 4 simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-[48px] left-[12%] right-[12%] h-[2px] bg-linear-to-r from-transparent via-cyan-500/40 to-transparent"></div>

            {[
              {
                step: "01",
                title: "Enter Website URL",
                desc: "Scan single or multiple pages automatically.",
                icon: <Search size={28} className="text-cyan-400" />,
              },
              {
                step: "02",
                title: "Detect Real Issues",
                desc: "Context-aware detection, not just basic rules.",
                icon: <EyeOff size={28} className="text-blue-400" />,
              },
              {
                step: "03",
                title: "Explore Visually",
                desc: "See exactly where and how users are affected.",
                icon: <Layout size={28} className="text-amber-400" />,
              },
              {
                step: "04",
                title: "Fix with AI",
                desc: "Get ready-to-use, optimized code fixes instantly.",
                icon: <Wrench size={28} className="text-emerald-400" />,
              },
            ].map((item, i) => (
              <div
                key={i}
                className="relative bg-white/2 border border-white/5 p-8 rounded-2xl hover:bg-white/5 transition-all z-10 backdrop-blur-sm group hover:-translate-y-1 hover:border-white/10 shadow-lg hover:shadow-cyan-900/10"
              >
                <div className="w-16 h-16 rounded-2xl bg-zinc-900/80 border border-white/10 flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <div className="text-5xl font-black text-white/5 absolute top-6 right-6 select-none leading-none">
                  {item.step}
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
                  {item.title}
                </h3>
                <p className="text-zinc-400 text-base leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Core Features Section */}
      <section className="py-32 bg-[#10191D] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6">
              Built for Deep Remediation
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto font-medium">
              Beyond simple linters. Analyze context, understand failures, and
              write compliant code effortlessly.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Multi-Page Flow Analysis",
                desc: "Analyze complete user journeys, not isolated pages. Catch issues dynamically.",
                icon: <LayoutDashboard className="text-cyan-400" size={24} />,
              },
              {
                title: "Visual Issue Explorer",
                desc: "Interactively highlight accessibility problems directly inside the UI.",
                icon: <Eye className="text-blue-400" size={24} />,
              },
              {
                title: "AI-Powered Remediation",
                desc: "Get contextual fixes with semantic HTML, ARIA rules, and CSS improvements.",
                icon: <Wrench className="text-indigo-400" size={24} />,
              },
              {
                title: "Accessibility Score & Tracking",
                desc: "Monitor improvements across scans and versions to prove compliance.",
                icon: <BarChart3 className="text-emerald-400" size={24} />,
              },
              {
                title: "Project-Based Dashboard",
                desc: "Manage multiple websites and compare accessibility health at a glance.",
                icon: <Layout className="text-amber-400" size={24} />,
              },
              {
                title: "Screen Reader Simulation",
                desc: "Hear exactly how assistive technologies parse your application DOM.",
                icon: <MonitorOff className="text-blue-400" size={24} />,
              },
            ].map((f, i) => (
              <div
                key={i}
                className="p-8 rounded-2xl bg-[#142025] border border-white/5 hover:border-cyan-500/30 group transition-all"
              >
                <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center mb-6 group-hover:bg-zinc-800 transition-colors shadow-inner">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-100 mb-3 tracking-tight">
                  {f.title}
                </h3>
                <p className="text-zinc-400 leading-relaxed font-medium">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Interactive Demo Preview */}
      <section id="demo" className="py-32 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
              See It In Action
            </h2>
            <p className="text-xl text-zinc-400 font-medium">
              Hover over the highlights to understand the accessibility experience.
            </p>
          </div>

          <div className="bg-[#141C20] rounded-2xl border border-white/10 shadow-2xl shadow-indigo-500/10 overflow-hidden">
            <div className="h-14 bg-[#1A252A] flex items-center px-6 gap-3 border-b border-white/5">
              <div className="flex gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-rose-500/90 shadow-[0_0_10px_rgba(244,63,94,0.4)]"></div>
                <div className="w-3.5 h-3.5 rounded-full bg-amber-500/90 shadow-[0_0_10px_rgba(245,158,11,0.4)]"></div>
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/90 shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
              </div>
              <div className="ml-6 bg-[#0B1012] border border-white/5 text-sm font-medium text-zinc-400 px-4 py-1.5 rounded-lg grow max-w-md flex items-center gap-3 shadow-inner">
                <Search size={14} className="text-zinc-500" /> example.com/checkout
              </div>
            </div>

            <div className="p-10 relative min-h-[500px]">
              <div className="absolute top-32 right-32 w-[280px] h-[55px] border-2 border-dashed border-rose-500 bg-rose-500/20 rounded-lg animate-pulse group cursor-crosshair z-20">
                <div className="absolute -bottom-36 right-0 bg-[#1A252A] border border-rose-500/50 p-5 rounded-xl shadow-2xl shadow-rose-900/20 w-80 opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-rose-400" />
                      <span className="text-sm font-black tracking-tight text-white uppercase">Missing ARIA Label</span>
                    </div>
                    <span className="text-[10px] font-bold bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded uppercase">Critical</span>
                  </div>
                  <p className="text-sm text-zinc-400 mb-4 leading-relaxed font-medium">
                    Screen readers announce this checkout button as &quot;Unlabeled button&quot;. Users cannot identify the action.
                  </p>
                  <div className="bg-[#0B1012] p-3 rounded-md text-xs font-mono text-zinc-300 border border-white/5 mb-3 leading-loose shadow-inner">
                    <span className="text-rose-400 line-through mr-3 opacity-60">&lt;button&gt;</span><br/>
                    <span className="text-emerald-400">+ &lt;button aria-label=&apos;Proceed to Checkout&apos;&gt;</span>
                  </div>
                  <div className="flex items-center justify-center w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm py-2 rounded-md font-bold transition-colors">
                    <Wrench size={16} className="mr-2"/> AI Suggested Fix Ready
                  </div>
                </div>
              </div>

               <div className="absolute top-10 left-10 w-[200px] h-[45px] border-2 border-emerald-500/50 bg-emerald-500/10 rounded-lg group cursor-crosshair z-20">
                  <div className="absolute top-14 left-0 bg-[#1A252A] border border-emerald-500/30 p-3 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Heading Structure is valid</span>
                  </div>
                </div>
              </div>

               <div className="absolute bottom-24 left-32 w-[400px] h-[40px] border-2 border-dashed border-amber-500 bg-amber-500/10 rounded-lg group cursor-crosshair z-20">
                  <div className="absolute -top-24 left-0 bg-[#1A252A] border border-amber-500/40 p-4 rounded-xl shadow-2xl w-72 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Low Contrast (3.1:1)</span>
                  </div>
                  <p className="text-xs text-zinc-400 font-medium leading-relaxed">Text color #888888 on #F1F5F9 fails WCAG AA standards. Requires 4.5:1 minimum.</p>
                </div>
              </div>

              <div className="opacity-60 grayscale">
                <div className="w-48 h-10 bg-zinc-300 rounded-md mb-20"></div>
                <div className="w-full max-w-2xl h-8 bg-zinc-300 rounded-md mb-6"></div>
                <div className="w-full max-w-3xl h-4 bg-zinc-400 rounded mb-3"></div>
                <div className="w-full max-w-lg h-4 bg-zinc-400 rounded mb-12"></div>
                <div className="grid grid-cols-2 max-w-xl gap-6 mb-12">
                  <div className="h-14 bg-zinc-200 rounded-lg border-2 border-zinc-400"></div>
                  <div className="h-14 bg-zinc-200 rounded-lg border-2 border-zinc-400"></div>
                </div>
                <div className="max-w-xl h-10 bg-zinc-300 rounded-md"></div>
                <div className="absolute top-32 right-32 w-[280px] h-[55px] bg-indigo-600 rounded-lg flex items-center justify-center text-white/90 font-bold shadow-lg">
                   Complete Order
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Impact Section */}
      <section className="py-32 bg-linear-to-b from-[#0A0F1C] to-[#060913] border-t border-white/5 relative">
        <div className="absolute top-0 inset-x-0 h-px w-3/4 mx-auto bg-linear-to-r from-transparent via-cyan-500/50 to-transparent"></div>
        
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-16">
            Why This Matters
          </h2>

          <div className="grid md:grid-cols-3 gap-10 mb-20 px-4">
            <div className="p-6">
              <div className="text-6xl font-black text-white mb-4 tracking-tighter drop-shadow-md">
                1 in 6
              </div>
              <p className="text-zinc-400 text-lg font-medium leading-relaxed">
                People face significant accessibility challenges globally. Don&apos;t exclude potential users.
              </p>
            </div>
            <div className="p-6">
              <div className="text-6xl font-black text-indigo-500 mb-4 tracking-tighter drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                Risk
              </div>
              <p className="text-zinc-400 text-lg font-medium leading-relaxed">
                Poor accessibility leads to lost customers and severe legal liability in many countries.
              </p>
            </div>
            <div className="p-6">
              <div className="text-6xl font-black text-emerald-400 mb-4 tracking-tighter drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                Reward
              </div>
              <p className="text-zinc-400 text-lg font-medium leading-relaxed">
                Better accessibility always equals better user experience and SEO for everyone.
              </p>
            </div>
          </div>

          <div className="inline-block relative px-8 py-6 rounded-2xl border border-white/5 bg-white/2">
            <div className="absolute inset-0 bg-cyan-700/10 blur-2xl rounded-3xl"></div>
            <h3 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r from-white via-indigo-200 to-zinc-400 relative z-10 italic tracking-tight">
              &quot;Accessibility is not a feature. <br className="sm:hidden" /> It&apos;s usability.&quot;
            </h3>
          </div>
        </div>
      </section>

      {/* 7. Call to Action */}
      <section className="py-32 relative text-center overflow-hidden bg-linear-to-t from-cyan-950/20 to-transparent">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-1 bg-linear-to-r from-transparent via-cyan-500/80 to-transparent blur-[2px]"></div>
        
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <h2 className="text-5xl md:text-6xl font-black text-white mb-8 leading-tight tracking-tight drop-shadow-2xl">
            Make Your Web App Accessible - <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-400">
              Without Guesswork.
            </span>
          </h2>
          <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto font-medium">
            Join the forward-thinking teams shipping universally flawless interfaces.
          </p>
          <Link
            href="/register"
            className="inline-flex mt-4 px-12 py-5 bg-white text-zinc-950 hover:bg-zinc-200 rounded-xl font-black text-xl transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.4)] hover:-translate-y-1 items-center gap-3"
          >
            Run Your First Scan
            <ArrowRight size={24} />
          </Link>
        </div>
      </section>

      {/* Footer minimal */}
      <footer className="border-t border-white/5 bg-[#05090A]">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Accessibility size={20} className="text-zinc-500"/>
            <span className="font-bold text-zinc-300">AccessIQ</span>
          </div>
          <p className="text-zinc-500 text-sm font-medium">
            © 2026 AccessIQ Sandbox. Built for the modern web.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-zinc-500 hover:text-cyan-400 text-sm font-medium transition-colors">Privacy</a>
            <a href="#" className="text-zinc-500 hover:text-cyan-400 text-sm font-medium transition-colors">Terms</a>
          </div>
        </div>
      </footer>

      {isDemoOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
          <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-[#0B1222] shadow-2xl shadow-cyan-900/30 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0F171A]">
              <h3 className="text-white font-bold text-lg">Demo Analysis Preview</h3>
              <button
                type="button"
                onClick={() => setIsDemoOpen(false)}
                className="p-2 rounded-md text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close demo video"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-black">
              <video
                controls
                autoPlay
                className="w-full h-auto max-h-[75vh]"
                src="/DemoVideo.mp4"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close video preview"
            onClick={() => setIsDemoOpen(false)}
            className="absolute inset-0 -z-10"
          />
        </div>
      )}
    </div>
  );
}
