import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState,evaluateIntent,SCENARIOS,validAddress,validatePolicy} from '../src/engine.js';
const base=createInitialState();
const check=(name,override={},context={})=>{
 const scenario=SCENARIOS.find(x=>x.id===name);
 return evaluateIntent({...scenario,...override},base.policy,{spentToday:180,agentEnabled:true,...context});
};
test('safe known recipient allowed',()=>assert.equal(check('safe').decision,'ALLOW'));
test('human review threshold triggers review, not auto execution',()=>assert.equal(check('review').decision,'REVIEW'));
test('per-tx overspend blocked',()=>assert.equal(check('limit').decision,'BLOCK'));
test('prompt injection pattern blocked',()=>assert.ok(check('injection').findings.some(f=>f.code==='SUSPICIOUS_INSTRUCTION')));
test('unrecognized address requires review',()=>assert.equal(check('unknown').decision,'REVIEW'));
test('approved low-value transfer allowed under normal context',()=>assert.equal(check('safe',{}, {spentToday:180,agentEnabled:true}).decision,'ALLOW'));
test('disabled agent fails closed',()=>assert.equal(check('safe',{}, {agentEnabled:false}).decision,'BLOCK'));
test('daily budget enforced',()=>assert.equal(check('review',{}, {spentToday:700}).decision,'BLOCK'));
test('invalid address is blocked',()=>assert.equal(check('safe',{recipient:'invalid..near'}).decision,'BLOCK'));
test('zero, negative and NaN amounts blocked',()=>{for(const amount of [0,-1,NaN,'foo']) assert.equal(check('safe',{amount}).decision,'BLOCK')});
test('unknown chain blocked',()=>assert.equal(check('safe',{destinationChain:'Polygon'}).decision,'BLOCK'));
test('policy validation fails closed',()=>{
 const result=evaluateIntent(SCENARIOS[0],{...base.policy,reviewAt:9999},{spentToday:0});
 assert.equal(result.decision,'BLOCK');
 assert.equal(validatePolicy({...base.policy,reviewAt:9999}).ok,false);
});
test('must not accept malformed zero EVM address',()=>assert.equal(validAddress('Base','0x'+'0'.repeat(40)),false));
test('cross-chain requires review by default',()=>assert.equal(check('safe',{destinationChain:'Base',recipient:'0x1111111111111111111111111111111111111111'}).decision,'REVIEW'));
test('allowlist required turns unknown recipient into block',()=>{
 const policy={...base.policy,requireAllowlist:true};
 assert.equal(evaluateIntent(SCENARIOS[4],policy,{spentToday:0,agentEnabled:true}).decision,'BLOCK');
});
test('denylist is blocking even below threshold',()=>{
 const policy={...base.policy,blockedRecipients:['treasury.near']};
 assert.equal(evaluateIntent(SCENARIOS[0],policy,{spentToday:0,agentEnabled:true}).decision,'BLOCK');
});

test('missing agent authorization is blocked',()=>assert.equal(evaluateIntent(SCENARIOS[0],base.policy,{spentToday:0}).decision,'BLOCK'));
test('invalid spend context fails closed',()=>assert.equal(check('safe',{}, {spentToday:NaN}).decision,'BLOCK'));
test('null policy fails closed without throwing',()=>assert.equal(evaluateIntent(SCENARIOS[0],null,{spentToday:0,agentEnabled:true}).decision,'BLOCK'));
test('malformed policy lists fail closed without throwing',()=>assert.equal(evaluateIntent(SCENARIOS[0],{...base.policy,blockedRecipients:'bad'}, {spentToday:0,agentEnabled:true}).decision,'BLOCK'));
test('Solana address comparisons preserve case',()=>{const addr='11111111111111111111111111111112'; const policy={...base.policy,allowlistedRecipients:[addr],blockedRecipients:[addr.toLowerCase().replace('2','3')],requireAllowlist:true};assert.equal(evaluateIntent({...SCENARIOS[0],sourceChain:'Solana',destinationChain:'Solana',recipient:addr},policy,{spentToday:0,agentEnabled:true}).decision,'ALLOW');});

