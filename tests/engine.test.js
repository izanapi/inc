import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,newTarget,setTuner,step,purge,frequency,rank,DURATION} from '../dist/engine.js';

test('fresh session starts with a valid moving signal',()=>{const s=createState(()=>.5);assert.equal(s.time,DURATION);assert.ok(s.target.frequency>0&&s.target.frequency<1);assert.equal(s.score,0);});
test('tuner stays inside the playable band',()=>{const s=createState();setTuner(s,-5);assert.equal(s.tuner,.03);setTuner(s,4);assert.equal(s.tuner,.97);});
test('holding the tuner on target captures a transmission',()=>{const s=createState(()=>.5);s.target.frequency=s.tuner;s.target.drift=0;for(let i=0;i<30&&!s.captures;i++)step(s,.1,()=>.5);assert.equal(s.captures,1);assert.ok(s.score>=600);assert.match(s.message,/[^\[]/);});
test('missing a target does not build lock',()=>{const s=createState(()=>.5);s.target.frequency=.9;s.tuner=.1;for(let i=0;i<20;i++)step(s,.1,()=>.5);assert.equal(s.lock,0);assert.equal(s.captures,0);});
test('purge clears interference, breaks combo and has cooldown',()=>{const s=createState();s.noise=.8;s.lock=.8;s.combo=4;assert.equal(purge(s),true);assert.ok(s.noise<.5);assert.ok(s.lock<.4);assert.equal(s.combo,0);assert.equal(purge(s),false);for(let i=0;i<111;i++)step(s,.1);assert.equal(s.purge,1);});
test('session ends and severe interference accelerates the clock',()=>{const s=createState();s.time=1;s.noise=1;step(s,.1);assert.equal(s.running,false);assert.equal(s.event.type,'end');});
test('frequency labels and ranks map to their boundaries',()=>{assert.equal(frequency(0),'2.400');assert.equal(frequency(1),'9.600');assert.equal(rank(2999),'D');assert.equal(rank(3000),'C');assert.equal(rank(18000),'S');});
test('rare signal chance grows but stays bounded',()=>{assert.equal(newTarget(()=>0,0).rare,true);assert.equal(newTarget(()=>.99,1000).rare,false);});
