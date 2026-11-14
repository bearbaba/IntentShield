import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENARIOS,createInitialState,evaluateIntent} from '../src/engine.js';

test('legacy approval recovery, new evaluation, local approval, and policy-change fail-closed', async ()=>{
  const data=new Map();
  const base=createInitialState();
  base.simulatedSpentToday=180;
  for (const [i,scenario] of SCENARIOS.entries()) {
    const decision=evaluateIntent(scenario,base.policy,{agentEnabled:true,spentToday:180});
    const entry={...scenario,id:`legacy-event-${i}`,at:decision.evaluatedAt,origin:'sample',amount:Number(scenario.amount),...decision};
    base.activity.unshift(entry); // Legacy entries intentionally have no policySnapshot.
    if(decision.decision==='REVIEW')base.reviews.unshift({id:`legacy-review-${i}`,entryId:entry.id,at:entry.at,status:'PENDING'});
  }
  delete base.simulatedSpentToday; // Also cover a stale schema missing the spend field.
  data.set('intentshield:v1', JSON.stringify(base));
  const root={innerHTML:''};
  const toast={classList:{add(){},remove(){}}};
  const handlers={};
  globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  globalThis.document={querySelector:s=>s==='#app'?root:s==='#toast'?toast:null,addEventListener:(event,fn)=>{handlers[event]=fn}};
  globalThis.scrollTo=()=>{};
  globalThis.FormData=class {
    constructor(form){this.values=form.values||{}}
    get(key){return this.values[key]??null}
    has(key){return Object.prototype.hasOwnProperty.call(this.values,key)}
  };
  await import('../src/app.js');
  const click=(action,params={})=>handlers.click({target:{closest:()=>({dataset:{action,...params}})},preventDefault(){}});
  const stored=()=>JSON.parse(data.get('intentshield:v1'));
  assert.equal(stored().simulatedSpentToday,180);
  click('nav',{page:'approvals'});
  assert.match(root.innerHTML,/Re-evaluate/);
  assert.match(root.innerHTML,/outdated evidence/);
  const legacyId=stored().reviews[0].id;
  click('reevaluate',{id:legacyId});
  let state=stored();
  assert.equal(state.reviews.find(r=>r.id===legacyId).status,'SUPERSEDED');
  assert.ok(state.reviews[0].id!==legacyId && state.reviews[0].status==='PENDING');
  assert.equal(state.activity[0].decision,'REVIEW');
  assert.equal(state.activity[0].origin,'user');
  assert.ok(state.activity[0].policySnapshot);
  assert.equal(state.activity[0].reevaluatedFrom,state.reviews.find(r=>r.id===legacyId).entryId);
  assert.match(root.innerHTML,/Fresh policy evidence/);
  // A new local evaluation must enter the real queue, not merely change the screen.
  click('nav',{page:'simulator'});
  const form={id:'intent-form',values:{...SCENARIOS.find(s=>s.id==='review'),amount:'125'}};
  handlers.submit({target:form,preventDefault(){}});
  state=stored();
  const created=state.reviews[0];
  assert.equal(state.activity[0].decision,'REVIEW');
  assert.equal(state.activity[0].origin,'user');
  assert.equal(created.status,'PENDING');
  click('nav',{page:'approvals'});
  assert.match(root.innerHTML,/LOCAL/);
  click('resolve',{id:created.id,status:'APPROVED'});
  state=stored();
  assert.equal(state.reviews.find(r=>r.id===created.id).status,'APPROVED');
  assert.match(state.reviews.find(r=>r.id===created.id).note,/no signature or payment/i);
  // Change the policy without resetting any records; stale review must become a BLOCK.
  const waitingId=state.reviews.find(r=>r.status==='PENDING'&&state.activity.find(e=>e.id===r.entryId)?.amount===125).id;
  // Apply a tighter real policy through the app's own form handler.
  const policyForm={id:'policy-form',values:{perTransaction:50,dailyBudget:750,reviewAt:25,simulatedSpentToday:180,allowlistedRecipients:state.policy.allowlistedRecipients.join('\n'),blockedRecipients:state.policy.blockedRecipients.join('\n'),reviewCrossChain:'on',blockInjection:'on'}};
  globalThis.document.querySelector=(s)=>s==='#app'?root:s==='#toast'?toast:s==='#policy-error'?{textContent:''}:null;
  handlers.submit({target:policyForm,preventDefault(){}});
  click('nav',{page:'approvals'});
  assert.match(root.innerHTML,/Re-evaluate/);
  click('reevaluate',{id:waitingId});
  state=stored();
  assert.equal(state.activity[0].decision,'BLOCK');
  assert.equal(state.reviews.find(r=>r.id===waitingId).status,'SUPERSEDED');
  assert.ok(!state.reviews.some(r=>r.entryId===state.activity[0].id));
  assert.ok(!state.reviews.some(r=>r.entryId===state.activity[0].id && r.status==='APPROVED'));
  click('demo-review');
  state=stored();
  assert.equal(state.activity[0].decision,'BLOCK'); // Demo never fabricates a REVIEW against a blocking policy.
});
