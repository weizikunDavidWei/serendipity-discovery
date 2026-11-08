import { DragVelocity } from '../assets/drag-velocity.js';
import { World } from '../assets/physics.js';
import { CONFIG, gap } from '../assets/config.js';
const body = (x=500,y=400,r=40) => ({x,y,r,vx:0,vy:0});
const speed = b => Math.hypot(b.vx,b.vy);
const trail = (vx,vy,interval=16) => {
  const t=new DragVelocity();for(let ms=0;ms<=128;ms+=interval)t.add(vx*ms/1000,vy*ms/1000,ms);return t;
};
export async function runReleaseTests(test,assert) {
  await test('释放轨迹：不同事件频率都按 CSS px/s 正确估计方向和速度',()=>{
    for(const interval of [8,16,32]){const t=trail(300,-150,interval),last=t.samples.at(-1).time,v=t.velocity(last);assert(Math.abs(v.x-300)<.001&&Math.abs(v.y+150)<.001,'速度单位或频率依赖');}
  });
  await test('真实稀疏事件：同毫秒和 1ms 移动仍有受控释放速度',()=>{
    for(const delta of [0,1]){const t=new DragVelocity();t.add(230,400,100);t.add(525,400,100+delta);const b=body(),w=new World([b],{width:2000,height:1000});w.release(b,true,t.velocity(100+delta));assert(b.vx>500&&b.vx<=CONFIG.physics.releaseSpeed,'高速稀疏轨迹被过滤');}
  });
  await test('核心验收：松手后滑行超过150px并依次撞开三个小圆',()=>{
    const bodies=[body(420,400,160),body(844,400,44),body(960,400,44),body(1075,400,44)],w=new World(bodies,{width:1280,height:800},[],{wind:0});const initial=bodies.map(b=>b.x),maximum=[0,0,0,0];w.release(bodies[0],true,{x:900,y:0});
    for(let i=0;i<600;i++){w.step();bodies.forEach((b,j)=>maximum[j]=Math.max(maximum[j],Math.abs(b.x-initial[j])));}
    assert(maximum[0]>150&&maximum.slice(1).every(d=>d>45),'释放后未形成三圆连锁');
  });
  await test('轨迹只使用最近窗口，反向拖动按最近方向释放，样本数量有界',()=>{
    const t=new DragVelocity();for(let ms=0;ms<200;ms+=10)t.add(ms,0,ms);for(let ms=200;ms<=400;ms+=10)t.add(400-ms,0,ms);assert(t.velocity(400).x<0,'沿旧方向释放');for(let i=401;i<5000;i++)t.add(i,0,i);assert(t.samples.length<=CONFIG.interaction.sampleLimit,'轨迹无限增长');
  });
  await test('静止、重复时间、过期释放、异常间隔和无效数据不产生异常甩动',()=>{
    const t=new DragVelocity();t.add(10,10,10);t.add(10,10,10);assert(t.velocity(10).x===0,'零时间除法');t.add(10,10,30);assert(t.velocity(30).x===0,'静止产生速度');
    const moving=trail(500,0);assert(moving.velocity(500).x===0,'过期轨迹');moving.add(10000,0,10000);assert(moving.velocity(10000).x===0,'跨时钟突变');moving.add(NaN,0,10010);assert(moving.velocity(10010).x===0,'无效数据');moving.add(0,0,5);moving.add(9999,0,4);assert(moving.velocity(4).x===0,'时间倒退');
  });
  await test('释放修复：控制器已停下仍能获得真实甩速；慢拖与快甩力度不同且限速',()=>{
    const slow=body(),fast=body(),w=new World([slow,fast],{width:1600,height:1000});slow.drag={x:slow.x,y:slow.y};fast.drag={x:fast.x,y:fast.y};
    w.release(slow,true,trail(25,0).velocity(128));w.release(fast,true,trail(1500,750).velocity(128));
    assert(slow.vx>15&&slow.vx<35,'缓拖强度');assert(speed(fast)>150&&speed(fast)<=CONFIG.physics.releaseSpeed+.01,'快速甩动或上限');assert(Math.abs(fast.vy/fast.vx-.5)<.001,'方向失真');
  });
  await test('释放后继续移动再自然衰减，不瞬停也不持续高速漂移',()=>{
    const b=body(),w=new World([b],{width:3000,height:2000},[],{wind:0});w.release(b,true,{x:1000,y:0});const x=b.x;for(let i=0;i<12;i++)w.step();assert(b.x-x>12,'释放即停止');for(let i=0;i<348;i++)w.step();assert(b.x-x>350&&speed(b)<250,'滑行距离或衰减不合理');for(let i=0;i<1440;i++)w.step();assert(speed(b)<40,'高速持续过久');
  });
  await test('取消只停止当前拖动物体，不甩动、不清零其他圆圈；reduced-motion 无释放惯性',()=>{
    const a=body(),b=body(800);b.vx=17;const w=new World([a,b],{width:1600,height:1000});a.vx=400;a.drag={x:900,y:400};w.release(a,false,{x:900,y:0});assert(speed(a)===0&&!a.drag&&!a.inertiaRemaining,'取消仍甩动');assert(b.vx===17,'取消影响其他物体');
  });
  await test('释放惯性仍能向其他圆传递动量并在边界反弹',()=>{
    const a=body(300),b=body(440),w=new World([a,b],{width:1000,height:800},[],{wind:0});w.release(a,true,{x:500,y:0});for(let i=0;i<120;i++)w.step();assert(b.x>440&&b.vx>0,'没有惯性碰撞');
    const edge=body(930,400,40),wall=new World([edge],{width:1000,height:800},[],{wind:0});wall.release(edge,true,{x:500,y:0});for(let i=0;i<30;i++)wall.step();assert(edge.vx<0&&edge.x<=948,'没有边界反弹');
  });
  await test('连续多方向甩动：限速、间隙、边界和有限数值保持稳定',()=>{
    const bodies=[body(300,400,100),body(560,400,40),body(660,400,40)],w=new World(bodies,{width:1440,height:900});
    for(let n=0;n<30;n++){w.release(bodies[0],true,{x:Math.cos(n)*9000,y:Math.sin(n)*9000});for(let i=0;i<120;i++)w.step();for(const b of bodies)assert(Number.isFinite(b.x)&&Number.isFinite(b.y)&&speed(b)<=CONFIG.physics.maxSpeed+.01&&b.x>=b.r+11.8&&b.x<=1440-b.r-11.8&&b.y>=b.r+11.8&&b.y<=900-b.r-11.8,'速度或边界失控');}
    for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++)assert(Math.hypot(bodies[i].x-bodies[j].x,bodies[i].y-bodies[j].y)>=bodies[i].r+bodies[j].r+gap(bodies[i],bodies[j])-.5,'持续穿透');
  });
}

