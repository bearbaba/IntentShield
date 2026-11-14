import {CHAINS,DEFAULT_AGENTS,DEFAULT_POLICY,SCENARIOS,createInitialState,evaluateIntent,validatePolicy} from './engine.js';

const STORAGE_KEY='intentshield:v1';
const $=(selector,root=document)=>root.querySelector(selector);
const esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>globalThis.crypto?.randomUUID?.()||`evt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const num=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(Number(n)||0);
const date=s=>new Date(s).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
const short=s=>String(s||'').length>24?`${String(s).slice(0,12)}…${String(s).slice(-7)}`:String(s||'');
const svgMap={
 shield:'<path d="m12 22 1.5-.6C19 19 21 15.5 21 10V5l-9-3-9 3v5c0 5.5 2 9 7.5 11.4L12 22Z"/><path d="m9 12 2 2 4-4"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 bolt:'<path d="m13 2-9 12h7l-1 8 10-12h-7l0-8Z"/>',
 sliders:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="#14192b"/><circle cx="16" cy="17" r="3" fill="#14192b"/>',
 users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2H3ZM16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
 file:'<path d="M6 2h8l4 4v16H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M14 2v5h5M8 12h7M8 16h7"/>',
 arrow:'<path d="M5 12h14m-7-7 7 7-7 7"/>',
 chevron:'<path d="m9 18 6-6-6-6"/>',
 check:'<path d="m4 12 5 5L20 6"/>',
 x:'<path d="M5 5 19 19M19 5 5 19"/>',
 alert:'<path d="M10.3 3.6 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18M12 3c-5 5-5 13 0 18"/>',
 copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
 circle:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
 refresh:'<path d="M21 12a9 9 0 0 1-16 6m-2-6A9 9 0 0 1 19 6M3 17v-5h5M21 7v5h-5"/>',
 external:'<path d="M14 4h6v6m0-6-9 9"/><path d="M20 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5"/>',
 menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
 spark:'<path d="m12 3 2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7Z"/>',
 settings:'<path d="M4 4h16v16H4zM8 9h8M8 13h8M8 17h5"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.5"/>'
};
const icon=(key,size=18)=>`<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svgMap[key]||svgMap.circle}</svg>`;
const decisionPill=d=>`<span class="status ${esc(String(d).toLowerCase())}"><span class="status-dot"></span>${esc(d)}</span>`;
const nav=[['overview','Overview','grid'],['simulator','Intent simulator','bolt'],['approvals','Approval queue','clock'],['policies','Policy engine','sliders'],['agents','Agent registry','users'],['audit','Audit trail','file']];
const titles={overview:['Security overview','Control every transaction before it happens.'],simulator:['Intent simulator','Run transactions through your security policy.'],approvals:['Approval center','Keep a human in control of uncertain decisions.'],policies:['Policy engine','Define guardrails that agents cannot talk their way around.'],agents:['Agent registry','Manage who is allowed to propose financial actions.'],audit:['Audit trail','An inspectable local record of every decision.']};
function load(){
  let parsed;
  try{parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');}catch{parsed=null;}
  const base=createInitialState();
  if(parsed && typeof parsed==='object'){
    const policy={...base.policy,...parsed.policy};
    if(validatePolicy(policy).ok){base.policy=policy;}
    if(Array.isArray(parsed.agents))base.agents=base.agents.map(a=>({...a,enabled:parsed.agents.find(b=>b.id===a.id)?.enabled!==false}));
    if(Array.isArray(parsed.activity))base.activity=parsed.activity.filter(x=>x&&typeof x==='object').slice(0,300);
    if(Array.isArray(parsed.reviews))base.reviews=parsed.reviews.filter(x=>x&&typeof x==='object').slice(0,300);
    if(Number.isFinite(parsed.simulatedSpentToday)&&parsed.simulatedSpentToday>=0)base.simulatedSpentToday=parsed.simulatedSpentToday;
    return base;
  }
  base.simulatedSpentToday=180;
  for(const sc of SCENARIOS){
    const report=evaluateIntent(sc,base.policy,{spentToday:base.simulatedSpentToday,agentEnabled:true});
    const entry={id:uid(),at:new Date(Date.now()-(SCENARIOS.length-base.activity.length)*22*60*1000).toISOString(),scenario:sc.id,agentId:sc.agentId,sourceChain:sc.sourceChain,destinationChain:sc.destinationChain,recipient:sc.recipient,amount:Number(sc.amount),memo:sc.memo,origin:'sample',...report};
    base.activity.unshift(entry);
    if(report.decision==='REVIEW')base.reviews.unshift({id:uid(),entryId:entry.id,at:entry.at,status:'PENDING'});
  }
  return base;
}
let state=load();
let page='overview';
let selectedScenario='safe';
let formIntent={...SCENARIOS[0]};
let lastResult=null;
let auditFilter='ALL';
let menuOpen=false;
let notice='';
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{notice='Local storage unavailable; changes are session-only.';}}
function stats(){
  const actions=state.activity;
  return {total:actions.length,blocked:actions.filter(x=>x.decision==='BLOCK').length,review:state.reviews.filter(x=>x.status==='PENDING').length,allowed:actions.filter(x=>x.decision==='ALLOW').length,agents:state.agents.filter(x=>x.enabled).length};
}
function options(values,selected){return values.map(x=>`<option value="${esc(x)}" ${x===selected?'selected':''}>${esc(x)}</option>`).join('');}
function shell(){
 const s=stats();
 const [title,subtitle]=titles[page];
 return `<div class="layout">
  <aside class="sidebar ${menuOpen?'sidebar-open':''}" aria-label="Workspace navigation">
    <div class="brand"><span class="brand-mark">${icon('shield',23)}</span><div class="brand-name">Intent<span>Shield</span><small>AI FINANCIAL FIREWALL</small></div></div>
    <div class="workspace"><span class="workspace-icon">${icon('globe',19)}</span><div><strong>Security workspace</strong><small>Local sandbox environment</small></div><span class="workspace-arrow">${icon('chevron',16)}</span></div>
    <p class="nav-label">WORKSPACE</p><nav class="nav">${nav.map(([key,label,glyph])=>`<button class="nav-item ${page===key?'active':''}" data-action="nav" data-page="${key}" ${page===key?'aria-current="page"':''}>${icon(glyph,18)}<span>${label}</span>${key==='approvals'&&s.review?`<b>${s.review}</b>`:''}</button>`).join('')}</nav>
    <div class="sidebar-bottom"><div class="side-foot-card"><div class="side-foot-icon">${icon('lock',18)}</div><strong>Zero-cost sandbox</strong><p>Safe local evaluation. No wallet connections or live funds.</p><span class="foot-spark">${icon('check',13)} Execution disabled by design</span></div><div class="sidebar-profile"><span class="avatar">IS</span><div><strong>Demo operator</strong><small>Local administrator</small></div>${icon('settings',17)}</div></div>
  </aside><div class="main-wrap">
  <header class="topbar"><div class="crumb">Workspace <span>/</span> <strong>${esc(title)}</strong></div><div class="header-right"><span class="pulse"><i></i> LOCAL MODE</span><span class="topbar-divider"></span><a class="github-link" href="https://github.com/bearbaba/IntentShield" rel="noopener noreferrer" target="_blank" aria-label="Open GitHub project">GitHub ${icon('external',13)}</a><button class="mobile-menu icon-button" data-action="menu" aria-label="Toggle navigation">${icon('menu',20)}</button></div></header>
  <main class="main"><div class="page-head"><div><div class="overline"><span class="overline-line"></span> INTENT SECURITY PLATFORM <span class="small-dot">•</span> DEMO V1</div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${page==='overview'?`<button class="btn primary" data-action="nav" data-page="simulator">${icon('bolt',17)} Evaluate an intent ${icon('arrow',16)}</button>`:''}</div>
  <div class="safe-banner">${icon('info',16)} <span><strong>Simulation only.</strong> No wallet is connected. No signatures, deposits, transfers or swaps occur. Preloaded sample events are clearly marked.</span></div>
  ${page==='overview'?overview():page==='simulator'?simulator():page==='approvals'?approvals():page==='policies'?policies():page==='agents'?agents():audit()}
  <footer class="footer"><span>© IntentShield · Policy-first agent security</span><span>Built for NEAR Hackathon 2026 <span class="footer-separator">·</span> AI Security &amp; Defense</span></footer>
  </main></div></div><div class="toast" id="toast" role="status" aria-live="polite">${esc(notice)}</div>`;
}
function overview(){
 const s=stats(),total=Math.max(s.total,1),a=s.allowed/total*100,r=state.activity.filter(x=>x.decision==='REVIEW').length/total*100;
 return `<section class="hero card"><div class="hero-copy"><span class="hero-kicker">${icon('spark',15)} SECURING AUTONOMOUS FINANCE</span><h2>Give your agents freedom.<br/><em>Keep your funds protected.</em></h2><p>Deterministic policy checks for every proposed payment. Detect unusual activity, enforce spending limits, and route uncertain actions to human review.</p><div class="hero-actions"><button class="btn primary" data-action="nav" data-page="simulator">Launch simulator ${icon('arrow',16)}</button><button class="btn ghost-light" data-action="nav" data-page="policies">View policy rules ${icon('chevron',15)}</button></div></div><div class="hero-art"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit orbit-three"></div><div class="shield-plate">${icon('shield',82)}</div><div class="hero-float float-one">${icon('check',13)} POLICY VERIFIED</div><div class="hero-float float-two"><span></span> ACTIVE DEFENSE</div></div></section>
  <div class="metric-grid">
   ${metric('Protected agents',s.agents,'Agents enabled','users','violet')}
   ${metric('Total evaluations',s.total,'Includes sample events','bolt','cyan')}
   ${metric('Blocked proposals',s.blocked,'No money was moved','lock','rose')}
   ${metric('Awaiting review',s.review,'Manual action required','clock','amber')}
  </div>
  <div class="two-grid">
   <section class="card panel"><div class="panel-head"><div><h3>Decision distribution</h3><p>Policy outcomes · sample + local evaluations</p></div><span class="subtle-icon">${icon('sliders',18)}</span></div><div class="donut-row"><div class="donut" style="--allow:${a.toFixed(2)}%;--review:${(a+r).toFixed(2)}%"><div><strong>${s.total}</strong><small>evaluations</small></div></div><div class="donut-legend">${legend('Allowed',s.allowed,'#4bd6b0')}${legend('Review',state.activity.filter(x=>x.decision==='REVIEW').length,'#eec67e')}${legend('Blocked',s.blocked,'#ff7d96')}</div></div></section>
   <section class="card panel"><div class="panel-head"><div><h3>Active protection</h3><p>Enforced by the local policy engine</p></div><span class="live-tag"><i></i> ACTIVE</span></div><div class="protection-list">${[['Per-transaction limit',`${num(state.policy.perTransaction)} USDC`],['Daily spending ceiling',`${num(state.policy.dailyBudget)} USDC`],['Manual review starts at',`${num(state.policy.reviewAt)} USDC`],['Memo injection patterns',state.policy.blockInjection?'Enabled':'Disabled'],['Allowlist enforcement',state.policy.requireAllowlist?'Strict':'Monitor']].map(x=>`<div class="protection-row"><span class="mini-check">${icon('check',13)}</span><span>${esc(x[0])}</span><strong>${esc(x[1])}</strong></div>`).join('')}</div></section>
  </div><section class="card panel table-panel"><div class="panel-head"><div><h3>Recent activity</h3><p>Every outcome is inspectable and reproducible</p></div><button class="link-btn" data-action="nav" data-page="audit">View audit trail ${icon('arrow',15)}</button></div>${activityTable(state.activity.slice(0,5))}</section>
  <section class="scenario-strip"><div><span class="strip-kicker">TEST A SECURITY RULE</span><h3>See the firewall in action</h3><p>Try preconfigured safe, suspicious, and budget-breaking intents.</p></div><div class="scenario-buttons">${SCENARIOS.slice(0,3).map(x=>`<button class="scenario-shortcut" data-action="scenario" data-scenario="${x.id}">${esc(x.label)} ${icon('arrow',15)}</button>`).join('')}</div></section>`;
}
function metric(label,value,helper,glyph,color){return `<article class="card metric"><div class="metric-top"><span>${esc(label)}</span><span class="metric-icon ${color}">${icon(glyph,18)}</span></div><strong>${num(value).padStart?.(2,'0')||num(value)}</strong><small><span class="metric-tick">${icon('check',12)}</span>${esc(helper)}</small></article>`;}
function legend(label,count,color){return `<div class="legend-row"><span class="legend-color" style="background:${color}"></span><span>${label}</span><strong>${count}</strong></div>`;}
function activityTable(entries){
 if(!entries.length)return '<div class="empty">No evaluations yet. Open the simulator and run a scenario.</div>';
 return `<div class="table-scroller"><table><thead><tr><th>AGENT / SCENARIO</th><th>TRANSFER</th><th>AMOUNT</th><th>DECISION</th><th>RECORDED</th></tr></thead><tbody>${entries.map(e=>`<tr><td><div class="table-main">${esc(state.agents.find(a=>a.id===e.agentId)?.name||e.agentId||'Unknown')}</div><small>${e.origin==='sample'?'<span class="sample-label">SAMPLE</span> ':''}${esc(e.scenario||'Custom evaluation')}</small></td><td><div class="chain-flow">${esc(e.sourceChain||'–')} ${icon('arrow',12)} ${esc(e.destinationChain||'–')}</div><small title="${esc(e.recipient)}">${esc(short(e.recipient))}</small></td><td><strong>${num(e.amount)} <span class="unit">USDC</span></strong></td><td>${decisionPill(e.decision)}</td><td class="muted-date">${esc(date(e.at))}</td></tr>`).join('')}</tbody></table></div>`;
}
function simulator(){
 const sc=SCENARIOS.find(x=>x.id===selectedScenario)||SCENARIOS[0];
 return `<div class="sim-layout"><div class="sim-left"><section class="card panel"><div class="panel-head"><div><h3>Choose a test scenario</h3><p>Five reproducible cases with real rule evaluation</p></div>${icon('bolt',18)}</div><div class="scenario-list">${SCENARIOS.map(x=>`<button class="scenario-option ${x.id===selectedScenario?'selected':''}" data-action="scenario-inline" data-scenario="${x.id}"><span class="scenario-indicator ${x.id}">${icon(x.id==='safe'?'check':x.id==='review'||x.id==='unknown'?'clock':'alert',17)}</span><span><strong>${esc(x.label)}</strong><small>${esc(x.description)}</small></span>${icon('chevron',15)}</button>`).join('')}</div></section>
  <section class="card panel compact"><div class="panel-head"><div><h3>What gets checked?</h3><p>Rules cannot be overridden by agent prose</p></div></div><div class="check-stack">${[['Spending limits','Maximum per transaction and daily budget'],['Recipient verification','Format, local allowlist and denylist'],['Untrusted instructions','Known suspicious memo patterns'],['Agent permissions','Disabled agents are always blocked'],['Human review','Uncertain actions remain pending']].map(x=>`<div class="check-item"><span>${icon('check',13)}</span><div><strong>${x[0]}</strong><small>${x[1]}</small></div></div>`).join('')}</div></section></div>
  <div class="sim-right"><section class="card panel"><div class="panel-head"><div><h3>Transaction proposal</h3><p>Propose an intent — no funds will move</p></div><span class="neutral-tag">USDC ONLY</span></div><form id="intent-form" class="form-grid"><label class="field full"><span>Requesting agent</span><select name="agentId">${state.agents.map(a=>`<option value="${esc(a.id)}" ${formIntent.agentId===a.id?'selected':''}>${esc(a.name)}${a.enabled?'':' (disabled)'}</option>`).join('')}</select></label><label class="field"><span>Source chain</span><select name="sourceChain">${options(CHAINS,formIntent.sourceChain)}</select></label><label class="field"><span>Destination chain</span><select name="destinationChain">${options(CHAINS,formIntent.destinationChain)}</select></label><label class="field full"><span>Amount <small>USDC</small></span><div class="amount-input"><input name="amount" inputmode="decimal" type="number" min="0.000001" max="1000000000" step="0.000001" required value="${esc(formIntent.amount)}"/><b>USDC</b></div></label><label class="field full"><span>Recipient address</span><input type="text" name="recipient" required value="${esc(formIntent.recipient)}" spellcheck="false" placeholder="treasury.near" maxlength="100"/></label><label class="field full"><span>Memo / agent instruction <small>untrusted input</small></span><textarea name="memo" rows="3" maxlength="2000" placeholder="Describe this payment">${esc(formIntent.memo)}</textarea></label><div class="form-bottom"><span>${icon('lock',15)} No wallet signing or payment</span><button class="btn primary" type="submit">${icon('shield',16)} Run security check ${icon('arrow',16)}</button></div></form></section>
 ${lastResult?resultCard(lastResult):`<section class="card result-placeholder"><span class="placeholder-symbol">${icon('shield',36)}</span><h3>Ready to evaluate</h3><p>Run the security check to see the policy decision, risk score, and a detailed explanation of every triggered rule.</p><span>DETERMINISTIC • LOCAL • ZERO COST</span></section>`}</div></div>`;
}
function resultCard(e){
 const decision=e.decision;
 return `<section class="card panel result-panel ${decision.toLowerCase()}"><div class="panel-head"><div><h3>Security assessment</h3><p>Evaluated against policy v${esc(e.policyVersion)}</p></div>${decisionPill(decision)}</div><div class="result-summary"><div class="result-icon">${icon(decision==='ALLOW'?'check':decision==='REVIEW'?'clock':'x',31)}</div><div><h3>${decision==='ALLOW'?'Eligible under policy':decision==='REVIEW'?'Human approval required':'Transaction blocked'}</h3><p>${decision==='ALLOW'?'All configured checks passed. This is not permission to sign.':decision==='REVIEW'?'Proposal placed in local review queue. No execution was authorized.':'At least one blocking rule was triggered. No execution is possible in this demo.'}</p></div><div class="risk-circle"><strong>${esc(e.score)}</strong><small>/100</small></div></div><div class="risk-track"><span style="width:${e.score}%"></span></div><div class="findings-title">POLICY TRACE <span>${e.findings.length} CHECKS</span></div><div class="findings">${e.findings.map(f=>`<div class="finding"><span class="finding-icon ${f.severity.toLowerCase()}">${icon(f.severity==='BLOCK'?'x':f.severity==='REVIEW'?'alert':'check',14)}</span><div><strong>${esc(f.code.replaceAll('_',' '))}</strong><p>${esc(f.message)}</p></div><span class="finding-level ${f.severity.toLowerCase()}">${esc(f.severity)}</span></div>`).join('')}</div><div class="result-footer">${icon('info',14)} No on-chain verification, signature, or transfer occurred. <button class="link-btn" data-action="copy-result">${icon('copy',14)} Copy report</button></div></section>`;
}
function approvals(){
 const pending=state.reviews.filter(x=>x.status==='PENDING');
 const resolved=state.reviews.filter(x=>x.status!=='PENDING');
 return `<div class="approval-intro card"><span class="approval-big">${icon('clock',24)}</span><div><h3>${pending.length} request${pending.length===1?'':'s'} waiting for review</h3><p>Approving here updates a local queue only. Production use requires a separate signing-boundary authorization service.</p></div><button class="btn secondary" data-action="nav" data-page="simulator">Create evaluation ${icon('arrow',15)}</button></div>
 <section class="card panel"><div class="panel-head"><div><h3>Pending approvals</h3><p>Manual review of ambiguous policy outcomes</p></div><span class="counter-tag">${pending.length} OPEN</span></div>${pending.length?`<div class="approval-list">${pending.map(r=>approvalItem(r)).join('')}</div>`:`<div class="empty big-empty">${icon('check',34)}<h3>All clear</h3><p>There are no pending approval requests.</p></div>`}</section>
 ${resolved.length?`<section class="card panel section-gap"><div class="panel-head"><div><h3>Resolved requests</h3><p>Local decisions; no real transfers</p></div></div><div class="resolved-list">${resolved.map(r=>{const e=state.activity.find(a=>a.id===r.entryId);return `<div class="resolved-row"><span>${icon('file',16)}</span><strong>${esc(e?.agentId||'Agent')} · ${num(e?.amount)} USDC</strong><small>${esc(date(r.resolvedAt||r.at))}</small>${decisionPill(r.status)}</div>`}).join('')}</div></section>`:''}`;
}
function approvalItem(r){
 const e=state.activity.find(a=>a.id===r.entryId);if(!e)return '';
 return `<article class="approval-item"><div class="approval-first"><div><span class="request-id">REQUEST ${esc(r.id.slice(0,8).toUpperCase())} <span>· ${esc(e.origin==='sample'?'SAMPLE':'LOCAL')}</span></span><h3>${num(e.amount)} <small>USDC</small></h3><p>${esc(state.agents.find(a=>a.id===e.agentId)?.name||e.agentId)} · ${esc(e.sourceChain)} → ${esc(e.destinationChain)}</p></div><div class="approval-status">${decisionPill('REVIEW')}<span>Risk score ${e.score}/100</span></div></div><div class="approval-recipient">${icon('globe',15)} <strong>Recipient</strong> <code>${esc(short(e.recipient))}</code></div><div class="approval-reasons">${e.findings.filter(f=>f.severity==='REVIEW').map(f=>`<span>${icon('alert',13)} ${esc(f.message)}</span>`).join('')}</div><div class="approval-actions"><p>${icon('lock',14)} Approval is a local record, never a signature.</p><div><button class="btn reject" data-action="resolve" data-id="${esc(r.id)}" data-status="REJECTED">${icon('x',14)} Reject</button><button class="btn approve" data-action="resolve" data-id="${esc(r.id)}" data-status="APPROVED">${icon('check',14)} Approve locally</button></div></div></article>`;
}
function policies(){
 const p=state.policy;
 return `<div class="policy-layout"><section class="card panel"><div class="panel-head"><div><h3>Spending guardrails</h3><p>Rules are versioned and evaluated deterministically</p></div><span class="neutral-tag">POLICY V${p.version}</span></div><form id="policy-form"><div class="policy-form-grid"><label class="field"><span>Maximum per transaction</span><div class="amount-input"><input type="number" name="perTransaction" min="0.000001" step="0.000001" required value="${p.perTransaction}"/><b>USDC</b></div></label><label class="field"><span>Daily spending budget</span><div class="amount-input"><input type="number" name="dailyBudget" min="0.000001" step="0.000001" required value="${p.dailyBudget}"/><b>USDC</b></div></label><label class="field"><span>Manual review at / above</span><div class="amount-input"><input type="number" name="reviewAt" min="0.000001" step="0.000001" required value="${p.reviewAt}"/><b>USDC</b></div></label><label class="field"><span>Simulated spent today</span><div class="amount-input"><input type="number" name="simulatedSpentToday" min="0" step="0.000001" required value="${state.simulatedSpentToday}"/><b>USDC</b></div></label></div><div class="setting-group"><div class="setting-row"><div><strong>Strict recipient allowlist</strong><small>Block payments unless the address is approved</small></div><label class="switch"><input type="checkbox" name="requireAllowlist" ${p.requireAllowlist?'checked':''}/><span></span></label></div><div class="setting-row"><div><strong>Review cross-chain actions</strong><small>Require human review when origin and target chains differ</small></div><label class="switch"><input type="checkbox" name="reviewCrossChain" ${p.reviewCrossChain?'checked':''}/><span></span></label></div><div class="setting-row"><div><strong>Block known injection phrases</strong><small>Basic pattern screening, not a comprehensive AI defense</small></div><label class="switch"><input type="checkbox" name="blockInjection" ${p.blockInjection?'checked':''}/><span></span></label></div></div><div class="list-grid"><label class="field"><span>Approved recipients <small>one per line</small></span><textarea rows="5" name="allowlistedRecipients" spellcheck="false">${esc(p.allowlistedRecipients.join('\n'))}</textarea></label><label class="field"><span>Blocked recipients <small>one per line</small></span><textarea rows="5" name="blockedRecipients" spellcheck="false">${esc(p.blockedRecipients.join('\n'))}</textarea></label></div><p id="policy-error" class="form-error" role="alert"></p><div class="form-bottom"><span>${icon('info',15)} Saved only in this browser</span><button class="btn primary" type="submit">${icon('check',16)} Save policy changes</button></div></form></section>
 <aside class="policy-side"><section class="card panel"><span class="side-symbol">${icon('shield',26)}</span><h3>Fail-closed by default</h3><p>A denied or invalid transaction can never become allowed just because the agent writes persuasive instructions.</p><div class="side-divider"></div><div class="side-bullet">${icon('check',15)} Numeric limits checked first</div><div class="side-bullet">${icon('check',15)} Denylist takes precedence</div><div class="side-bullet">${icon('check',15)} Disabled agents blocked</div><div class="side-bullet">${icon('check',15)} Decisions produce rule traces</div></section><section class="card panel side-note"><h3>Production integration note</h3><p>Client-side enforcement is bypassable. A secure deployment must rerun policies inside a trusted service or smart-account signing boundary.</p><a href="https://docs.agentsonintents.com/" target="_blank" rel="noopener noreferrer">NEAR Intents documentation ${icon('external',14)}</a></section></aside></div>`;
}
function agents(){
 return `<div class="agents-summary card">${icon('users',21)} <div><strong>${stats().agents} of ${state.agents.length} agents enabled</strong><span>Disabling an agent automatically blocks all of its proposed intents.</span></div><button class="btn secondary" data-action="nav" data-page="simulator">Test agent ${icon('arrow',15)}</button></div><div class="agents-grid">${state.agents.map(a=>`<article class="card agent-card"><div class="agent-top"><span class="agent-avatar ${a.color}">${esc(a.initials)}</span><span class="agent-state ${a.enabled?'online':'offline'}"><i></i>${a.enabled?'Enabled':'Disabled'}</span></div><h3>${esc(a.name)}</h3><p>${esc(a.role)}</p><div class="agent-facts"><div><span>Default network</span><strong>${esc(a.chain)}</strong></div><div><span>Policy</span><strong>Global v${state.policy.version}</strong></div><div><span>Max spend / tx</span><strong>${num(state.policy.perTransaction)} USDC</strong></div></div><div class="agent-footer"><span>${icon('lock',14)} Policy enforced</span><button class="btn ${a.enabled?'secondary':'approve'}" data-action="toggle-agent" data-id="${esc(a.id)}">${a.enabled?'Disable agent':'Enable agent'}</button></div></article>`).join('')}</div>`;
}
function audit(){
 const list=auditFilter==='ALL'?state.activity:state.activity.filter(x=>x.decision===auditFilter);
 return `<section class="card panel"><div class="panel-head audit-head"><div><h3>Evaluation history</h3><p>Local browser records, including explicitly labeled sample entries</p></div><div class="audit-actions"><button class="btn secondary" data-action="export">${icon('download',15)} Export JSON</button><button class="btn secondary" data-action="reset">${icon('refresh',15)} Reset demo</button></div></div><div class="audit-filters">${['ALL','ALLOW','REVIEW','BLOCK'].map(k=>`<button class="filter-tab ${auditFilter===k?'selected':''}" data-action="audit-filter" data-filter="${k}">${k==='ALL'?'All outcomes':k}</button>`).join('')}<span>${list.length} records</span></div>${activityTable(list)}<div class="audit-foot">${icon('info',15)} Browser storage is editable and not an immutable security ledger. Export records for independent inspection.</div></section>`;
}
function persistIntent(form){
 const data=new FormData(form);
 formIntent={agentId:String(data.get('agentId')),sourceChain:String(data.get('sourceChain')),destinationChain:String(data.get('destinationChain')),amount:String(data.get('amount')),recipient:String(data.get('recipient')),memo:String(data.get('memo'))};
 const agent=state.agents.find(a=>a.id===formIntent.agentId);
 const report=evaluateIntent(formIntent,state.policy,{agentEnabled:agent?.enabled===true,spentToday:state.simulatedSpentToday});
 const entry={id:uid(),at:report.evaluatedAt,origin:'user',scenario:selectedScenario,agentId:formIntent.agentId,sourceChain:formIntent.sourceChain,destinationChain:formIntent.destinationChain,amount:Number(formIntent.amount),recipient:formIntent.recipient,memo:formIntent.memo,...report};
 state.activity.unshift(entry);state.activity=state.activity.slice(0,300);
 if(entry.decision==='REVIEW')state.reviews.unshift({id:uid(),entryId:entry.id,at:entry.at,status:'PENDING'});
 state.reviews=state.reviews.slice(0,300);
 lastResult=entry;save();notice=`${entry.decision}: Policy evaluation completed without moving funds.`;
 render();
}
function savePolicy(form){
 const data=new FormData(form);
 const candidate={...state.policy,perTransaction:Number(data.get('perTransaction')),dailyBudget:Number(data.get('dailyBudget')),reviewAt:Number(data.get('reviewAt')),requireAllowlist:data.has('requireAllowlist'),reviewCrossChain:data.has('reviewCrossChain'),blockInjection:data.has('blockInjection'),allowlistedRecipients:String(data.get('allowlistedRecipients')).split(/\r?\n/).map(s=>s.trim()).filter(Boolean).slice(0,100),blockedRecipients:String(data.get('blockedRecipients')).split(/\r?\n/).map(s=>s.trim()).filter(Boolean).slice(0,100),version:state.policy.version+1};
 const spent=Number(data.get('simulatedSpentToday'));
 const check=validatePolicy(candidate);
 if(!check.ok||!Number.isFinite(spent)||spent<0||Math.round(spent*1e6)/1e6!==spent){$('#policy-error').textContent=check.ok?'Simulated daily spend must be a nonnegative amount with at most six decimals.':check.error;return;}
 state.policy=candidate;state.simulatedSpentToday=spent;lastResult=null;save();notice=`Policy v${candidate.version} saved locally.`;render();
}
function downloadJSON(data,filename){
 const link=document.createElement('a');const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);
 link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function render(){
 $('#app').innerHTML=shell();
 const toast=$('#toast');if(notice){toast.classList.add('show');setTimeout(()=>toast?.classList.remove('show'),3600);notice='';}
}
function action(btn){
 const action=btn.dataset.action;
 if(action==='nav'){page=btn.dataset.page;menuOpen=false;lastResult=page==='simulator'?lastResult:null;render();scrollTo(0,0);}
 if(action==='menu'){menuOpen=!menuOpen;render();}
 if(action==='scenario'||action==='scenario-inline'){selectedScenario=btn.dataset.scenario;formIntent={...SCENARIOS.find(x=>x.id===selectedScenario)};lastResult=null;page='simulator';menuOpen=false;render();if(action==='scenario')scrollTo(0,0);}
 if(action==='audit-filter'){auditFilter=btn.dataset.filter;render();}
 if(action==='toggle-agent'){const agent=state.agents.find(a=>a.id===btn.dataset.id);if(!agent)return;agent.enabled=!agent.enabled;save();notice=`${agent.name} ${agent.enabled?'enabled':'disabled'}.`;render();}
 if(action==='resolve'){
  const review=state.reviews.find(r=>r.id===btn.dataset.id);if(!review||review.status!=='PENDING')return;
  review.status=btn.dataset.status;review.resolvedAt=new Date().toISOString();review.note='Local operator decision only; no signature or payment.';
  save();notice=`Marked ${review.status.toLowerCase()} locally. No transfer occurred.`;render();
 }
 if(action==='copy-result'&&lastResult){navigator.clipboard?.writeText(JSON.stringify(lastResult,null,2)).then(()=>{notice='Copied evaluation report.';render();}).catch(()=>{notice='Clipboard unavailable. Use Audit → Export JSON.';render();});}
 if(action==='export'){downloadJSON({product:'IntentShield',mode:'offline simulation',exportedAt:new Date().toISOString(),policy:state.policy,agents:state.agents,simulatedSpentToday:state.simulatedSpentToday,activity:state.activity,reviews:state.reviews},'intentshield-audit.json');notice='Audit JSON exported.';render();}
 if(action==='reset'){
  if(!confirm('Reset policy, demo events, and local review history in this browser?'))return;
  localStorage.removeItem(STORAGE_KEY);state=load();lastResult=null;selectedScenario='safe';formIntent={...SCENARIOS[0]};auditFilter='ALL';save();notice='Sandbox reset to default sample data.';render();
 }
}
document.addEventListener('click',e=>{const btn=e.target.closest('[data-action]');if(btn){e.preventDefault();action(btn);}});
document.addEventListener('submit',e=>{
 if(e.target.id==='intent-form'){e.preventDefault();persistIntent(e.target);}
 if(e.target.id==='policy-form'){e.preventDefault();savePolicy(e.target);}
});
save();render();
