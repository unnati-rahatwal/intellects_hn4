// Inject content.js instantly when the popup is opened
(async function init() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
            await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
        }
    } catch (e) {}
})();

// Tab switching logic
document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

document.getElementById('audit-btn').addEventListener('click', async () => {
    const btn = document.getElementById('audit-btn');
    const emptyState = document.getElementById('empty-state');
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const issuesList = document.getElementById('issues-list');
    
    document.querySelectorAll('.run-prompt').forEach(el => el.style.display = 'none');
    document.getElementById('perf-metrics').innerHTML = `<div class="loading-state" style="display:block;"><div class="loading-icon">⏳</div><br />Evaluating Performance...</div>`;
    document.getElementById('perf-metrics').style.display = 'block';
    
    document.getElementById('seo-metrics').innerHTML = `<div class="loading-state" style="display:block;"><div class="loading-icon">⏳</div><br />Evaluating SEO...</div>`;
    document.getElementById('seo-metrics').style.display = 'block';
    
    document.getElementById('bp-metrics').innerHTML = `<div class="loading-state" style="display:block;"><div class="loading-icon">⏳</div><br />Evaluating Best Practices...</div>`;
    document.getElementById('bp-metrics').style.display = 'block';

    btn.disabled = true;
    btn.innerText = "Analyzing...";
    emptyState.style.display = 'none';
    errorState.style.display = 'none';
    issuesList.style.display = 'none';
    issuesList.innerHTML = '';
    loadingState.style.display = 'block';

    document.querySelector('.tab[data-tab="ai"]').click();

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) throw new Error("Could not connect to active tab.");

        try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }); } catch (e) {}

        chrome.tabs.sendMessage(tab.id, { action: "GET_DATA" }, async (response) => {
            if (chrome.runtime.lastError || !response || !response.dom) {
                showError("Cannot access this webpage. Make sure it is fully loaded.");
                return;
            }

            const perf = response.performance;
            const seo = response.seo;
            const bp = response.bestPractices;
            const history = response.history || []; // Loaded perfectly from domain's content.js
            
            document.getElementById('perf-metrics').innerHTML = `
                <div class="metric-row"><span class="metric-label">Load Event Time</span><span class="metric-value ${perf.loadTime < 1500 ? 'metric-pass' : 'metric-warn'}">${perf.loadTime} ms</span></div>
                <div class="metric-row"><span class="metric-label">DOM Interactive</span><span class="metric-value ${perf.domInteractive < 1000 ? 'metric-pass' : 'metric-warn'}">${perf.domInteractive} ms</span></div>
                <div class="metric-row"><span class="metric-label">First Contentful Paint</span><span class="metric-value ${perf.fcp < 800 ? 'metric-pass' : 'metric-warn'}">${perf.fcp} ms</span></div>
            `;
            
            document.getElementById('seo-metrics').innerHTML = `
                <details class="metric-card">
                    <summary class="metric-summary"><span class="metric-label">Page Title <span style="opacity:0.5;font-size:10px">▼</span></span><span class="metric-value ${seo.title !== 'Missing Title' ? 'metric-pass' : 'metric-fail'}">${seo.title === 'Missing Title' ? 'Fail' : 'Pass'}</span></summary>
                    <div class="metric-desc">The primary text shown in browser tabs and search engine results. A concise title is crucial for click-through rates.</div>
                </details>
                <details class="metric-card">
                    <summary class="metric-summary"><span class="metric-label">Heading 1 (H1) <span style="opacity:0.5;font-size:10px">▼</span></span><span class="metric-value ${seo.hasH1 ? 'metric-pass' : 'metric-fail'}">${seo.hasH1 ? 'Present' : 'Missing'}</span></summary>
                    <div class="metric-desc">The main heading of your page. Search engines use the H1 tag to understand the core topic of your content.</div>
                </details>
                <details class="metric-card">
                    <summary class="metric-summary"><span class="metric-label">Meta Description <span style="opacity:0.5;font-size:10px">▼</span></span><span class="metric-value ${seo.metaDesc !== 'Missing' ? 'metric-pass' : 'metric-warn'}">${seo.metaDesc !== 'Missing' ? 'Pass' : 'Missing'}</span></summary>
                    <div class="metric-desc">The summary snippet displayed below a search engine result. It heavily influences whether users click your link.</div>
                </details>
                <details class="metric-card">
                    <summary class="metric-summary"><span class="metric-label">Document Lang <span style="opacity:0.5;font-size:10px">▼</span></span><span class="metric-value ${seo.lang !== 'Missing' ? 'metric-pass' : 'metric-warn'}">${seo.lang}</span></summary>
                    <div class="metric-desc">Declares the language of the page (e.g., 'en'). Critical for localized search rankings and screen readers.</div>
                </details>
                <details class="metric-card">
                    <summary class="metric-summary"><span class="metric-label">Viewport Meta <span style="opacity:0.5;font-size:10px">▼</span></span><span class="metric-value ${seo.viewport ? 'metric-pass' : 'metric-fail'}">${seo.viewport ? 'Present' : 'Missing'}</span></summary>
                    <div class="metric-desc">Ensures your website scales correctly on mobile devices. Mobile usability is a major ranking factor.</div>
                </details>
                <details class="metric-card">
                    <summary class="metric-summary"><span class="metric-label">Canonical Link <span style="opacity:0.5;font-size:10px">▼</span></span><span class="metric-value ${seo.canonical ? 'metric-pass' : 'metric-warn'}">${seo.canonical ? 'Present' : 'Missing'}</span></summary>
                    <div class="metric-desc">Tells search engines which URL is the "master" version of a page, preventing duplicate content penalties.</div>
                </details>
            `;
            
            document.getElementById('bp-metrics').innerHTML = `
                <div class="metric-row"><span class="metric-label">HTTPS Usage</span><span class="metric-value ${bp.isHttps ? 'metric-pass' : 'metric-fail'}">${bp.isHttps ? 'Pass' : 'Fail'}</span></div>
                <div class="metric-row"><span class="metric-label">Valid DOCTYPE</span><span class="metric-value ${bp.hasDoctype ? 'metric-pass' : 'metric-fail'}">${bp.hasDoctype ? 'Pass' : 'Fail'}</span></div>
            `;

            try {
                const FEATHERLESS_API_KEY = "rc_ff7a83f83a512560f5a933d31b29d339ad0f9c9a6b4fccbcf25d9ebb7d38a471";
                const domString = response.dom.slice(0, 50).map(el => `Selector: ${el.selector}\nHTML: ${el.html}`).join("\n\n");
                
                const prompt = `You are a strict WCAG 2.2 Accessibility Auditor.
Review the HTML elements. Find real accessibility issues (missing ARIA, no alt text, low contrast, no structural role). Ignore flawless elements.
Output EXCLUSIVELY a JSON object. No preamble, no backticks, just raw JSON.
Format:
{ "issues": [{ "selector": "exact CSS selector provided", "severity": "critical|warning", "type": "Issue Title", "suggestion": "Fix suggestion" }] }

Input Elements:
${domString}`;

                const apiRes = await fetch("https://api.featherless.ai/v1/chat/completions", {
                    method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${FEATHERLESS_API_KEY}` },
                    body: JSON.stringify({ model: "Qwen/Qwen2.5-Coder-32B-Instruct", messages: [{ role: "user", content: prompt }], temperature: 0.1 })
                });

                if (!apiRes.ok) throw new Error("Featherless API rejected the request.");

                const data = await apiRes.json();
                const content = data.choices[0]?.message?.content || "";
                
                let issues = [];
                try {
                    let cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
                    const startIdx = cleaned.indexOf("{");
                    const endIdx = cleaned.lastIndexOf("}");
                    if (startIdx !== -1 && endIdx !== -1) cleaned = cleaned.substring(startIdx, endIdx + 1);
                    if (!cleaned) throw new Error("Empty extracted JSON response string.");
                    const parsed = JSON.parse(cleaned);
                    issues = Array.isArray(parsed.issues) ? parsed.issues : [];
                } catch (e) {
                    throw new Error(`AI generated malformed JSON structure: \n\n${content.substring(0, 300)}...`);
                }

                // COMPARATIVE ANALYSIS RENDER FOR POPUP
                if (history.length > 0) {
                    const prevData = history[history.length - 1]; // Because we haven't saved current yet
                    const prevIssuesCount = prevData.issues ? prevData.issues.length : 0;
                    const issueDiff = issues.length - prevIssuesCount;
                    
                    const curTime = typeof perf.loadTime === 'number' ? perf.loadTime : 0;
                    const prevTime = typeof prevData.performance?.loadTime === 'number' ? prevData.performance.loadTime : 0;
                    const timeDiff = curTime - prevTime;

                    const curDom = typeof perf.domInteractive === 'number' ? perf.domInteractive : 0;
                    const prevDom = typeof prevData.performance?.domInteractive === 'number' ? prevData.performance.domInteractive : 0;
                    
                    const curFcp = typeof perf.fcp === 'number' ? perf.fcp : 0;
                    const prevFcp = typeof prevData.performance?.fcp === 'number' ? prevData.performance.fcp : 0;

                    const compNode = document.createElement('div');
                    compNode.style.cssText = "margin-bottom: 24px;";
                    compNode.innerHTML = `
                        <h4 style="margin: 0 0 12px 0; color: white; font-size: 14px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);">Comparative Analysis</h4>
                        <div style="display:flex; background: #0F1629; border: 1px solid rgba(255,255,255,0.1); padding: 10px 8px; font-size: 11px; font-weight: bold; color: #94a3b8; text-align: center; border-radius: 8px 8px 0 0; border-bottom:none;">
                            <div style="flex: 2; text-align: left; color: #cbd5e1;">METRIC</div>
                            <div style="flex: 1;">PREVIOUS</div>
                            <div style="flex: 1; color: #22d3ee;">CURRENT</div>
                        </div>
                        <div style="display:flex; border: 1px solid rgba(255,255,255,0.1); border-top: none; background: #111827; padding: 10px 8px; font-size: 12px; text-align: center; align-items: center;">
                            <div style="flex: 2; text-align: left; font-weight: bold; color: #e2e8f0;">Total AI Issues</div>
                            <div style="flex: 1; color: #cbd5e1;">${prevIssuesCount}</div>
                            <div style="flex: 1; font-weight:bold; color: ${issueDiff < 0 ? '#34d399' : (issueDiff > 0 ? '#ef4444' : '#cbd5e1')};">${issues.length} <span style="font-size:10px;">(${issueDiff > 0 ? '+' : ''}${issueDiff})</span></div>
                        </div>
                        <div style="display:flex; border: 1px solid rgba(255,255,255,0.1); border-top: none; background: #111827; padding: 10px 8px; font-size: 12px; text-align: center; align-items: center;">
                            <div style="flex: 2; text-align: left; font-weight: bold; color: #e2e8f0;">Load Time (ms)</div>
                            <div style="flex: 1; color: #cbd5e1;">${prevTime}</div>
                            <div style="flex: 1; font-weight:bold; color: ${timeDiff <= 0 ? '#34d399' : '#ef4444'};">${curTime} <span style="font-size:10px;">(${timeDiff > 0 ? '+' : ''}${timeDiff})</span></div>
                        </div>
                        <div style="display:flex; border: 1px solid rgba(255,255,255,0.1); border-top: none; border-radius: 0 0 8px 8px; background: #111827; padding: 10px 8px; font-size: 12px; text-align: center; align-items: center;">
                            <div style="flex: 2; text-align: left; font-weight: bold; color: #e2e8f0;">DOM Ready (ms)</div>
                            <div style="flex: 1; color: #cbd5e1;">${prevDom}</div>
                            <div style="flex: 1; color: #22d3ee;">${curDom}</div>
                        </div>
                    `;
                    issuesList.appendChild(compNode);
                }

                if (issues.length > 0) {
                    chrome.tabs.sendMessage(tab.id, { action: "HIGHLIGHT", issues });
                    
                    const cIssues = issues.map((iss, i) => ({...iss, globalIdx: i})).filter(i => i.severity === 'critical');
                    const wIssues = issues.map((iss, i) => ({...iss, globalIdx: i})).filter(i => i.severity !== 'critical');

                    let treeHTML = `
                        <div class="org-wrapper">
                          <div class="org-tree">
                             <div class="org-node" style="border-color: #22d3ee; box-shadow: 0 0 15px rgba(34,211,238,0.2);">
                                <div style="font-size:20px; margin-bottom:4px;">📄</div>
                                <div style="color:white; font-weight:bold; font-size:13px; margin-bottom:2px;">page.tsx</div>
                                <div style="color:#22d3ee; font-size:10px;">Active UI Root</div>
                             </div>
                             <div class="org-children">
                    `;

                    if (cIssues.length > 0) {
                        treeHTML += `
                            <div class="org-child">
                               <div class="org-node" style="border-color: #ef4444; background: rgba(239,68,68,0.1);">
                                  <div style="color:#ef4444; font-weight:bold; font-size:13px;">Critical Issues</div>
                                  <div style="color:#f87171; font-size:10px;">${cIssues.length} Detected</div>
                               </div>
                               <div class="org-children">
                                  ${cIssues.map(issue => `
                                    <div class="org-child">
                                       <div class="org-node issue-node" data-selector="${issue.selector.replace(/"/g, '&quot;')}" style="border-color: #ef4444;">
                                          <div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:6px;">
                                             <div style="background:#ef4444; color:white; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; flex-shrink:0;">${issue.globalIdx + 1}</div>
                                             <div style="color:white; font-size:12px; font-weight:bold; line-height:1.2;">${issue.type}</div>
                                          </div>
                                          <div style="color:#94a3b8; font-size:10px; line-height:1.4;">${issue.suggestion}</div>
                                       </div>
                                    </div>
                                  `).join('')}
                               </div>
                            </div>
                        `;
                    }

                    if (wIssues.length > 0) {
                        treeHTML += `
                            <div class="org-child">
                               <div class="org-node" style="border-color: #f59e0b; background: rgba(245,158,11,0.1);">
                                  <div style="color:#f59e0b; font-weight:bold; font-size:13px;">Moderate Issues</div>
                                  <div style="color:#fbbf24; font-size:10px;">${wIssues.length} Detected</div>
                               </div>
                               <div class="org-children">
                                  ${wIssues.map(issue => `
                                    <div class="org-child">
                                       <div class="org-node issue-node" data-selector="${issue.selector.replace(/"/g, '&quot;')}" style="border-color: #f59e0b;">
                                          <div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:6px;">
                                             <div style="background:#f59e0b; color:white; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; flex-shrink:0;">${issue.globalIdx + 1}</div>
                                             <div style="color:white; font-size:12px; font-weight:bold; line-height:1.2;">${issue.type}</div>
                                          </div>
                                          <div style="color:#94a3b8; font-size:10px; line-height:1.4;">${issue.suggestion}</div>
                                       </div>
                                    </div>
                                  `).join('')}
                               </div>
                            </div>
                        `;
                    }

                    treeHTML += `
                             </div>
                          </div>
                        </div>
                    `;

                    const treeContainer = document.createElement('div');
                    treeContainer.innerHTML = treeHTML;
                    
                    // Attach click handlers to send SCROLL_TO msg
                    treeContainer.querySelectorAll('.issue-node').forEach(node => {
                        node.onclick = () => {
                            chrome.tabs.sendMessage(tab.id, { action: "SCROLL_TO", selector: node.getAttribute('data-selector') });
                        };
                    });
                    
                    issuesList.appendChild(treeContainer);
                    issuesList.style.display = 'block';
                } else {
                    emptyState.innerHTML = `<div style="font-size: 32px; margin-bottom: 16px;">✅</div>No critical WCAG violations detected by AI on this view.`;
                    emptyState.style.display = 'block';
                }

                chrome.tabs.sendMessage(tab.id, {
                    action: "SAVE_RESULTS",
                    data: { issues, performance: perf, seo: seo, bestPractices: bp }
                });

            } catch (err) {
                showError(err.message);
            } finally {
                loadingState.style.display = 'none';
                btn.disabled = false;
                btn.innerText = "Re-Run Lighthouse Audit";
            }
        });

    } catch (err) {
        showError(err.message);
    }

    function showError(msg) {
        loadingState.style.display = 'none';
        errorState.innerText = msg;
        errorState.style.display = 'block';
        btn.disabled = false;
        btn.innerText = "Re-Run Audit";
    }
});
