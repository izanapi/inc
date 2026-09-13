import {createState,setTuner,step,purge,frequency,rank} from './engine.js';

const $=selector=>document.querySelector(selector);
const canvas=$('#scope'),ctx=canvas.getContext('2d',{alpha:false});
const els={time:$('#time'),score:$('#score'),frequency:$('#frequency'),lock:$('#lock-bar'),lockLabel:$('#lock-label'),noise:$('#noise-bar'),message:$('#message'),purge:$('#purge'),overlay:$('#overlay'),result:$('#result'),rank:$('#rank'),finalScore:$('#final-score'),finalSignals:$('#final-signals'),best:$('#best'),verdict:$('#verdict'),sound:$('#sound')};
let state=createState(),playing=false,last=performance.now(),audio=null,soundOn=true,stars=[];

function resize(){
  const dpr=Math.min(devicePixelRatio||1,2),w=innerWidth,h=innerHeight;canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
  stars=Array.from({length:60},()=>({x:Math.random(),y:Math.random(),a:Math.random()}));
}
addEventListener('resize',resize);resize();

function initAudio(){
  if(audio)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  const ac=new AC(),master=ac.createGain(),filter=ac.createBiquadFilter();master.gain.value=.15;filter.type='bandpass';filter.Q.value=7;filter.frequency.value=1200;filter.connect(master).connect(ac.destination);
  const buffer=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  const noise=ac.createBufferSource();noise.buffer=buffer;noise.loop=true;const ng=ac.createGain();ng.gain.value=.055;noise.connect(ng).connect(filter);noise.start();
  const osc=ac.createOscillator(),og=ac.createGain();osc.type='sine';og.gain.value=.035;osc.connect(og).connect(master);osc.start();audio={ac,master,filter,osc,og};
}
function audioUpdate(){if(!audio)return;const now=audio.ac.currentTime;audio.filter.frequency.setTargetAtTime(300+state.tuner*3300,now,.04);audio.osc.frequency.setTargetAtTime(70+state.tuner*210+(state.lock>.2?state.lock*80:0),now,.04);audio.master.gain.setTargetAtTime(soundOn?(playing?.13:.03):0,now,.05);}
function ping(rare=false){if(!audio||!soundOn)return;const now=audio.ac.currentTime;[0,rare?7:12,rare?12:19].forEach((semi,i)=>{const o=audio.ac.createOscillator(),g=audio.ac.createGain();o.type=rare?'triangle':'sine';o.frequency.value=220*2**(semi/12);g.gain.setValueAtTime(.0001,now+i*.08);g.gain.exponentialRampToValueAtTime(.16,now+i*.08+.012);g.gain.exponentialRampToValueAtTime(.0001,now+i*.08+.55);o.connect(g).connect(audio.master);o.start(now+i*.08);o.stop(now+i*.08+.6);});}

function start(){state=createState();playing=true;last=performance.now();els.overlay.classList.remove('open');els.result.classList.remove('open');initAudio();audio?.ac.resume();updateHud();}
$('#start').onclick=start;$('#restart').onclick=start;
els.sound.onclick=()=>{soundOn=!soundOn;els.sound.querySelector('b').textContent=soundOn?'ON':'OFF';audioUpdate();};
els.purge.onclick=()=>{if(purge(state)){noiseBurst();updateHud();}};

function tune(clientX){if(!playing)return;const edge=Math.max(20,innerWidth*.06);setTuner(state,(clientX-edge)/(innerWidth-edge*2));}
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);tune(e.clientX);});
canvas.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch')tune(e.clientX);});
addEventListener('keydown',e=>{if(!playing)return;if(e.code==='ArrowLeft'||e.code==='ArrowRight'){e.preventDefault();setTuner(state,state.tuner+(e.code==='ArrowLeft'?-.012:.012));}if(e.code==='Space'){e.preventDefault();if(purge(state))noiseBurst();}});

