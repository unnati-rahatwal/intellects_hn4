'use client';

import { HelpCircle, Book, MessageSquare, Mail, Search, ExternalLink, ShieldCheck, Zap } from 'lucide-react';

export default function SupportPage() {
  const faqItems = [
    { q: "How do I connect my GitHub account?", a: "Go to the Settings page or use the 'GitHub Connect' link in the sidebar. Once authorized, you can link specific repositories to your projects." },
    { q: "What is the [AccessIQ] commit prefix?", a: "This prefix is used by our automated worker to push reports back to your repo. It also helps prevent infinite webhook loops." },
    { q: "Can I scan local development URLs?", a: "Yes, if your dev server is accessible via your network or a tunneling service like ngrok, AccessIQ can audit it." }
  ];

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <HelpCircle size={28} className="text-cyan-500" /> Support & Resources
        </h1>
        <p className="page-subtitle">Get help with AccessIQ and learn how to maximize your accessibility score</p>
      </div>

      {/* Search Help */}
      <div className="relative mb-12">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
        <input 
          type="text" 
          placeholder="Search documentation, guides, and FAQs..." 
          className="input pl-12 py-4 bg-slate-900/80 border-white/5 focus:border-cyan-500/50"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="glass-card hover:border-cyan-500/30">
          <Book className="text-cyan-500 mb-4" size={32} />
          <h3 className="text-lg font-semibold mb-2">Documentation</h3>
          <p className="text-sm text-slate-400 mb-4">Explore our comprehensive guides on WCAG standards and how to use our auditing engine.</p>
          <button className="btn btn-sm btn-ghost gap-2 text-cyan-400 px-0">
            Open Docs <ExternalLink size={14} />
          </button>
        </div>

        <div className="glass-card hover:border-indigo-500/30">
          <Zap className="text-indigo-500 mb-4" size={32} />
          <h3 className="text-lg font-semibold mb-2">Platform Status</h3>
          <p className="text-sm text-slate-400 mb-4">Check the current status of our scanning engine and background worker infrastructure.</p>
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> All Systems Operational
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <MessageSquare size={20} className="text-slate-500" /> Frequently Asked Questions
        </h2>
        <div className="flex flex-col gap-4">
          {faqItems.map((item, i) => (
            <div key={i} className="glass-card-static !p-6 bg-slate-900/30 border-white/5">
              <h4 className="font-medium text-slate-200 mb-2">{item.q}</h4>
              <p className="text-sm text-slate-400 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section className="glass-card bg-linear-to-br from-cyan-950/20 to-indigo-950/20 border-cyan-500/20 text-center py-12">
        <Mail className="mx-auto text-cyan-500 mb-4" size={40} />
        <h2 className="text-2xl font-bold mb-2">Still need help?</h2>
        <p className="text-slate-400 mb-8 max-w-md mx-auto">Our specialized engineering support team is available to help you with integration issues and custom audit requirements.</p>
        <div className="flex justify-center gap-4">
          <button className="btn btn-primary">Contact Engineering</button>
          <button className="btn btn-secondary">Report a Bug</button>
        </div>
      </section>

      <footer className="text-center py-8 text-xs text-slate-600 flex items-center justify-center gap-2">
         <ShieldCheck size={14} /> AccessIQ v1.2.0 • Data is encrypted at rest and in transit
      </footer>
    </div>
  );
}
