import test from 'node:test';
import assert from 'node:assert/strict';

test('workspace renders and its navigation/agent controls update the UI', async ()=>{
  const root={innerHTML:''};
  const toast={classList:{add(){},remove(){}}};
  const handlers={};
  const saved=new Map();
  globalThis.localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
  globalThis.document={querySelector:s=>s==='#app'?root:s==='#toast'?toast:null,addEventListener:(name,fn)=>handlers[name]=fn};
  globalThis.scrollTo=()=>{};
  await import('../src/app.js');
  assert.match(root.innerHTML,/Security overview/);
  assert.match(root.innerHTML,/Simulation only/);
  assert.match(root.innerHTML,/SAMPLE/);
  function click(action, data={}){
    const btn={dataset:{action,...data}};
    handlers.click({target:{closest:()=>btn},preventDefault(){}});
  }
  click('nav',{page:'simulator'});
  assert.match(root.innerHTML,/Transaction proposal/);
  assert.match(root.innerHTML,/Prompt injection/);
  click('scenario-inline',{scenario:'injection'});
  assert.match(root.innerHTML,/Ignore previous instructions/);
  click('nav',{page:'agents'});
  assert.match(root.innerHTML,/Agent registry/);
  click('toggle-agent',{id:'treasury'});
  assert.match(root.innerHTML,/Disabled/);
  const persisted=JSON.parse(saved.get('intentshield:v1'));
  assert.equal(persisted.agents.find(a=>a.id==='treasury').enabled,false);
  click('nav',{page:'approvals'});
  assert.match(root.innerHTML,/Pending approvals/);
  click('nav',{page:'audit'});
  assert.match(root.innerHTML,/Evaluation history/);
});
