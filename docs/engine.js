export const DURATION=90;
export const TRANSMISSIONS=[
  '「もし聞こえているなら、駅には来ないで」',
  '児童合唱。楽譜には存在しない七番目の節。',
  'こちら灯台。海が上にあります。繰り返す、海が——',
  '天気予報：明日は一日中、昨日でしょう。',
  '無人列車の到着案内。乗客数は、あなたを含めて一名。',
  '「お母さん、ラジオの向こうに部屋があるよ」',
  '交通情報。地図にない環状線で渋滞が発生。',
  '十三秒間の沈黙。解析すると、非常に遅い呼吸音。',
  '校内放送：全員、窓の外を見ないでください。',
  '「午前3時17分をお知らせします」 時報は十五回鳴った。',
  '漁船からの救難信号。発信日は昭和四十二年。',
  'あなたの声で、まだしていない通話の録音が流れた。',
  '地下六階より業務連絡。建物に地下室はない。',
  '「ここは空白町です。どうか、忘れないで」'
];

export const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));

export function createState(rng=Math.random){
  return {running:true,time:DURATION,tuner:.5,target:newTarget(rng,0),lock:0,noise:.08,score:0,captures:0,combo:0,purge:1,message:'[ SCANNING 2.400—9.600 MHz ]',event:null};
}

export function newTarget(rng=Math.random,captures=0){
  const rare=rng()<Math.min(.08+captures*.008,.24);
  return {frequency:.08+rng()*.84,drift:(rng()-.5)*(.018+captures*.00035),strength:rare?1.55:.82+rng()*.34,rare,phase:rng()*Math.PI*2};
}

export function setTuner(state,value){state.tuner=clamp(value,.03,.97);}

export function purge(state){
  if(!state.running||state.purge<1)return false;
  state.purge=0;state.noise=Math.max(.02,state.noise-.34);state.lock*=.45;state.combo=0;state.event={type:'purge'};return true;
}

export function step(state,dt,rng=Math.random){
  if(!state.running||dt<=0)return state;
  dt=Math.min(dt,.1);state.event=null;state.time=Math.max(0,state.time-dt);
  const target=state.target;
  target.phase+=dt*(target.rare?4.2:2.5);
  target.frequency+=target.drift*dt;
  if(target.frequency<.06||target.frequency>.94){target.frequency=clamp(target.frequency,.06,.94);target.drift*=-1;}
  const distance=Math.abs(state.tuner-target.frequency);
  const inLock=distance<(.025-(target.rare?.006:0));
  if(inLock){
    const precision=1-distance/.028;
    state.lock+=dt*(.48+.5*precision)*target.strength;
    state.noise+=dt*(.052+state.captures*.0012);
  }else{
    state.lock=Math.max(0,state.lock-dt*(.18+distance*.3));
    state.noise+=dt*(.008+state.captures*.0007);
  }
  state.noise=clamp(state.noise);
  state.purge=clamp(state.purge+dt/11);
  if(state.lock>=1){
    state.captures++;state.combo++;
    const points=Math.round((target.rare?1800:600)*(1+Math.min(state.combo-1,8)*.25)*(1+state.time/DURATION*.2));
    state.score+=points;state.message=TRANSMISSIONS[Math.floor(rng()*TRANSMISSIONS.length)];
    state.event={type:'capture',rare:target.rare,points};state.lock=0;state.noise=Math.max(.05,state.noise-.11);state.target=newTarget(rng,state.captures);
  }
  if(state.noise>=1){state.time=Math.max(0,state.time-10*dt);state.lock=Math.max(0,state.lock-1.2*dt);}
  if(state.time<=0){state.running=false;state.event={type:'end'};}
  return state;
}

export function frequency(value){return (2.4+clamp(value)*7.2).toFixed(3);}
export function rank(score){return score>=18000?'S':score>=12000?'A':score>=7000?'B':score>=3000?'C':'D';}
