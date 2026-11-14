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
test('denylist overrides allowlist',()=>assert.equal(check('safe',{}, {spentToday:180,agentEnabled:true}).decision,'ALLOW'));
test('disabled agent fails closed',()=>assert.equal(check('safe',{}, {agentEnabled:false}).decision,'BLOCK'));
test('daily budget enforced',()=>assert.equal(check('review',{}, {spentToday:700}).decision,'BLOCK'));
test('invalid address is blocked',()=>assert.equal(check('safe',{recipient:'garbage'}).decision,'BLOCK'));
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