export async function runArrowTests(w,test,assert,forceMedia) {
  await test('矢量箭头：无 Emoji 字符或字体依赖，固定原轮廓，按钮独立命名',()=>{
    const svg=w.document.querySelector('svg.direction'),button=w.document.querySelector('#surprise');assert(svg&&svg.querySelector('path')&&!svg.textContent.trim(),'仍是字符箭头');assert(svg.getAttribute('viewBox')==='0 0 112 100.8'&&svg.querySelector('path').getAttribute('fill')==='currentColor','轮廓或主题设置');assert(svg.getAttribute('aria-hidden')==='true'&&svg.getAttribute('focusable')==='false'&&button.getAttribute('aria-label').includes('完全随机探索'),'按钮名称缺失');
    const r=svg.getBoundingClientRect();assert(Math.abs(r.width-112)<.1&&Math.abs(r.height-100.8)<.1,'原尺寸改变');const reference=button.cloneNode(true);reference.removeAttribute('id');reference.style.visibility='hidden';reference.setAttribute('aria-hidden','true');const oldArrow=w.document.createElement('span');oldArrow.className='direction';oldArrow.style.width='auto';oldArrow.style.height='auto';oldArrow.textContent='↘';reference.querySelector('svg').replaceWith(oldArrow);w.document.body.append(reference);
    try{const b=button.getBoundingClientRect(),before=reference.getBoundingClientRect();for(const k of ['x','y','width','height'])assert(Math.abs(b[k]-before[k])<.2,'原生原字形的点击区域改变：'+k);const bounds=svg.querySelector('path').getBBox();svg.style.fontFamily='"Apple Color Emoji"';const independent=svg.querySelector('path').getBBox();assert(bounds.width===independent.width&&bounds.height===independent.height,'仍依赖 Emoji 字体');svg.style.fontFamily='';}finally{reference.remove();}
  });
  await test('手机、平板和横屏尺寸模拟：SVG 和原字符按钮的点击区域一致',async()=>{
    const frame=w.frameElement,oldWidth=frame.style.width,oldHeight=frame.style.height;
    try{for(const [width,height] of [[390,844],[1024,768],[844,390]]){
      frame.style.width=width+'px';frame.style.height=height+'px';await new Promise(r=>setTimeout(r,450));
      const button=w.document.querySelector('#surprise'),reference=button.cloneNode(true);reference.removeAttribute('id');reference.style.visibility='hidden';const old=w.document.createElement('span');old.className='direction';old.style.width='auto';old.style.height='auto';old.textContent='↘';reference.querySelector('svg').replaceWith(old);w.document.body.append(reference);
      try{const after=button.getBoundingClientRect(),before=reference.getBoundingClientRect();for(const k of ['x','y','width','height'])assert(Math.abs(after[k]-before[k])<.3,width+'px 点击区域变化：'+k);}finally{reference.remove();}
    }}finally{frame.style.width=oldWidth;frame.style.height=oldHeight;await new Promise(r=>setTimeout(r,450));}
  });
  await test('SVG currentColor 随浅深色切换，点击 SVG 与按钮仍同步探索',()=>{
    const svg=w.document.querySelector('svg.direction'),path=svg.querySelector('path');forceMedia(w,'prefers-color-scheme',false);assert(w.getComputedStyle(path).fill==='rgb(0, 0, 0)','浅色填充');forceMedia(w,'prefers-color-scheme',true);assert(w.getComputedStyle(path).fill==='rgb(255, 255, 255)','深色填充');let count=0;w.open=()=>count++;svg.dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1}));w.document.querySelector('#surprise').click();assert(count===2,'SVG/键盘按钮激活不兼容');
  });
}

