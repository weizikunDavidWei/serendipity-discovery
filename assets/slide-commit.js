// Persistent, text-free mechanical slider. Business callback commits only after
// endpoint release (or End/arrows followed by Enter/Space), honoring AbortSignal.
export const SLIDE=Object.freeze({stiffness:520,damping:28,mass:.9,hold:180,tolerance:.5});
export function bindSlideCommit({trigger,onConfirm,onOpen=()=>{},onClose=()=>{}}){
  trigger.innerHTML='<div class="slide-track"><button class="slide-grip" type="button" role="slider" aria-label="换一阵风" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i aria-hidden="true"></i></button></div><span class="sr-only slide-instructions">向右拖至终点并松手以更换探索。键盘方向键或End移至终点，再按Enter或空格确认；Escape取消。</span><span class="sr-only slide-announcement" role="status"></span>';
  const track=trigger.querySelector('.slide-track'),grip=trigger.querySelector('.slide-grip'),announcement=trigger.querySelector('.slide-announcement'),instructions=trigger.querySelector('.slide-instructions');
  instructions.id=trigger.id+'-instructions';grip.setAttribute('aria-describedby',instructions.id);
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),listeners=[];
  let enabled=!trigger.disabled,phase='ready',x=0,travel=1,gesture=null,raf=0,timer=0,run=0,operation=null,holding=false,animation=null,destroyed=false;
  const busy=()=>phase==='pending'||phase==='done';
  function on(el,type,fn,opts){el.addEventListener(type,fn,opts);listeners.push(()=>el.removeEventListener(type,fn,opts));}
  function measure(){const css=getComputedStyle(track);travel=Math.max(1,track.getBoundingClientRect().width-2*parseFloat(css.getPropertyValue('--slide-pad'))-parseFloat(css.getPropertyValue('--slide-diameter')));}
  function state(next){phase=next;trigger.dataset.phase=next;grip.setAttribute('aria-busy',String(next==='pending'));grip.setAttribute('aria-disabled',String(!enabled||busy()));grip.disabled=!enabled;}
  function paint(value){x=value;const shown=Math.max(0,Math.min(travel,x));track.style.setProperty('--slide-x',shown+'px');const valueNow=Math.round(shown/travel*100);grip.setAttribute('aria-valuenow',String(valueNow));grip.setAttribute('aria-valuetext',valueNow===100?'已到终点，按Enter或空格确认':valueNow+'%');}
  function stop(){cancelAnimationFrame(raf);raf=0;clearTimeout(timer);animation?.cancel();animation=null;}
  function release(){if(!gesture)return;const id=gesture.id;gesture=null;if(grip.hasPointerCapture(id))grip.releasePointerCapture(id);}
  function hold(){if(!holding){holding=true;onOpen();}}
  function settle(){paint(0);state('ready');if(holding){holding=false;onClose();}}
  function home(){stop();if(motion.matches||document.hidden){settle();return;}state('returning');let velocity=0,last=performance.now();
    function frame(now){const dt=Math.min(.032,(now-last)/1000);last=now;const steps=Math.max(1,Math.ceil(dt*120)),step=dt/steps;
      for(let i=0;i<steps;i++){velocity+=(-SLIDE.stiffness*x-SLIDE.damping*velocity)/SLIDE.mass*step;x+=velocity*step;}paint(x);
      if(Math.abs(x)<.12&&Math.abs(velocity)<1){raf=0;settle();}else raf=requestAnimationFrame(frame);
    }raf=requestAnimationFrame(frame);
  }
  function close(){++run;operation?.abort();operation=null;stop();release();measure();settle();}
  async function commit(){if(!enabled||busy()||destroyed)return;stop();release();hold();paint(travel);state('pending');announcement.textContent='正在更换探索';const id=++run;operation=new AbortController();
    try{await onConfirm(operation.signal);if(id!==run||destroyed)return;state('done');announcement.textContent='探索已更新';
      if(!motion.matches)animation=grip.querySelector('i').animate([{transform:'scale(1)'},{transform:'scale(.86)'},{transform:'scale(1)'}],{duration:160});
      timer=setTimeout(home,motion.matches?0:SLIDE.hold);
    }catch{if(id!==run||destroyed)return;announcement.textContent='操作未完成，探索现场已保留，请重试';home();}
  }
  on(grip,'pointerdown',e=>{if(!enabled||busy()||gesture||!e.isPrimary||e.button!==0)return;e.preventDefault();e.stopPropagation();stop();measure();hold();gesture={id:e.pointerId,start:e.clientX,offset:e.clientX-Math.max(0,x),moved:0};state('dragging');try{grip.setPointerCapture(e.pointerId)}catch{release();home();}});
  function move(e){if(!gesture||gesture.id!==e.pointerId)return;e.stopPropagation();if(e.cancelable)e.preventDefault();gesture.moved=Math.max(gesture.moved,Math.abs(e.clientX-gesture.start));paint(Math.max(0,Math.min(travel,e.clientX-gesture.offset)));}
  on(grip,'pointermove',move);on(grip,'pointerup',e=>{if(gesture?.id!==e.pointerId)return;move(e);const complete=gesture.moved>=6&&x>=travel-SLIDE.tolerance;release();if(complete)commit();else home();});
  for(const type of ['pointercancel','lostpointercapture'])on(grip,type,e=>{if(gesture?.id===e.pointerId){release();home();}});
  on(grip,'click',e=>{e.preventDefault();e.stopPropagation();});
  on(grip,'keydown',e=>{if(!enabled||busy())return;if(!['ArrowRight','ArrowUp','ArrowLeft','ArrowDown','Home','End','Enter',' ','Escape'].includes(e.key))return;e.preventDefault();e.stopPropagation();
    if(e.key==='Escape'){close();return;}stop();release();measure();
    if(e.key==='Enter'||e.key===' '){if(x>=travel-SLIDE.tolerance)commit();return;}
    hold();state('ready');paint(e.key==='End'?travel:e.key==='Home'?0:Math.max(0,Math.min(travel,x+(['ArrowRight','ArrowUp'].includes(e.key)?1:-1)*travel/10)));
  });
  on(grip,'blur',close);on(document,'pointerdown',e=>{if(holding&&!trigger.contains(e.target))close();});on(document,'keydown',e=>{if(holding&&e.key==='Escape')close();});
  for(const type of ['resize','blur','pagehide'])on(window,type,close);
  on(document,'visibilitychange',()=>{if(document.hidden)close();});on(motion,'change',()=>{if(motion.matches){if(phase==='returning'){stop();settle();}else animation?.cancel();}});
  measure();paint(0);state('ready');
  return {close,setEnabled(value){enabled=Boolean(value);state(phase);},destroy(){close();destroyed=true;listeners.forEach(remove=>remove());trigger.replaceChildren();}};
}
