export const VERSION=1;
export const BUILDINGS=[
 {name:'星拾いドローン',icon:'⌁',base:40,rate:1,desc:'小さな光を、こつこつ集める'},
 {name:'月面ドリル',icon:'◒',base:450,rate:9,desc:'月の奥に眠る輝きを掘り出す'},
 {name:'彗星ハーベスター',icon:'☄',base:4800,rate:65,desc:'流れ星をまるごと収穫'},
 {name:'星雲ファクトリー',icon:'❖',base:52000,rate:420,desc:'星雲を凝縮して、新しい星へ'},
 {name:'恒星ダイソンリング',icon:'◎',base:650000,rate:3200,desc:'太陽のエネルギーをひとりじめ'},
 {name:'銀河の織機',icon:'✺',base:9000000,rate:28000,desc:'銀河そのものを紡ぎだす'},
 {name:'虚空の庭園',icon:'❋',base:150000000,rate:300000,desc:'何もない場所に、宇宙を咲かせる'}
];
export const RESEARCH=[
 {name:'リアクター増幅',icon:'ϟ',base:100,desc:'採掘力 ×1.7 / Lv.',max:60},
 {name:'量子オートメーション',icon:'⟳',base:300,desc:'自動スピン解放 → 間隔を短縮',max:8},
 {name:'星間ネットワーク',icon:'⌘',base:800,desc:'全設備の生産 ×1.5 / Lv.',max:50},
 {name:'共鳴する心',icon:'♡',base:2000,desc:'絆の成長量 +1 / Lv.',max:10}
];
export const OUTCOMES=[
 {name:'星のかけら',symbols:['✧','⬡','◈'],mult:1,odds:60},
 {name:'ツインスター',symbols:['✧','✧','◈'],mult:3,odds:25},
 {name:'クリスタルラッシュ',symbols:['◈','◈','◈'],mult:10,odds:10},
 {name:'スーパーノヴァ',symbols:['✺','✺','✺'],mult:30,odds:4},
 {name:'STELLAR JACKPOT',symbols:['✦','✦','✦'],mult:100,odds:1}
];
export const SECTORS=['星屑のゆりかご','蒼い月の海','彗星の回廊','花咲く星雲','太陽の王冠','銀河の果て','新しい宇宙'];
export function fresh(now=Date.now()){return {version:VERSION,dust:0,total:0,run:0,spins:0,runSpins:0,bond:0,memories:0,rebirths:0,buildings:BUILDINGS.map(()=>0),research:RESEARCH.map(()=>0),collection:OUTCOMES.map(()=>0),pity:0,fever:0,feverLeft:0,mission:0,auto:false,sound:false,savedAt:now,skillUntil:0,skillReady:0};}
const finite=(v,max=1e150)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
export function restore(raw,now=Date.now()){
 if(!raw||raw.version!==VERSION)throw new Error('対応していないセーブデータです');
 const s=fresh(now);
 for(const key of ['dust','total','run','spins','runSpins','bond','memories','rebirths','pity','fever','feverLeft','mission','savedAt','skillUntil','skillReady']){
  if(!finite(raw[key]))throw new Error('セーブデータが破損しています');s[key]=raw[key];
 }
 for(const [key,len,max] of [['buildings',7,10000],['research',4,60],['collection',5,1e150]]){
  if(!Array.isArray(raw[key])||raw[key].length!==len||raw[key].some(v=>!finite(v,max)||!Number.isInteger(v)))throw new Error('強化データが破損しています');s[key]=[...raw[key]];
 }
 if(s.research.some((v,i)=>v>RESEARCH[i].max)||s.pity>99||s.fever>29||s.feverLeft>5||s.dust>s.total||s.run>s.total)throw new Error('不正なセーブデータです');
 s.auto=raw.auto===true;s.sound=raw.sound===true;return s;
}
export function bondLevel(s){return Math.min(100,1+Math.floor(Math.sqrt(s.bond/20)));}
export function globalMult(s){return (1+s.memories*.15)*(1+(bondLevel(s)-1)*.03);}
export function power(s){return (10+s.buildings.reduce((v,n,i)=>v+n*BUILDINGS[i].rate*.3,0))*1.7**s.research[0]*globalMult(s);}
export function rate(s){return s.buildings.reduce((v,n,i)=>v+n*BUILDINGS[i].rate*2**Math.floor(n/25),0)*1.5**s.research[2]*globalMult(s);}
export function cost(s,type,i){return Math.ceil(type==='build'?BUILDINGS[i].base*1.16**s.buildings[i]:RESEARCH[i].base*3**s.research[i]);}
export function earn(s,amount){amount=Math.max(0,Math.min(amount,1e140));s.dust=Math.min(1e150,s.dust+amount);s.total=Math.min(1e150,s.total+amount);s.run=Math.min(1e150,s.run+amount);return amount;}
export function buy(s,type,i){if(!Number.isInteger(i)||(type!=='build'&&type!=='research')||i<0||i>=(type==='build'?7:4))return false;
 if(type==='research'&&s.research[i]>=RESEARCH[i].max)return false;
 if(type==='build'&&s.buildings[i]>=10000)return false;
 const price=cost(s,type,i);if(s.dust<price)return false;s.dust-=price;s[type==='build'?'buildings':'research'][i]++;return true;
}
export function spin(s,rng=Math.random,now=Date.now()){
 let roll=rng()*100,index=0;
 for(let i=0;i<OUTCOMES.length;i++){roll-=OUTCOMES[i].odds;if(roll<0){index=i;break;}}
 if(s.pity>=99)index=4;
 const boosted=s.feverLeft>0;const reward=earn(s,power(s)*OUTCOMES[index].mult*(boosted?5:1)*(now<s.skillUntil?3:1));
 s.spins++;s.runSpins++;s.bond+=1+s.research[3];s.collection[index]++;s.pity=index===4?0:s.pity+1;
 if(boosted)s.feverLeft--;
 s.fever++;if(s.fever>=30){s.fever=0;s.feverLeft=5;}
 return {index,reward,boosted};
}
export function autoInterval(s){return Math.max(900,4000*.8**Math.max(0,s.research[1]-1));}
export function tick(s,seconds){return earn(s,rate(s)*Math.max(0,Math.min(seconds,28800)));}
export function offline(s,now=Date.now()){const seconds=Math.min(28800,Math.max(0,(now-s.savedAt)/1000));const reward=tick(s,seconds);s.savedAt=Math.max(s.savedAt,now);return {seconds,reward};}
export function useSkill(s,now=Date.now()){if(bondLevel(s)<3||now<s.skillReady)return false;s.skillUntil=now+20000;s.skillReady=now+180000;return true;}
export function prestigeGain(s){return Math.floor(Math.sqrt(s.run/100000));}
export function prestige(s,now=Date.now()){const gain=prestigeGain(s);if(gain<1)return false;const next=fresh(now);for(const k of ['total','spins','bond','memories','rebirths','collection','sound'])next[k]=Array.isArray(s[k])?[...s[k]]:s[k];next.memories+=gain;next.rebirths++;Object.assign(s,next);return true;}
export function mission(s){const cycle=Math.floor(s.mission/5),step=s.mission%5,scale=2**cycle;
 const owned=s.buildings.reduce((a,b)=>a+b,0);
 return [
 {title:'星のリズムをつかもう',description:`${5*scale} 回スピンする`,value:s.runSpins,target:5*scale,reward:100*scale},
 {title:'小さな採掘団',description:`設備を合計 ${3*scale} 基所有する`,value:owned,target:3*scale,reward:400*scale},
 {title:'星明かりを束ねて',description:`この周回で ${5000*scale} ダスト獲得`,value:s.run,target:5000*scale,reward:1000*scale},
 {title:'きみと、もう一回',description:`${50*scale} 回スピンする`,value:s.runSpins,target:50*scale,reward:3000*scale},
 {title:'星を動かす船長',description:`設備を合計 ${15*scale} 基所有する`,value:owned,target:15*scale,reward:8000*scale}
 ][step];
}
export function claim(s){const m=mission(s);if(m.value<m.target)return 0;s.mission++;return earn(s,m.reward*globalMult(s));}
export function sector(s){return Math.min(6,Math.max(0,Math.floor(Math.log10(Math.max(1,s.run)))-2));}
