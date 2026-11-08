import { World } from '../assets/physics.js';
import { arrange, clearOfBoxes } from '../assets/layout.js';
import { CONFIG, gap } from '../assets/config.js';
const body = (x,y,r,vx=0,vy=0) => ({x,y,r,vx,vy});
function seeded(seed) { return () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }; }
function check(assert, bodies, width, height, boxes=[], tolerance=.3) {
  bodies.forEach((a,i)=>{
    assert([a.x,a.y,a.vx,a.vy].every(Number.isFinite),'非有限数值');
    assert(a.x>=a.r+12-tolerance&&a.x<=width-a.r-12+tolerance&&a.y>=a.r+12-tolerance&&a.y<=height-a.r-12+tolerance,'边界穿透');
    assert(clearOfBoxes({...a,r:a.r-2-tolerance},boxes),'控件穿透');
    for(let j=i+1;j<bodies.length;j++)assert(Math.hypot(a.x-bodies[j].x,a.y-bodies[j].y)>=a.r+bodies[j].r+gap(a,bodies[j])-tolerance,'圆圈持续重叠');
  });
}
export async function runPhysicsTests(test,assert) {
 for(const count of [5,7,9])await test(count+' 圆圈 × 20 种子：不规则布局、巨大与小圆同屏、留白有效',()=>{
  for(let seed=1;seed<=20;seed++){
   const boxes=[{x:26,y:22,width:250,height:58},{x:1280,y:18,width:130,height:108},{x:1290,y:720,width:120,height:150}];
   const b=arrange(count,1440,900,boxes,seeded(seed));assert(b.length===count,'数量降级');check(assert,b,1440,900,boxes);
   assert(Math.max(...b.map(x=>x.r))/Math.min(...b.map(x=>x.r))>2.4,'尺度差异不足');
   assert(Math.max(...b.map(x=>x.r*2))>=350,'巨大圆圈不足350px');
  }
 });
 await test('面积质量：大圆撞小圆，动量守恒且小圆反应明显',()=>{
  const a=body(400,400,100,35),b=body(540,400,35);const w=new World([a,b],{width:1400,height:900},[],{wind:0,damping:0,restitution:1,maxSpeed:1000});
  const momentum=a.r*a.r*a.vx;
  for(let i=0;i<30;i++)w.step();
  assert(b.vx>50&&a.vx>0&&a.vx<35,'质量响应不正确');assert(Math.abs(a.r*a.r*a.vx+b.r*b.r*b.vx-momentum)<.001,'动量误差');check(assert,w.bodies,1400,900);
 });
 await test('同尺寸正面碰撞：对称速度交换，恢复系数有效',()=>{
  const a=body(300,300,50,30),b=body(400,300,50,-30);const w=new World([a,b],{width:1000,height:700},[],{wind:0,damping:0,restitution:.7});w.step();
  assert(a.vx<0&&b.vx>0&&Math.abs(a.vx+b.vx)<.01,'非对称');assert(Math.abs(a.vx+21)<.1,'恢复系数失效');
 });
 await test('紧密聚集、同心初始值：接触求解不会产生 NaN 或持续重叠',()=>{
  const bodies=[body(500,400,100),body(500,400,55),body(510,405,40),body(540,430,30),body(560,440,32)];const w=new World(bodies,{width:1440,height:900});w.solve(false,100);for(let i=0;i<600;i++)w.step();check(assert,bodies,1440,900);
 });
 await test('快速拖动大圆穿过小圆群：连续推进、连锁碰撞、释放速度受限',()=>{
  const bodies=[body(220,350,130),body(480,315,40),body(575,315,40),body(670,315,40),body(530,430,36)];const initial=bodies.slice(1).map(b=>({x:b.x,y:b.y}));const w=new World(bodies,{width:1440,height:900},[],{wind:0});
  bodies[0].drag={x:1120,y:350};let last=bodies[0].x;
  for(let i=0;i<260;i++){w.step();assert(Math.abs(bodies[0].x-last)<25,'位置瞬移');last=bodies[0].x;}
  w.release(bodies[0]);assert(Math.hypot(bodies[0].vx,bodies[0].vy)<=CONFIG.physics.releaseSpeed+.01,'释放过快');
  for(let i=0;i<300;i++)w.step();assert(bodies.slice(1).filter((b,i)=>Math.hypot(b.x-initial[i].x,b.y-initial[i].y)>30).length>=3,'未形成连锁响应');check(assert,bodies,1440,900);
 });
 await test('拖向边角控件：圆圈仍在可操作边界内',()=>{
  const boxes=[{x:20,y:20,width:245,height:65},{x:1290,y:720,width:120,height:150}];const b=body(400,300,120);const w=new World([b],{width:1440,height:900},boxes);b.drag={x:0,y:0};for(let i=0;i<500;i++)w.step();check(assert,[b],1440,900,boxes);b.drag={x:1440,y:900};for(let i=0;i<500;i++)w.step();check(assert,[b],1440,900,boxes);
 });
 await test('固定时间步：30 / 60 / 120Hz 轨迹一致，后台大时间差受限',()=>{
  const make=()=>new World([body(400,300,60,10,5)],{width:1440,height:900});const worlds=[make(),make(),make()];[30,60,120].forEach((hz,i)=>{for(let n=0;n<hz*10;n++)worlds[i].advance(1/hz);});assert(Math.hypot(worlds[0].bodies[0].x-worlds[2].bodies[0].x,worlds[0].bodies[0].y-worlds[2].bodies[0].y)<.01,'帧率依赖');assert(worlds[0].advance(100)<=CONFIG.physics.maxSteps,'追帧过量');
 });
 await test('长期稳定：9 圈模拟 5 分钟，无越界、速度失控、数量增长',()=>{
  const boxes=[{x:26,y:22,width:250,height:58},{x:1280,y:18,width:130,height:108},{x:1290,y:720,width:120,height:150}];const bodies=arrange(9,1440,900,boxes,seeded(41));const w=new World(bodies,{width:1440,height:900},boxes);const started=performance.now();
  for(let i=0;i<36000;i++){w.step();if(i%120===0)check(assert,bodies,1440,900,boxes,.8);}
  check(assert,bodies,1440,900,boxes,.8);assert(bodies.length===9&&bodies.every(b=>Math.hypot(b.vx,b.vy)<=CONFIG.physics.maxSpeed+.01),'速度或数量失控');
  document.querySelector('#benchmark').textContent='5 分钟 / 36,000 固定步的求解耗时：'+(performance.now()-started).toFixed(0)+'ms（不含浏览器绘制；非 FPS 测量）';
 });
 for(const [width,height] of [[390,844],[320,568],[768,1024],[844,390]])await test(width+'×'+height+' 自适应布置：5 圈 × 10 种子，不强塞重叠',()=>{
  const compact=width<700;const boxes=[{x:14,y:16,width:compact?192:245,height:compact?53:60},{x:width-115,y:12,width:100,height:height<480?36:100},{x:width-114,y:height-140,width:100,height:120},{x:14,y:height-75,width:width*.52,height:55}];
  for(let seed=1;seed<=10;seed++){const b=arrange(5,width,height,boxes,seeded(seed));assert(b.length===5,'数量不足5');check(assert,b,width,height,boxes);}
 });
}
