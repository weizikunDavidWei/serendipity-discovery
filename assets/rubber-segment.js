// Native RubberSegment-inspired two-edge spring. Pointermove paints immediately;
// only click travel and release settling use animation frames.
export const RUBBER=Object.freeze({deadzone:4,slop:10,flick:140,maxVelocity:2000,projection:.075,handoff:32,stiffness:1800,damping:76});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function bindRubberSegment(root,{items,value,onChange}){
  root.setAttribute('role','radiogroup');root.setAttribute('aria-label','搜索平台');
  const buttons=items.map(item=>{const b=document.createElement('button');b.type='button';b.className='platform-option';b.setAttribute('role','radio');b.dataset.platform=item.id;b.textContent=item.label;root.append(b);return b;});
  const thumb=document.createElement('div');thumb.className='rubber-thumb';thumb.setAttribute('aria-hidden','true');
  for(const item of items){const copy=document.createElement('span');copy.className='platform-copy';copy.textContent=item.label;thumb.append(copy)}root.append(thumb);
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),listeners=[];
  let index=Math.max(0,items.findIndex(item=>item.id===value)),slots=[],width=0,left=0,right=0,raf=0,timer=0,drag=null,destroyed=false,suppressUntil=0;
  function on(el,type,fn,opts){el.addEventListener(type,fn,opts);listeners.push(()=>el.removeEventListener(type,fn,opts))}
  function stop(){cancelAnimationFrame(raf);raf=0;clearTimeout(timer)}
  function paint(l,r){left=l;right=r;root.style.setProperty('--rubber-left',clamp(l,0,width)+'px');root.style.setProperty('--rubber-right',clamp(width-r,0,width)+'px')}
  function aria(){buttons.forEach((b,i)=>{b.setAttribute('aria-checked',String(index===i));b.tabIndex=index===i?0:-1})}
  function release(){if(!drag)return;const old=drag;drag=null;suppressUntil=performance.now()+450;delete root.dataset.held;delete buttons[old.slot].dataset.pressed;if(buttons[old.slot].hasPointerCapture(old.id))buttons[old.slot].releasePointerCapture(old.id);return old}
  function jump(){stop();const s=slots[index];if(s)paint(s.l,s.r)}
  function measure(){if(destroyed)return;release();const rect=root.getBoundingClientRect();width=rect.width-2;slots=buttons.map(b=>{const r=b.getBoundingClientRect();return {l:r.left-rect.left-1,r:r.right-rect.left-1}});jump()}
  function animateTo(i,{velocity=0,click=false}={}){
    stop();const goal=slots[i];if(!goal)return;
    if(motion.matches||document.hidden){paint(goal.l,goal.r);return;}
    let targetL=goal.l,targetR=goal.r,vl=clamp(velocity,-RUBBER.maxVelocity,RUBBER.maxVelocity)*.28,vr=vl,last=performance.now();
    if(click){targetL=Math.min(left,goal.l);targetR=Math.max(right,goal.r);timer=setTimeout(()=>{targetL=goal.l;targetR=goal.r},RUBBER.handoff)}
    function tick(now){if(destroyed)return;const dt=Math.min(.032,(now-last)/1000);last=now;let l=left,r=right;const n=Math.max(1,Math.ceil(dt*120)),step=dt/n;
      for(let j=0;j<n;j++){vl+=((targetL-l)*RUBBER.stiffness-vl*RUBBER.damping)*step;vr+=((targetR-r)*RUBBER.stiffness-vr*RUBBER.damping)*step;l+=vl*step;r+=vr*step;}
      paint(l,r);
      if(targetL===goal.l&&targetR===goal.r&&Math.abs(l-goal.l)+Math.abs(r-goal.r)<.12&&Math.abs(vl)+Math.abs(vr)<1){paint(goal.l,goal.r);raf=0;}else raf=requestAnimationFrame(tick);
    }raf=requestAnimationFrame(tick);
  }
  function select(i,options){const changed=i!==index;index=i;aria();if(changed)onChange(items[index].id);animateTo(index,options)}
  function nearest(center){let best=0;for(let i=1;i<slots.length;i++)if(Math.abs((slots[i].l+slots[i].r)/2-center)<Math.abs((slots[best].l+slots[best].r)/2-center))best=i;return best}
  function sample(e){const last=drag.hist[drag.hist.length-1];if(last&&last[1]===e.clientX)return;drag.hist.push([e.timeStamp,e.clientX]);drag.hist=drag.hist.filter(([t])=>e.timeStamp-t<=110).slice(-16)}
  function velocity(d,now){const recent=d.hist.filter(([t])=>now-t<=100),a=recent[0],b=recent[recent.length-1];if(!a||!b||now-b[0]>70)return 0;return clamp((b[1]-a[1])/Math.max(8,b[0]-a[0])*1000,-RUBBER.maxVelocity,RUBBER.maxVelocity)}
  buttons.forEach((b,i)=>{
    on(b,'pointerdown',e=>{if(drag||e.button!==0||!e.isPrimary)return;e.stopPropagation();e.preventDefault();
      // Selected slot remains grabbable even while its visual is travelling.
      // Interrupting a stretched animation must not become a wide, stuck drag.
      const onThumb=i===index;stop();if(onThumb){const s=slots[index];paint(s.l,s.r)}drag={id:e.pointerId,slot:i,start:e.clientX,initialLeft:left,initialRight:right,onThumb,live:false,hist:[[e.timeStamp,e.clientX]],max:0};b.focus({preventScroll:true});
      if(!onThumb)b.dataset.pressed='';try{b.setPointerCapture(e.pointerId)}catch{release();jump()}
    });
    on(b,'click',e=>{if(e.detail!==0&&performance.now()<suppressUntil){e.preventDefault();return}select(i,{click:true})});
    on(b,'keydown',e=>{let next=index;if(['ArrowRight','ArrowDown'].includes(e.key))next=Math.min(items.length-1,index+1);else if(['ArrowLeft','ArrowUp'].includes(e.key))next=Math.max(0,index-1);else if(e.key==='Home')next=0;else if(e.key==='End')next=items.length-1;else if(e.key==='Enter'||e.key===' ')next=i;else if(e.key==='Escape'){release();jump();return}else return;e.preventDefault();e.stopPropagation();release();select(next,{click:!motion.matches});buttons[next].focus({preventScroll:true})});
  });
  function move(e){if(!drag||drag.id!==e.pointerId)return;e.stopPropagation();sample(e);const dx=e.clientX-drag.start;drag.max=Math.max(drag.max,Math.abs(dx));if(!drag.onThumb)return;if(Math.abs(dx)>=RUBBER.deadzone)drag.live=true;if(drag.live)root.dataset.held='';if(e.cancelable)e.preventDefault();
    const w=drag.initialRight-drag.initialLeft,l=drag.initialLeft+dx,max=width-w;
    if(l<0&&!motion.matches){const over=-l;paint(0,w-over*w*.55/(w+.55*over))}else if(l>max&&!motion.matches){const over=l-max;paint(max+over*w*.55/(w+.55*over),width)}else{const bounded=clamp(l,0,max);paint(bounded,bounded+w)}
  }
  on(root,'pointermove',move);
  on(root,'pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;move(e);const d=release();suppressUntil=performance.now()+450;
    if(!d.live){if(d.max<=RUBBER.slop)select(d.slot,{click:true});else animateTo(index);return;}
    const v=velocity(d,e.timeStamp);let to=nearest((left+right)/2+v*RUBBER.projection);if(Math.abs(v)>RUBBER.flick&&to===index)to=clamp(to+Math.sign(v),0,items.length-1);select(to,{velocity:v});buttons[to].focus({preventScroll:true});
  });
  function cancel(){release();jump()}
  for(const type of ['pointercancel','lostpointercapture'])on(root,type,e=>{if(drag?.id===e.pointerId)cancel()});
  on(window,'blur',cancel);on(window,'pagehide',cancel);on(window,'pageshow',measure);on(document,'visibilitychange',()=>{if(document.hidden)cancel()});on(motion,'change',cancel);
  const observer=new ResizeObserver(measure);observer.observe(root);document.fonts?.ready.then(()=>{if(!destroyed)measure()});aria();measure();
  return {setValue(id){const next=items.findIndex(item=>item.id===id);if(next<0||next===index)return;release();index=next;aria();animateTo(index,{click:true})},destroy(){destroyed=true;stop();release();observer.disconnect();listeners.forEach(remove=>remove());root.replaceChildren()}};
}
