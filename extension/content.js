if (!window.accessIqLoaded) {
  window.accessIqLoaded = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GET_DATA") {
    const data = { dom: [], seo: {}, performance: {}, bestPractices: {} };
    
    let idCounter = 0;
    const liveElements = document.querySelectorAll('main, a, button, img, input, textarea, select, form, section, nav, header, footer, table');
    liveElements.forEach(el => {
      const qid = `aq-${++idCounter}`;
      el.setAttribute('data-accessiq-id', qid);
      
      let info = `<${el.tagName.toLowerCase()}`;
      ['id', 'class', 'aria-label', 'alt', 'type', 'for', 'role'].forEach(attr => {
        if (el.getAttribute(attr)) info += ` ${attr}="${el.getAttribute(attr)}"`;
      });
      let text = el.innerText ? el.innerText.replace(/\n/g, ' ').substring(0, 50).trim() : '';
      if (text) info += `> ${text}`;
      else info += ` />`;
      
      data.dom.push({ selector: `[data-accessiq-id="${qid}"]`, html: info });
    });

    data.seo = {
      title: document.title || 'Missing Title',
      hasH1: document.querySelectorAll('h1').length > 0,
      metaDesc: document.querySelector('meta[name="description"]')?.content || 'Missing',
      lang: document.documentElement.lang || 'Missing',
      viewport: !!document.querySelector('meta[name="viewport"]'),
      canonical: !!document.querySelector('link[rel="canonical"]'),
    };

    const nav = performance.getEntriesByType("navigation")[0] || {};
    const paint = performance.getEntriesByType("paint");
    const fcp = paint.find(p => p.name === 'first-contentful-paint');
    data.performance = {
      loadTime: nav.loadEventEnd ? Math.round(nav.loadEventEnd - nav.startTime) : 'N/A',
      domInteractive: nav.domInteractive ? Math.round(nav.domInteractive) : 'N/A',
      fcp: fcp ? Math.round(fcp.startTime) : 'N/A',
    };

    data.bestPractices = { isHttps: location.protocol === 'https:', hasDoctype: !!document.doctype };
    
    // Fetch history array to pass to popup for comparative analysis
    data.history = JSON.parse(localStorage.getItem('accessiq_history') || '[]');
    sendResponse(data);

  } else if (request.action === "HIGHLIGHT") {
    document.querySelectorAll('.accessiq-highlight').forEach(el => el.remove());

    request.issues.forEach((issue, index) => {
      try {
        const target = document.querySelector(issue.selector);
        if (target) {
          const rect = target.getBoundingClientRect();
          const overlay = document.createElement("div");
          overlay.className = "accessiq-highlight";
          
          const padding = 6;
          Object.assign(overlay.style, {
            position: "absolute", top: `${rect.top + window.scrollY - padding}px`, left: `${rect.left + window.scrollX - padding}px`,
            width: `${rect.width + padding * 2}px`, height: `${rect.height + padding * 2}px`,
            border: `2px dashed ${issue.severity === 'critical' ? '#ef4444' : '#f59e0b'}`,
            backgroundColor: issue.severity === 'critical' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            pointerEvents: "none", zIndex: "2147483647"
          });

          const badge = document.createElement("div");
          Object.assign(badge.style, {
            position: "absolute", top: "-12px", left: "-12px", width: "24px", height: "24px", borderRadius: "12px",
            backgroundColor: issue.severity === 'critical' ? '#ef4444' : '#f59e0b', color: "white",
            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "12px",
            fontFamily: "sans-serif", boxShadow: "0 2px 5px rgba(0,0,0,0.3)"
          });
          badge.innerText = index + 1;
          overlay.appendChild(badge);

          const tooltip = document.createElement("div");
          Object.assign(tooltip.style, {
            position: "absolute", top: "100%", left: "0", marginTop: "4px", backgroundColor: "#1e293b", color: "#f8fafc", padding: "8px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace", whiteSpace: "pre-wrap", width: "max-content", maxWidth: "300px", border: `1px solid ${issue.severity === 'critical' ? '#ef4444' : '#f59e0b'}`, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)"
          });
          tooltip.innerHTML = `<strong>Issue #${index + 1}: ${issue.type}</strong><br/>${issue.suggestion}`;
          overlay.appendChild(tooltip);
          document.body.appendChild(overlay);
        }
      } catch (e) {
        console.error("Failed highlighting element with selector:", issue.selector);
      }
    });

  } else if (request.action === "SAVE_RESULTS") {
    let history = JSON.parse(localStorage.getItem('accessiq_history') || '[]');
    let entry = request.data;
    entry.timestamp = new Date().toISOString();
    history.push(entry);
    if (history.length > 20) history.shift(); // Keep last 20 domain scans
    localStorage.setItem('accessiq_history', JSON.stringify(history));
    if (window.renderAccessIqPanel) window.renderAccessIqPanel();

  } else if (request.action === "SCROLL_TO") {
    try {
      const target = document.querySelector(request.selector);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const oldBorder = target.style.border; const oldShadow = target.style.boxShadow;
        target.style.transition = 'all 0.3s ease'; target.style.border = '3px solid #0891b2'; target.style.boxShadow = '0 0 20px #0891b2';
        setTimeout(() => { target.style.border = oldBorder; target.style.boxShadow = oldShadow; }, 2500);
      }
    } catch(e) {}
  }
  return true;
});


