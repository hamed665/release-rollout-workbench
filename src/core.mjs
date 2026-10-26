import {requireValue,record,identifier,boundedArray} from './validation.mjs';

export function hash32(value) {
  // FNV-1a over UTF-8. Deterministic bucketing; not a security primitive.
  let hash=2166136261;
  for(const byte of new TextEncoder().encode(value)) hash=Math.imul(hash^byte,16777619)>>>0;
  return hash;
}
export function validateConfig(config) {
  requireValue(record(config)&&identifier(config.key)&&typeof config.salt==='string'&&config.salt.length>=8,'key and salt of at least 8 characters required');
  requireValue(Number.isInteger(config.rollout_bps)&&config.rollout_bps>=0&&config.rollout_bps<=10000,'rollout_bps must be 0–10000');
  requireValue(config.enabled===undefined||typeof config.enabled==='boolean','invalid enabled flag');
  boundedArray(config.variants,'variants',20);
  requireValue(config.variants.length>=2,'at least two variants required');
  const ids=new Set();let total=0;
  for(const variant of config.variants) {
    requireValue(record(variant)&&identifier(variant.name)&&!ids.has(variant.name),'unique variant names required');
    requireValue(Number.isInteger(variant.weight_bps)&&variant.weight_bps>0,'positive integer variant weight required');
    ids.add(variant.name); total+=variant.weight_bps;
  }
  requireValue(total===10000,'variant weights must total 10000');
  return config;
}
export function assign(subject,config) {
  validateConfig(config);
  requireValue(identifier(subject),'pseudonymous subject identifier required');
  const namespace=JSON.stringify([config.key,config.salt,subject]);
  const rolloutBucket=hash32(namespace+':rollout')%10000;
  const variantBucket=hash32(namespace+':variant')%10000;
  if(config.enabled===false) return {subject,status:'disabled',variant:null,rollout_bucket:rolloutBucket,variant_bucket:variantBucket};
  if(rolloutBucket>=config.rollout_bps) return {subject,status:'holdout',variant:null,rollout_bucket:rolloutBucket,variant_bucket:variantBucket};
  let boundary=0;
  for(const variant of config.variants) {
    boundary+=variant.weight_bps;
    if(variantBucket<boundary) return {subject,status:'assigned',variant:variant.name,rollout_bucket:rolloutBucket,variant_bucket:variantBucket};
  }
  throw new Error('unreachable assignment boundary');
}
export function analyze(input) {
  requireValue(record(input),'object input required');
  validateConfig(input.config); boundedArray(input.subjects,'subjects');
  requireValue(new Set(input.subjects).size===input.subjects.length,'duplicate subjects would distort counts');
  const rows=input.subjects.map(s=>assign(s,input.config));
  const distribution=Object.fromEntries(input.config.variants.map(v=>[v.name,rows.filter(r=>r.variant===v.name).length]));
  return {summary:[{label:'Subjects',value:rows.length},{label:'Exposed',value:rows.filter(r=>r.status==='assigned').length},{label:'Rollout',value:input.config.rollout_bps/100+'%'}],
    note:'Assignments are deterministic. Increasing rollout preserves the variant of already-exposed subjects when key, salt and weights are unchanged. This is not a significance test.',
    columns:['subject','status','variant','rollout_bucket','variant_bucket'],rows,distribution};
}
