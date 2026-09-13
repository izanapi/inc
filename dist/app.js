import {fresh,restore,BUILDINGS,RESEARCH,OUTCOMES,SECTORS,bondLevel,globalMult,power,rate,cost,buy,spin,autoInterval,tick,offline,useSkill,prestigeGain,prestige,mission,claim,sector} from './engine.js';
const $=s=>document.querySelector(s), KEY='starforge-save-v1';
let state=fresh(),busy=false,tab='build',shopSignature='',last=Date.now(),autoAt=0,audio,toastTimer,saveFailed=false;
const fmt=n=>{if(n<1000)return Math.floor(n).toLocaleString('ja-JP');const units=['K','M','B','T','Qa','Qi','Sx','Sp','Oc','No'];const e=Math.floor(Math.log10(n)/3);return e>units.length?n.toExponential(2):(n/1000**e).toFixed(n/1000**e<10?2:1)+units[e-1];};
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
function log(message){$('#log p').textContent=message;}
function save(){try{state.savedAt=Date.now();localStorage.setItem(KEY,JSON.stringify(state));$('#save-status').textContent='セーブ済み';saveFailed=false;}catch{$('#save-status').textContent='保存できません';if(!saveFailed)toast('自動保存できません。設定からセーブを書き出してください。');saveFailed=true;}}
function modal(html){$('#modal-content').innerHTML=html;if(!$('#modal').open)$('#modal').showModal();}
$('#close-modal').onclick=()=>$('#modal').close();
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#modal').close();}});
try{const raw=localStorage.getItem(KEY);if(raw){state=restore(JSON.parse(raw));const away=offline(state);if(away.seconds>60&&away.reward>0)setTimeout(()=>modal(`<span class="eyebrow">WELCOME BACK, CAPTAIN</span><h2>おかえり、船長。</h2><p>「お留守の間も、ちゃんと星を集めておいたよ！」</p><h2 style="color:var(--cyan)">+${fmt(away.reward)} ✧</h2><p>${Math.floor(away.seconds/60)} 分間の設備生産。最大8時間分まで蓄積します。</p>`),400);}}catch{toast('セーブを読み込めませんでした。新しい航海を開始します。');}
$('#pilot-art').classList.add('loaded');
function tone(win=false){if(!state.sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const now=audio.currentTime;[0,1,2].forEach((_,i)=>{const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=(win?523:261)*[1,1.25,1.5][i];gain.gain.setValueAtTime(.035,now+i*.075);gain.gain.exponentialRampToValueAtTime(.001,now+.25+i*.075);osc.connect(gain);gain.connect(audio.destination);osc.start(now+i*.075);osc.stop(now+.3+i*.075);});}catch{}}
function celebrate(big){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const r=$('#reels').getBoundingClientRect();for(let i=0;i<(big?32:12);i++){const el=document.createElement('span');el.className='spark';el.textContent=['✦','✧','·'][i%3];el.style.left=r.left+r.width/2+'px';el.style.top=r.top+r.height/2+'px';el.style.setProperty('--dx',(Math.random()-.5)*(big?650:350)+'px');el.style.setProperty('--dy',(Math.random()-.6)*500+'px');$('#particles').append(el);setTimeout(()=>el.remove(),1250);}}
function render(){
 $('#dust').textContent=fmt(state.dust);$('#lifetime').textContent=fmt(state.total);$('#rate').textContent=`+${fmt(rate(state))} / 秒`;$('#memory').textContent=fmt(state.memories);$('#multiplier').textContent=`恒久倍率 ×${(1+state.memories*.15).toFixed(2)}`;
 const area=sector(state);$('#sector').textContent=`0${area+1} / ${SECTORS[area]}`;$('#spin-power').textContent=`採掘力 ${fmt(power(state))}`;$('#spins').textContent=`SPIN ${String(state.spins).padStart(4,'0')}`;
 const level=bondLevel(state),start=20*(level-1)**2,end=20*level**2;
 $('#bond-label').textContent=`絆 Lv.${level}`;$('#bond-next').textContent=level===100?'MAX':`${fmt(state.bond-start)} / ${fmt(end-start)}`;$('#bond-bar').style.width=(level===100?100:100*(state.bond-start)/(end-start))+'%';
 $('#pilot-art').classList.toggle('awakened',level>=10);$('#pilot-title').textContent=level>=10?'覚醒 · 星を紡ぐ航海士':'星を夢見る航海士';
 const now=Date.now(),active=now<state.skillUntil,cooldown=Math.max(0,Math.ceil((state.skillReady-now)/1000));
 $('#skill').disabled=level<3||cooldown>0;$('#skill-status').textContent=level<3?'絆 Lv.3 で解放 · スピンで絆が育ちます':active?`星のエール発動中！ あと ${Math.ceil((state.skillUntil-now)/1000)} 秒`:cooldown?`再使用まで ${cooldown} 秒`:'準備完了 · スピン報酬を3倍に！';
 document.body.classList.toggle('overdrive',state.feverLeft>0);$('#fever-label').textContent=state.feverLeft?`報酬 ×5 · 残り ${state.feverLeft} 回`:`${state.fever} / 30`;$('#fever-bar').style.width=(state.feverLeft?100:state.fever/30*100)+'%';$('#fever-hint').textContent=`大当たり保証まで、あと ${100-state.pity} 回 · 30回ごとに5倍フィーバー`;
 $('#auto').disabled=state.research[1]<1;$('#auto').textContent=state.research[1]<1?'自動スピン：研究で解放':`自動スピン ${state.auto?'ON':'OFF'}`;$('#auto').setAttribute('aria-pressed',String(state.auto));$('#sound').textContent=`音 ${state.sound?'ON':'OFF'}`;
 const m=mission(state);$('#mission-title').textContent=m.title;$('#mission-description').textContent=m.description;$('#claim').disabled=m.value<m.target;$('#claim').textContent=m.value>=m.target?`+${fmt(m.reward*globalMult(state))} 受取`:`${fmt(m.value)} / ${fmt(m.target)}`;$('#owned-total').textContent=state.buildings.reduce((a,b)=>a+b,0)+' 設備';renderShop();
}
function renderShop(){const signature=JSON.stringify([tab,state.buildings,state.research,state.collection,state.rebirths,prestigeGain(state),bondLevel(state)]);
 if(signature!==shopSignature){shopSignature=signature;const target=$('#tab-content');
 if(tab==='build'||tab==='research'){
 const list=tab==='build'?BUILDINGS:RESEARCH;
 target.innerHTML=`<p class="shop-intro">${tab==='build'?'設備は留守中も生産。各25基ごとに、その設備の生産が2倍。':'少しの研究で、大きな一回に。'}</p><div class="shop-list">${list.map((b,i)=>{const n=state[tab==='build'?'buildings':'research'][i];return `<div class="purchase"><span class="item-icon">${b.icon}</span><div class="item-info"><h3>${b.name}<span class="count">${tab==='build'?'×':'Lv.'}${n}</span></h3><p>${b.desc}</p>${tab==='build'?`<small>基礎 +${fmt(b.rate)} / 秒${n>=25?' · 25基ボーナス ×'+2**Math.floor(n/25):''}</small>`:''}</div><button class="buy" data-buy="${i}" aria-label="${b.name}を強化">${tab==='research'&&n>=b.max?'MAX':fmt(cost(state,tab,i))}<span>✧</span></button></div>`;}).join('')}</div><div class="discovery">${tab==='build'?'✧ 設備を増やすと、手動スピンの採掘力も上がります。':'♡ 絆 Lv.3：星のエール / Lv.10：ルミナ覚醒<br>⟳ 自動スピンはゲームを開いている間に作動します。'}</div>`;
 }else if(tab==='collection'){
 target.innerHTML=`<p class="shop-intro">星との出会いを記録。転生しても、この記憶は消えない。</p><div class="collection-grid">${OUTCOMES.map((o,i)=>`<div class="collect-card ${state.collection[i]?'':'locked'}"><b>${state.collection[i]?o.symbols[0]:'?'}</b><h3>${state.collection[i]?o.name:'未発見の輝き'}</h3><p>報酬 ×${o.mult} · ${fmt(state.collection[i])} 回</p></div>`).join('')}</div><div class="discovery">ルミナの覚醒まで：絆 Lv.${bondLevel(state)} / 10<br>絆による全生産ボーナス +${((bondLevel(state)-1)*3)}%</div>`;
 }else{target.innerHTML=`<div class="rebirth-card"><div class="orb">◈</div><span class="eyebrow">BEYOND THE STARS</span><h3>新しい宇宙へ</h3><p>いまの設備と研究を星の記憶に変え、<br>もっと遠くへ届く航海を。</p><strong>+${fmt(prestigeGain(state))} 星の記憶</strong><p>記憶1つにつき、すべての獲得量 +15%。<br>絆・図鑑・星の記憶は引き継がれます。</p><button class="secondary full" id="rebirth" ${prestigeGain(state)<1?'disabled':''}>${prestigeGain(state)<1?'周回獲得 100K で解放':'転生する'}</button><p>これまでの転生 ${state.rebirths} 回</p></div>`;}
 }
 document.querySelectorAll('[data-buy]').forEach(el=>{const i=+el.dataset.buy;el.disabled=state.dust<cost(state,tab,i)||(tab==='research'&&state.research[i]>=RESEARCH[i].max)||(tab==='build'&&state.buildings[i]>=10000);});
}
async function doSpin(){if(busy||$('#modal').open)return;busy=true;$('#spin').disabled=true;$('#reels').classList.add('rolling');$('#reels').classList.remove('bigwin');
 const level=bondLevel(state),result=spin(state),outcome=OUTCOMES[result.index];save();
 const reels=[...document.querySelectorAll('.reel')],reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 for(let i=0;i<3;i++){reels[i].textContent='✧';}
 const timer=reduced?null:setInterval(()=>reels.forEach(el=>{el.textContent=['✧','◈','✺','⬡','✦'][Math.floor(Math.random()*5)];}),70);
 await new Promise(r=>setTimeout(r,reduced?50:540));if(timer)clearInterval(timer);reels.forEach((el,i)=>el.textContent=outcome.symbols[i]);$('#reels').classList.remove('rolling');
 $('#result-label').textContent=outcome.name+(result.boosted?' · OVERDRIVE':'');$('#win').textContent=`+${fmt(result.reward)} ✧`;tone(result.index>=2);
 if(result.index>=2){celebrate(result.index>=3);$('#reels').classList.add('bigwin');log(`${outcome.name}！ +${fmt(result.reward)} スターダスト`);}
 if(result.index===4)$('#speech').textContent='「わあっ、銀河が全部きらきらしてる！ 船長、今の見た！？」';
 else if(bondLevel(state)>level){$('#speech').textContent=bondLevel(state)>=10?'「きみと来たから、この光に届いたんだよ。これからもずっと、一緒に。」':'「また少し、息がぴったりになったね。次の星も一緒に見つけよう！」';toast(`絆 Lv.${bondLevel(state)}！ 全獲得量がアップ`);}
 else if(state.spins%12===0)$('#speech').textContent=['「星ってね、ひとつずつ違う色をしてるんだよ。」','「ちょっと休んでも大丈夫。ドローンたちは働き者だから！」','「船長となら、銀河の向こうも怖くないね。」','「次はどんな星に会えるかな。楽しみ！」'][Math.floor(state.spins/12)%4];
 render();busy=false;$('#spin').disabled=false;
}
$('#spin').onclick=doSpin;
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!['BUTTON','INPUT','TEXTAREA','SELECT','A'].includes(document.activeElement.tagName)&&!$('#modal').open){e.preventDefault();doSpin();}});
$('#auto').onclick=()=>{if(state.research[1]<1)return;state.auto=!state.auto;autoAt=Date.now();save();render();};
$('#skill').onclick=()=>{if(useSkill(state)){tone(true);toast('星のエール！ 20秒間、スピン報酬3倍');$('#speech').textContent='「私の光も、全部もっていって！ いっけーっ！」';save();render();}};
$('#sound').onclick=()=>{state.sound=!state.sound;tone();save();render();};
$('#claim').onclick=()=>{const reward=claim(state);if(reward){toast(`ミッション達成！ +${fmt(reward)} ✧`);tone(true);save();render();}};
document.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>{tab=button.dataset.tab;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===button));render();});
$('#tab-content').onclick=e=>{const button=e.target.closest('[data-buy]');if(button){if(buy(state,tab,+button.dataset.buy)){tone();save();render();}return;}if(e.target.closest('#rebirth')){modal(`<h2>新しい宇宙へ旅立つ？</h2><p>現在のダスト・設備・研究・周回ミッションはリセットされます。絆・図鑑・累計スピンは残ります。</p><p>星の記憶 <b>+${fmt(prestigeGain(state))}</b> を獲得します。</p><button id="confirm-rebirth" class="secondary full">記憶を受け継いで転生</button>`);$('#confirm-rebirth').onclick=()=>{if(busy){toast('スピンが終わってから転生できます');return;}if(prestige(state)){save();render();$('#modal').close();$('#speech').textContent='「はじめまして……なんてね。ちゃんと覚えてるよ、船長。」';toast('新しい宇宙に到着しました！');log('星の記憶を受け継ぎ、新たな航海へ。');}};}};
$('#odds').onclick=()=>modal(`<h2>星のめぐりあわせ</h2><p>毎回必ず報酬を獲得。消費する資源はありません。</p>${OUTCOMES.map(o=>`<div class="odds-row"><span>${o.symbols.join(' ')} ${o.name}</span><span>×${o.mult} / ${o.odds}%</span></div>`).join('')}<p>通常時の抽選確率です。大当たりなしで99回続いた場合、次は必ず JACKPOT。フィーバーと星のエールは報酬倍率に乗算されます。</p><p>30スピンごとに、次の5回が5倍。スペースキーでもスピンできます。</p>`);
$('#settings').onclick=()=>{modal(`<h2>航海の設定</h2><p>進行はこのブラウザに自動保存されます。端末を移すときはセーブを書き出してください。</p><div class="settings-grid"><button class="secondary" id="export">セーブを書き出す</button><label class="secondary" style="text-align:center;cursor:pointer">セーブを読み込む<input id="import" type="file" accept="application/json,.json" hidden></label><button class="secondary danger" id="reset">最初からやり直す</button></div><p>留守中の設備生産は最大8時間。自動スピンは画面を開いている間のみ。音は右上で切り替えできます。</p>`);
 $('#export').onclick=()=>{save();const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='starforge-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('セーブを書き出しました');};
 $('#import').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(file.size>100000){toast('セーブファイルが大きすぎます');return;}try{const next=restore(JSON.parse(await file.text()));if(busy){toast('スピンが終わってから読み込んでください');return;}state=next;offline(state);last=Date.now();save();render();$('#modal').close();toast('航海データを読み込みました');}catch{toast('有効なセーブファイルではありません');}};
 $('#reset').onclick=()=>{modal('<h2>すべての記憶を消しますか？</h2><p>絆と転生を含む全進行を失います。必要なら先にセーブを書き出してください。</p><button class="secondary full danger" id="confirm-reset">全データを消して最初から</button>');$('#confirm-reset').onclick=()=>{if(busy)return;state=fresh();last=Date.now();save();render();$('#modal').close();$('#win').textContent='EVERY SPIN, A NEW STAR.';$('#speech').textContent='「さあ、新しい星を見つけよう、船長！」';toast('新しい航海を始めました');};};
};
render();
setInterval(()=>{const now=Date.now();tick(state,(now-last)/1000);last=now;if(state.auto&&state.research[1]&&!document.hidden&&now-autoAt>=autoInterval(state)&&!busy&&!$('#modal').open){autoAt=now;doSpin();}render();},200);
setInterval(save,5000);document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});window.addEventListener('pagehide',save);
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'read_starforge_progress',description:'現在のゲームの資源・設備・絆を確認する',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({dust:state.dust,productionPerSecond:rate(state),bondLevel:bondLevel(state),spins:state.spins,memories:state.memories})})).catch(()=>{});}catch{}}