function noiseBurst(){document.body.classList.add('captured');setTimeout(()=>document.body.classList.remove('captured'),360);if(audio&&soundOn){const o=audio.ac.createOscillator(),g=audio.ac.createGain(),n=audio.ac.currentTime;o.type='sawtooth';o.frequency.setValueAtTime(90,n);o.frequency.exponentialRampToValueAtTime(1200,n+.12);g.gain.setValueAtTime(.08,n);g.gain.exponentialRampToValueAtTime(.0001,n+.18);o.connect(g).connect(audio.master);o.start();o.stop(n+.2);}}
function captured(event){document.body.classList.remove('captured');void document.body.offsetWidth;document.body.classList.add('captured');setTimeout(()=>document.body.classList.remove('captured'),360);ping(event.rare);}
function finish(){playing=false;const best=Math.max(Number(localStorage.getItem('dead-air-best')||0),state.score);try{localStorage.setItem('dead-air-best',best)}catch{}const r=rank(state.score);els.rank.textContent=`RANK ${r}`;els.finalScore.textContent=state.score.toLocaleString('en-US');els.finalSignals.textContent=state.captures;els.best.textContent=best.toLocaleString('en-US');els.verdict.textContent=r==='S'?'回収記録の末尾に、あなたの声が含まれている。':r==='A'?'空白町の位置が、地図上に特定された。':r==='B'?'複数の記録が、同じ存在しない町を示している。':r==='C'?'記録の一部は、翌朝には消失していた。':'ノイズの奥で、まだ誰かが待っている。';setTimeout(()=>els.result.classList.add('open'),450);}

function updateHud(){
  els.time.textContent=state.time.toFixed(1).padStart(4,'0');els.score.textContent=String(state.score).padStart(6,'0');els.frequency.textContent=frequency(state.tuner);els.lock.style.width=`${state.lock*100}%`;els.noise.style.width=`${state.noise*100}%`;els.message.textContent=state.message;els.purge.disabled=state.purge<.999;els.lockLabel.textContent=state.lock>.82?'DO NOT MOVE':state.lock>.2?'SIGNAL FOUND':'SEARCHING';document.body.classList.toggle('danger',state.noise>.82);
}

function draw(now){
  const w=innerWidth,h=innerHeight,t=now/1000;ctx.fillStyle='#070907';ctx.fillRect(0,0,w,h);
  const top=90,bottom=h-(innerWidth<700?97:105),usable=bottom-top;
  ctx.strokeStyle='#b9c4ad12';ctx.lineWidth=1;for(let i=0;i<=16;i++){const x=w*(.06+i*.055);ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.stroke();}for(let y=top;y<bottom;y+=48){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  stars.forEach(s=>{ctx.fillStyle=`rgba(216,255,79,${.02+s.a*.05})`;ctx.fillRect(s.x*w,s.y*usable+top,1,1)});
  const tx=w*(.06+state.target.frequency*.88),needle=w*(.06+state.tuner*.88),dist=Math.abs(state.tuner-state.target.frequency),reveal=Math.max(.02,.16-dist*2.7)+state.lock*.5;
  ctx.save();ctx.globalAlpha=reveal;ctx.strokeStyle=state.target.rare?'#ff4b39':'#d8ff4f';ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<w;x+=3){const d=Math.abs(x-tx),amp=42*Math.exp(-d*d/5000)*state.target.strength;const y=h*.54+Math.sin(x*.07+t*5+state.target.phase)*amp+Math.sin(x*.013-t)*8;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();ctx.restore();
  const gradient=ctx.createLinearGradient(0,top,0,bottom);gradient.addColorStop(0,'rgba(216,255,79,0)');gradient.addColorStop(.45,'rgba(216,255,79,.85)');gradient.addColorStop(1,'rgba(216,255,79,0)');ctx.strokeStyle=state.noise>.82?'#ff4b39':gradient;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(needle,top);ctx.lineTo(needle,bottom);ctx.stroke();
  ctx.fillStyle=state.noise>.82?'#ff4b39':'#d8ff4f';ctx.fillRect(needle-3,h*.54-3,6,6);
  ctx.globalAlpha=.07+state.noise*.14;ctx.fillStyle='#e7eadc';for(let i=0;i<80;i++){const y=top+Math.random()*usable,x=Math.random()*w,l=Math.random()*40*state.noise;ctx.fillRect(x,y,l,1);}ctx.globalAlpha=1;
}

function loop(now){
  const dt=Math.min((now-last)/1000,.1);last=now;if(playing){step(state,dt);if(state.event?.type==='capture')captured(state.event);if(state.event?.type==='end')finish();updateHud();audioUpdate();}draw(now);requestAnimationFrame(loop);
}
updateHud();requestAnimationFrame(loop);