// v2 hardening: stale approvals must not be convertible to local APPROVED status.
import {checkReviewFreshness,explainControls} from '../src/engine.js';
const snapshot=p=>({perTransaction:p.perTransaction,dailyBudget:p.dailyBudget,reviewAt:p.reviewAt,requireAllowlist:p.requireAllowlist,reviewCrossChain:p.reviewCrossChain,blockInjection:p.blockInjection,allowlistedRecipients:[...p.allowlistedRecipients],blockedRecipients:[...p.blockedRecipients]});
function pendingReview(){const original=SCENARIOS.find(x=>x.id==='review');const report=check('review');return [{...original,amount:125,policySnapshot:snapshot(base.policy),...report},{status:'PENDING'}];}
test('newly evaluated pending request is locally approvable with unchanged policy',()=>{const [entry,review]=pendingReview();assert.equal(checkReviewFreshness(entry,review,base.policy,true,180).ok,true)});
test('changing policy version invalidates pending local review',()=>{const [entry,review]=pendingReview();const outcome=checkReviewFreshness(entry,review,{...base.policy,version:2},true,180);assert.equal(outcome.ok,false);assert.match(outcome.reason,/Policy changed/)});
test('disabling agent invalidates pending local review',()=>{const [entry,review]=pendingReview();assert.equal(checkReviewFreshness(entry,review,base.policy,false,180).ok,false)});
test('changing daily spending baseline invalidates pending review if it now blocks',()=>{const [entry,review]=pendingReview();assert.equal(checkReviewFreshness(entry,review,base.policy,true,720).ok,false)});
test('policy mutation without version increment is detected',()=>{const [entry,review]=pendingReview();assert.equal(checkReviewFreshness(entry,review,{...base.policy,perTransaction:200},true,180).ok,false)});
test('a missing snapshot fails closed instead of approving legacy entries',()=>{const [entry,review]=pendingReview();delete entry.policySnapshot;assert.equal(checkReviewFreshness(entry,review,base.policy,true,180).ok,false)});
test('already resolved review cannot be approved a second time',()=>{const [entry,review]=pendingReview();review.status='APPROVED';assert.equal(checkReviewFreshness(entry,review,base.policy,true,180).ok,false)});
test('explainable controls derive block and review from engine findings',()=>{const block=explainControls(check('injection'));assert.equal(block.find(x=>x.id==='instruction').status,'BLOCK');const review=explainControls(check('review'));assert.equal(review.find(x=>x.id==='limits').status,'REVIEW');});
test('tampered policy booleans or versions are invalid and fail closed',()=>{const bad={...base.policy,blockInjection:'false'};assert.equal(validatePolicy(bad).ok,false);assert.equal(evaluateIntent(SCENARIOS[0],bad,{spentToday:0,agentEnabled:true}).decision,'BLOCK');assert.equal(validatePolicy({...base.policy,version:0}).ok,false)});
test('blocklist has precedence over allowlist when address appears in both',()=>{const policy={...base.policy,blockedRecipients:['treasury.near'],allowlistedRecipients:['treasury.near']};assert.equal(evaluateIntent(SCENARIOS[0],policy,{spentToday:0,agentEnabled:true}).decision,'BLOCK')});

// Security regressions: micro-USDC budgets, NEAR account formats and stale reviews.
test('micro-USDC amounts cannot slip past the daily budget through cent rounding',()=>{
 const nearLimit=check('safe',{amount:0.000002},{spentToday:749.999999});
 assert.equal(nearLimit.decision,'BLOCK');
 assert.ok(nearLimit.findings.some(f=>f.code==='DAILY_LIMIT'));
 const exactlyAt=check('safe',{amount:0.000001},{spentToday:749.999999});
 assert.equal(exactlyAt.decision,'ALLOW');
});
test('NEAR account validation accepts implicit hex and nested named accounts',()=>{
 assert.equal(validAddress('NEAR','a'.repeat(64)),true);
 assert.equal(validAddress('NEAR','app.team.near'),true);
 assert.equal(validAddress('NEAR','team.example'),true);
 assert.equal(validAddress('NEAR','invalid..near'),false);
 assert.equal(validAddress('NEAR','A'.repeat(64)),false);
});
test('review becomes stale if daily spend context changes even without a different verdict',()=>{
 const [entry,review]=pendingReview();
 const gate=checkReviewFreshness(entry,review,base.policy,true,181);
 assert.equal(gate.ok,false);
 assert.match(gate.reason,/daily spending context changed/i);
});
test('excessively large financial context is rejected rather than losing precision',()=>{
 assert.equal(validatePolicy({...base.policy,dailyBudget:1_000_000_001}).ok,false);
 assert.equal(check('safe',{}, {spentToday:1_000_000_001}).decision,'BLOCK');
});
