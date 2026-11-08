import {World} from '../assets/physics.js';
import {bindDrag} from '../assets/interaction.js';
const stage=document.querySelector('#stage'),result=document.querySelector('#result');
let trace=[];const traceNode=document.createElement('pre');document.querySelector('#panel').append(traceNode);
let world,nodes=[],active=null,record=null,last=null,searches=0,raf=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function reset(){
 cancelAnimationFrame(raf);trace=[];traceNode.textContent='';last=null;record=null;searches=0;active=null;
 const w=stage.clientWidth,h=stage.clientHeight,y=h*.55;
 const large=Math.min(160,h*.26,w*.15);
 world=new World([{x:230,y,r:large,vx:0,vy:0},...Array.from({length:3},(_,i)=>({x:w*(.66+i*.09),y,r:44,vx:0,vy:0}))],{width:w,height:h},[],{wind:0});
 stage.replaceChildren();nodes=world.bodies.map((body,i)=>{
  const b=document.createElement('button');b.className='orb';b.style.width=b.style.height=body.r*2+'px';b.innerHTML='<span class="name">'+(i===0?'甩出大圆':'碰撞 '+i)+'</span>';stage.append(b);
  bindDrag(b,body,{getWorld:()=>world,reduced:()=>reduced.matches,explore:()=>{searches++;},
   claim:()=>{if(active)return false;active=b;return true;},releaseClaim:()=>{active=null;},wake:()=>{},settle:()=>{}});
  for(const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>{trace.push([type,e.clientX.toFixed(0),e.timeStamp.toFixed(1),'v='+body.vx.toFixed(1),'drag='+Boolean(body.drag)].join(' '));trace=trace.slice(-10);traceNode.textContent=trace.join('\n');});
  b.addEventListener('pointerdown',()=>{result.textContent='已抓取 '+(i===0?'大圆':'小圆')+'；移动后释放。';record=null;});
  b.addEventListener('pointerup',e=>{
   if(i!==0||Math.abs(body.vx)<60)return;
   record={time:world.time,x:body.x,vx:body.vx,vy:body.vy,max:0,small:world.bodies.slice(1).map(b=>({x:b.x,y:b.y})),moves:[0,0,0],trusted:e.isTrusted};
  });return b;
 });
 result.textContent='等待真实拖动：左侧大圆向右甩出，在接近小圆前松手。';draw();raf=requestAnimationFrame(tick);
}
function draw(){world.bodies.forEach((b,i)=>nodes[i].style.transform=`translate3d(${b.x-b.r}px,${b.y-b.r}px,0)`);}
function tick(time){
 if(last!==null&&!document.hidden&&(!reduced.matches||active))world.advance((time-last)/1000);last=time;draw();
 if(record){const big=world.bodies[0];record.max=Math.max(record.max,Math.abs(big.x-record.x));world.bodies.slice(1).forEach((b,i)=>record.moves[i]=Math.max(record.moves[i],Math.hypot(b.x-record.small[i].x,b.y-record.small[i].y)));
 const passed=record.trusted&&record.max>150&&record.moves.every(d=>d>45)&&searches===0;
 result.textContent=(passed?'PASS · 真实甩动与三圆连锁碰撞':'测量中')+'\n真实输入：'+record.trusted+'；释放速度 '+record.vx.toFixed(1)+', '+record.vy.toFixed(1)+' px/s\n松手后最大滑行 '+record.max.toFixed(1)+'px；小圆位移 '+record.moves.map(d=>d.toFixed(1)).join(' / ')+'px；误搜索 '+searches;
 }
 raf=requestAnimationFrame(tick);
}
document.querySelector('#reset').onclick=reset;window.addEventListener('resize',reset);document.addEventListener('visibilitychange',()=>{last=null;});reset();