// Test-only deterministic rAF and one-topic fixture, loading the actual homepage
// and modules. Nothing is exposed on the production window or physics world.
async function pointerFixture(data,reduced) {
  const iframe=document.createElement('iframe');iframe.style.width='1440px';iframe.style.height='1000px';document.querySelector('#preview').append(iframe);
  const html=await(await fetch('../index.html')).text();const one={...data,topics:[data.topics[0]]};
  const boot=`<script>
   const originalFetch=fetch.bind(window);window.fetch=(url,...args)=>String(url).endsWith('data/keywords.json')?Promise.resolve(new Response(JSON.stringify(${JSON.stringify(one).replace(/</g,'\\u003c')}))):originalFetch(url,...args);
   const originalMedia=matchMedia.bind(window);const reduced=new EventTarget();reduced.matches=${Boolean(reduced)};window.matchMedia=q=>q==='(prefers-reduced-motion: reduce)'?reduced:originalMedia(q);
   let serial=0;const frames=new Map();window.requestAnimationFrame=fn=>{frames.set(++serial,fn);return serial;};window.cancelAnimationFrame=id=>frames.delete(id);window.testStep=t=>{const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(t));};
  </scr`+`ipt>`;
  const loaded=new Promise(resolve=>iframe.onload=resolve);iframe.srcdoc=html.replace('<head>','<head><base href="'+new URL('../',location.href).href+'">'+boot);await loaded;const w=iframe.contentWindow;
  for(let i=0;i<100&&!w.document.querySelector('.orb');i++)await new Promise(r=>setTimeout(r,20));
  const b=w.document.querySelector('.orb');if(!b)throw new Error('真实首页夹具未加载');
  w.HTMLElement.prototype.setPointerCapture=function(){};w.HTMLElement.prototype.hasPointerCapture=()=>false;
  const rect=b.getBoundingClientRect(),x=rect.x+rect.width/2,y=rect.y+rect.height/2,sign=x<720?1:-1;let opened=0;w.open=()=>opened++;
  function event(type,dx,time,kind){const e=new w.PointerEvent(type,{bubbles:true,cancelable:true,isPrimary:true,pointerId:1,button:0,pointerType:kind,clientX:x+dx,clientY:y});Object.defineProperty(e,'timeStamp',{value:time});b.dispatchEvent(e);}
  w.testStep(0);
  return {iframe,w,b,x,y,sign,event,opened:()=>opened,position:()=>b.getBoundingClientRect().x};
}
export async function runPointerReleaseTests(data,test,assert) {
  for(const kind of ['mouse','touch','pen'])await test(kind+' 真实页面事件：按轨迹释放继续前进，拖动不搜索',async()=>{
    const f=await pointerFixture(data,false);try{const x=f.position();f.event('pointerdown',0,1,kind);f.event('pointermove',f.sign*20,21,kind);f.event('pointermove',f.sign*40,41,kind);f.event('pointerup',f.sign*60,61,kind);f.b.focus();f.b.dispatchEvent(new f.w.FocusEvent('focusin',{bubbles:true}));f.w.testStep(80);f.w.testStep(160);assert((f.position()-x)*f.sign>8,'未将轨迹速度应用到实际模拟');f.b.dispatchEvent(new f.w.MouseEvent('click',{bubbles:true,detail:1}));assert(f.opened()===0,'拖动误触搜索');}finally{f.iframe.remove();}
  });
  for(const scenario of ['held','cancel','blur','reduced','click'])await test('真实页面 '+scenario+'：不产生意外释放速度',async()=>{
    const f=await pointerFixture(data,scenario==='reduced');try{const x=f.position();f.event('pointerdown',0,1,'touch');if(scenario!=='click'){f.event('pointermove',f.sign*40,21,'touch');f.event('pointermove',f.sign*60,41,'touch');}
      if(scenario==='blur')f.w.dispatchEvent(new f.w.Event('blur'));else f.event(scenario==='cancel'?'pointercancel':'pointerup',scenario==='click'?0:f.sign*60,scenario==='held'?400:61,'touch');f.w.testStep(80);f.w.testStep(160);assert(Math.abs(f.position()-x)<4,'取消/静止/减少动态产生甩动');
      if(scenario==='click'){f.b.dispatchEvent(new f.w.MouseEvent('click',{bubbles:true,detail:1}));assert(f.opened()===1,'静止点击失效');}
    }finally{f.iframe.remove();}
  });
}
