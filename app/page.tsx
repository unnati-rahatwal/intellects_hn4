'use client';

import Link from 'next/link';
import { 
  Shield, 
  Zap, 
  Code2, 
  Search, 
  ArrowRight, 
  Globe,
  Layout
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="landing-container" style={{ background: 'var(--bg-primary)', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Decorative Background Elements */}
      <div className="glow-top" />
      <div className="glow-bottom" />

      {/* Hero Section */}
      <section className="hero" style={{ 
        padding: '120px 24px 80px', 
        textAlign: 'center', 
        maxWidth: 1000, 
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        <div className="badge-wrapper animate-fade-in" style={{ marginBottom: 24 }}>
          <span className="glass-badge">
            <Zap size={14} className="text-accent" />
            HackNiche 4.0 Standard
          </span>
        </div>
        
        <h1 className="hero-title animate-slide-up" style={{ 
          fontSize: 'clamp(40px, 8vw, 72px)', 
          fontWeight: 800, 
          lineHeight: 1.1,
          marginBottom: 24,
          letterSpacing: '-0.02em',
          background: 'linear-gradient(to bottom, #fff 40%, rgba(255,255,255,0.7))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Automate Accessibility <br />
          <span style={{ color: 'var(--accent-primary)', WebkitTextFillColor: 'initial' }}>With Precision AI</span>
        </h1>

        <p className="hero-description animate-slide-up" style={{ 
          fontSize: 'clamp(16px, 1.2vw, 20px)', 
          color: 'var(--text-secondary)', 
          maxWidth: 600, 
          margin: '0 auto 40px',
          lineHeight: 1.6
        }}>
          The enterprise-grade auditing platform that scans, identifies, and fixes WCAG violations in seconds. Bridge the gap between audit and remediation.
        </p>

        <div className="hero-btns animate-slide-up" style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <Link href="/dashboard" className="btn btn-primary btn-lg">
            Start Auditing Free
            <ArrowRight size={18} />
          </Link>
          <Link href="/projects" className="btn btn-ghost btn-lg">
            View Projects
          </Link>
        </div>
      </section>

      {/* Stats/Social Proof Section */}
      <section className="stats animate-fade-in" style={{ 
        padding: '40px 24px', 
        maxWidth: 1200, 
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'center',
        gap: 'clamp(32px, 5vw, 80px)',
        flexWrap: 'wrap',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        {[
          { label: 'Rules Tested', value: '96+' },
          { label: 'False Positives', value: '0%' },
          { label: 'Security Checks', value: '15+' },
          { label: 'AI Resolution', value: 'Instant' },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{stat.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Features Grid */}
      <section id="features" style={{ padding: '100px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }}>Enterprise Audit Engine</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto' }}>
            Powered by Playwright and axe-core, our platform provides deep DOM analysis and deterministic remediation.
          </p>
        </div>

        <div className="feature-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: 24 
        }}>
          <FeatureCard 
            icon={<Search className="text-accent" />}
            title="Multi-Page Discovery"
            description="Deep crawl through sitemaps, DOM links, and SPA history to discover every hidden route in your application."
          />
          <FeatureCard 
            icon={<Shield className="text-accent" />}
            title="Visual Explorer"
            description="Interactively explore violations with canvas-based bounding box overlays on a real-time proxied version of your site."
          />
          <FeatureCard 
            icon={<Code2 className="text-accent" />}
            title="AI Remediation"
            description="Context-aware accessibility fixes powered by Featherless.ai. Get production-ready ARIA and HTML snippets instantly."
          />
          <FeatureCard 
            icon={<Zap className="text-accent" />}
            title="CDP Deep Insights"
            description="Access the computed accessibility tree and emulate vision deficiencies to understand the true user experience."
          />
          <FeatureCard 
            icon={<Globe className="text-accent" />}
            title="Security Analysis"
            description="Audit SSL certificates, security headers (CSP, HSTS), and SSRF vulnerabilities while you scan for accessibility."
          />
          <FeatureCard 
            icon={<Layout className="text-accent" />}
            title="Executive Reports"
            description="Generate high-level trends and severity distributions to track your compliance progress over time."
          />
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '80px 24px 140px' }}>
        <div className="glass-card-static" style={{ 
          maxWidth: 900, 
          margin: '0 auto', 
          padding: '64px 24px', 
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.2)'
        }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 20 }}>Ready to bridge the accessibility gap?</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32, maxWidth: 500, margin: '0 auto 32px' }}>
            Join hundreds of developers using Intellects to build a more inclusive web. No credit card required.
          </p>
          <Link href="/dashboard" className="btn btn-primary btn-lg">
            Launch Your First Audit
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ 
        padding: '40px 24px', 
        borderTop: '1px solid var(--border-subtle)',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: 14
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16 }}>
          <Link href="/dashboard" className="nav-link">Dashboard</Link>
          <Link href="/projects" className="nav-link">Projects</Link>
          <Link href="/projects/new" className="nav-link">New Scan</Link>
        </div>
        <p>© 2026 Intellects Accessibility Platform. HackNiche 4.0 Submission.</p>
      </footer>

      <style jsx>{`
        .glow-top {
          position: absolute;
          top: -20%;
          left: 50%;
          transform: translateX(-50%);
          width: 80vw;
          height: 60vh;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
          pointer-events: none;
        }
        .glow-bottom {
          position: absolute;
          bottom: 20%;
          right: -10%;
          width: 50vw;
          height: 50vh;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.05) 0%, transparent 70%);
          pointer-events: none;
        }
        .glass-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 100px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .text-accent {
          color: var(--accent-primary);
        }
        .btn-lg {
          padding: 14px 28px;
          font-size: 16px;
        }
        .nav-link {
          color: var(--text-muted);
          text-decoration: none;
          transition: color 0.2s;
        }
        .nav-link:hover {
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="glass-card" style={{ padding: 32, textAlign: 'left', height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ 
        width: 48, 
        height: 48, 
        borderRadius: 12, 
        background: 'rgba(99, 102, 241, 0.1)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        marginBottom: 8
      }}>
        {icon}
      </div>
      <div>
        <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>{title}</h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: 15 }}>{description}</p>
      </div>
    </div>
  );
}
