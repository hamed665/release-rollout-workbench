import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sample=JSON.parse(readFileSync(new URL('../examples/input.json',import.meta.url)));

import {assign,analyze,hash32} from '../src/core.mjs';
test('known FNV1a vector',()=>assert.equal(hash32('hello'),1335831723));
test('stable deterministic assignment',()=>assert.deepEqual(assign('subject',sample.config),assign('subject',structuredClone(sample.config))));
test('zero rollout holds everyone out',()=>assert.equal(analyze({...sample,config:{...sample.config,rollout_bps:0}}).summary[1].value,0));
test('full rollout assigns everyone',()=>assert.equal(analyze({...sample,config:{...sample.config,rollout_bps:10000}}).summary[1].value,sample.subjects.length));
test('kill switch disables exposure',()=>assert.equal(assign('subject',{...sample.config,enabled:false}).status,'disabled'));
test('rollout increase preserves exposed variants',()=>{
  for(let i=0;i<1000;i++) {
    const a=assign('user-'+i,{...sample.config,rollout_bps:3000});
    const b=assign('user-'+i,{...sample.config,rollout_bps:8000});
    if(a.status==='assigned') assert.equal(a.variant,b.variant);
  }
});
test('weights must total 10000',()=>assert.throws(()=>assign('user',{...sample.config,variants:[{name:'a',weight_bps:1},{name:'b',weight_bps:1}]}),/total/));
test('duplicate subjects rejected',()=>assert.throws(()=>analyze({...sample,subjects:['a','a']}),/duplicate/));
