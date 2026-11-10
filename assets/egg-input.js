import {CLICK_INTERVAL} from './egg-settings.js?v=20261109-eggs1';
// Pointerup is the sole counter. Click/mousedown compatibility events never count.
export function bindEggInput(field,{settings,spawn,ready}){
 let count=0n,last=0,press=null;
 const reset=()=>{count=0n;last=0;press=null};
 const blank=e=>e.target===field;
 document.addEventListener('pointerdown',e=>{
  if(!ready()||!settings().enabled||!e.isPrimary||e.button!==0||e.pointerType!=='mouse'||!blank(e)){reset();return}
  press={id:e.pointerId,x:e.clientX,y:e.clientY,time:e.timeStamp};
 },true);
 document.addEventListener('pointermove',e=>{if(press&&e.pointerId===press.id&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>5)reset()},true);
 document.addEventListener('pointerup',e=>{
  if(!press||e.pointerId!==press.id)return;const p=press;press=null;
  if(!blank(e)||e.button!==0||e.timeStamp-p.time>CLICK_INTERVAL||!ready()){reset();return}
  if(last&&e.timeStamp-last>CLICK_INTERVAL)count=0n;
  last=e.timeStamp;count++;
  if(count>=BigInt(settings().clicks)){count=0n;last=0;spawn(e.clientX,e.clientY)}
 },true);
 for(const type of ['pointercancel','keydown'])document.addEventListener(type,reset,true);
 for(const type of ['blur','pagehide','egg-preferences'])window.addEventListener(type,reset);
 document.addEventListener('visibilitychange',reset);
 return {reset};
}