function injectAccessIqFloatingUI() {
  if (document.getElementById('accessiq-root')) return;

  const root = document.createElement('div');
  root.id = 'accessiq-root';
  const shadow = root.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    .fab { position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px; border-radius: 28px; background: #0891b2; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 2147483647; border: none; font-size: 26px; transition: transform 0.2s; }
    .fab:hover { transform: scale(1.05); }
    .panel { position: fixed; bottom: 90px; right: 24px; width: 400px; max-height: 75vh; background: #0A0F1C; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 40px rgba(0,0,0,0.6); z-index: 2147483647; display: none; flex-direction: column; overflow: hidden; font-family: system-ui, sans-serif; color: #cbd5e1; }
    .header { padding: 16px; background: #0F1629; border-bottom: 1px solid rgba(255,255,255,0.1); font-weight: bold; color: white; display: flex; justify-content: space-between; align-items: center; font-size: 16px; }
    .close-btn { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 24px; padding: 0; line-height: 1; }
    .close-btn:hover { color: white; }
    .content { flex: 1; overflow-y: auto; padding: 16px; }
    .content::-webkit-scrollbar { width: 6px; } .content::-webkit-scrollbar-track { background: transparent; } .content::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
    .issue-card { background-color: #111827; border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 12px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s; display: flex; gap: 12px; }
    .issue-card:hover { background-color: #1e293b; border-color: #0891b2; }
    .issue-critical { border-left: 3px solid #ef4444; } .issue-warning { border-left: 3px solid #f59e0b; }
    .issue-number { width: 24px; height: 24px; border-radius: 12px; background: #334155; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0; }
    .issue-title { margin: 0 0 4px 0; color: #e2e8f0; font-size: 13px; font-weight: 600; }
    .issue-desc { margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.4; }
    .metric-row { display: flex; justify-content: space-between; padding: 10px; background: #111827; border-radius: 6px; margin-bottom: 8px; font-size: 12px; border: 1px solid rgba(255,255,255,0.05); }
    .metric-pass { color: #34d399; font-weight: bold; } .metric-warn { color: #f59e0b; font-weight: bold;} .metric-fail { color: #ef4444; font-weight: bold;}
    h3 { font-size: 14px; color: white; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .section { margin-bottom: 24px; }
    .comparative-box { padding: 12px; background: rgba(34,211,238,0.1); border: 1px solid rgba(34,211,238,0.2); border-radius: 8px; margin-bottom: 16px; }
    .comparative-title { color: #22d3ee; font-weight: bold; font-size: 13px; margin: 0 0 8px 0; }
  `;

  const fab = document.createElement('button');
  fab.className = 'fab';
  fab.innerHTML = '♿';

  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.innerHTML = `
    <div class="header">
      <span style="display:flex;align-items:center;gap:8px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="4" r="1"/><rect width="6" height="12" x="13" y="8" rx="1"/><path d="M14 20h4"/><path d="m5 16 3-3V8"/><path d="M5 8h4"/></svg> Local Report</span>
      <button class="close-btn">&times;</button>
    </div>
    <div class="content" id="panel-content">
      <div style="text-align:center; color:#94a3b8; padding: 20px;">No report found.<br>Run an audit from the extension popup first to save data to this domain.</div>
    </div>
  `;

  fab.onclick = () => {
    const isOpen = panel.style.display === 'flex';
    panel.style.display = isOpen ? 'none' : 'flex';
    if (!isOpen) window.renderAccessIqPanel();
  };

  panel.querySelector('.close-btn').onclick = () => panel.style.display = 'none';

  shadow.appendChild(style);
  shadow.appendChild(fab);
  shadow.appendChild(panel);
  document.body.appendChild(root);

  window.renderAccessIqPanel = () => {
    try {
      const historyStr = localStorage.getItem('accessiq_history');
      if (!historyStr) return;
      const history = JSON.parse(historyStr);
      if(history.length === 0) return;
      
      const data = history[history.length - 1]; // Latest
      const prevData = history.length > 1 ? history[history.length - 2] : null;

      const content = shadow.getElementById('panel-content');
      content.innerHTML = '';

      // Comparative section
      if (prevData) {
         const currentIssues = data.issues ? data.issues.length : 0;
         const prevIssues = prevData.issues ? prevData.issues.length : 0;
         const issueDiff = currentIssues - prevIssues;
         
         const curTime = typeof data.performance.loadTime === 'number' ? data.performance.loadTime : 0;
         const prevTime = typeof prevData.performance?.loadTime === 'number' ? prevData.performance.loadTime : 0;
         const timeDiff = curTime - prevTime;

         const curDom = typeof data.performance.domInteractive === 'number' ? data.performance.domInteractive : 0;
         const prevDom = typeof prevData.performance?.domInteractive === 'number' ? prevData.performance.domInteractive : 0;

         const curFcp = typeof data.performance.fcp === 'number' ? data.performance.fcp : 0;
         const prevFcp = typeof prevData.performance?.fcp === 'number' ? prevData.performance.fcp : 0;
         
         content.innerHTML += `
            <div class="section">
                <h3>Comparative Analysis (Side-by-Side)</h3>
                <div style="display:flex; background: #0F1629; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 10px 8px; font-size: 11px; font-weight: bold; color: #94a3b8; text-align: center; border-radius: 8px 8px 0 0; border: 1px solid rgba(255,255,255,0.1); border-bottom:none;">
                    <div style="flex: 2; text-align: left; color: #cbd5e1;">METRIC</div>
                    <div style="flex: 1;">PREVIOUS</div>
                    <div style="flex: 1; color: #22d3ee;">CURRENT</div>
                </div>
                <!-- Issue Count -->
                <div style="display:flex; border: 1px solid rgba(255,255,255,0.1); border-top: none; background: #111827; padding: 10px 8px; font-size: 12px; text-align: center; align-items: center;">
                    <div style="flex: 2; text-align: left; font-weight: bold; color: #e2e8f0;">AI Issues Found</div>
                    <div style="flex: 1; color: #cbd5e1;">${prevIssues}</div>
                    <div style="flex: 1; font-weight:bold; color: ${issueDiff < 0 ? '#34d399' : (issueDiff > 0 ? '#ef4444' : '#cbd5e1')};">${currentIssues} <span style="font-size:10px;">(${issueDiff > 0 ? '+' : ''}${issueDiff})</span></div>
                </div>
                <!-- Load Time -->
                <div style="display:flex; border: 1px solid rgba(255,255,255,0.1); border-top: none; background: #111827; padding: 10px 8px; font-size: 12px; text-align: center; align-items: center;">
                    <div style="flex: 2; text-align: left; font-weight: bold; color: #e2e8f0;">Load Time (ms)</div>
                    <div style="flex: 1; color: #cbd5e1;">${prevTime}</div>
                    <div style="flex: 1; font-weight:bold; color: ${timeDiff <= 0 ? '#34d399' : '#ef4444'};">${curTime} <span style="font-size:10px;">(${timeDiff > 0 ? '+' : ''}${timeDiff})</span></div>
                </div>
                <!-- DOM Interactive -->
                <div style="display:flex; border: 1px solid rgba(255,255,255,0.1); border-top: none; background: #111827; padding: 10px 8px; font-size: 12px; text-align: center; align-items: center;">
                    <div style="flex: 2; text-align: left; font-weight: bold; color: #e2e8f0;">DOM Ready (ms)</div>
                    <div style="flex: 1; color: #cbd5e1;">${prevDom}</div>
                    <div style="flex: 1; color: #22d3ee;">${curDom}</div>
                </div>
                <!-- FCP -->
                <div style="display:flex; border: 1px solid rgba(255,255,255,0.1); border-top: none; border-radius: 0 0 8px 8px; background: #111827; padding: 10px 8px; font-size: 12px; text-align: center; align-items: center; margin-bottom: 24px;">
                    <div style="flex: 2; text-align: left; font-weight: bold; color: #e2e8f0;">First Paint (ms)</div>
                    <div style="flex: 1; color: #cbd5e1;">${prevFcp}</div>
                    <div style="flex: 1; color: #22d3ee;">${curFcp}</div>
                </div>
            </div>
         `;
      }

      if (data.issues && data.issues.length > 0) {
        const sec = document.createElement('div');
        sec.className = 'section';
        sec.innerHTML = `<h3>AI Accessibility Issues (${data.issues.length})</h3>`;
        data.issues.forEach((issue, index) => {
            const card = document.createElement('div');
            card.title = "Click to scroll to this element";
            card.className = `issue-card ${issue.severity === 'critical' ? 'issue-critical' : 'issue-warning'}`;
            
            const numColor = issue.severity === 'critical' ? '#ef4444' : '#f59e0b';
            card.innerHTML = `
              <div class="issue-number" style="background:${numColor}">${index + 1}</div>
              <div><p class="issue-title">${issue.type}</p><p class="issue-desc">${issue.suggestion}</p></div>
            `;
            
            card.onclick = () => {
                try {
                    const target = document.querySelector(issue.selector);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        const oB = target.style.border; const oS = target.style.boxShadow;
                        target.style.transition = 'all 0.3s ease';
                        target.style.border = '3px solid #0891b2'; target.style.boxShadow = '0 0 20px #0891b2';
                        setTimeout(() => { target.style.border = oB; target.style.boxShadow = oS; }, 2500);
                    }
                } catch(e) {}
            };
            sec.appendChild(card);
        });
        content.appendChild(sec);
      }

      if (data.performance) {
          const perf = data.performance;
          const sec = document.createElement('div');
          sec.className = 'section';
          sec.innerHTML = `<h3>Performance Vitals</h3>
            <div class="metric-row"><span>Load Event Time</span><span class="${perf.loadTime < 1500 ? 'metric-pass' : 'metric-warn'}">${perf.loadTime} ms</span></div>
            <div class="metric-row"><span>DOM Interactive</span><span class="${perf.domInteractive < 1000 ? 'metric-pass' : 'metric-warn'}">${perf.domInteractive} ms</span></div>
            <div class="metric-row"><span>First Contentful Paint</span><span class="${perf.fcp < 800 ? 'metric-pass' : 'metric-warn'}">${perf.fcp} ms</span></div>
          `;
          content.appendChild(sec);
      }

      if (data.seo) {
          const seo = data.seo;
          const sec = document.createElement('div');
          sec.className = 'section';
          sec.innerHTML = `<h3>SEO & Best Practices</h3>
            <div class="metric-row"><span>Title Tag</span><span class="${seo.title !== 'Missing Title' ? 'metric-pass' : 'metric-fail'}">${seo.title === 'Missing Title' ? 'Fail' : 'Pass'}</span></div>
            <div class="metric-row"><span>HTTPS Protocol</span><span class="${data.bestPractices?.isHttps ? 'metric-pass' : 'metric-fail'}">${data.bestPractices?.isHttps ? 'Pass' : 'Fail'}</span></div>
            <div class="metric-row"><span>Canonical Meta</span><span class="${seo.canonical ? 'metric-pass' : 'metric-warn'}">${seo.canonical ? 'Present' : 'Missing'}</span></div>
          `;
          content.appendChild(sec);
      }

    } catch (e) {}
  };

  if (localStorage.getItem('accessiq_history')) window.renderAccessIqPanel();
}

  if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectAccessIqFloatingUI);
  } else {
      injectAccessIqFloatingUI();
  }
}
