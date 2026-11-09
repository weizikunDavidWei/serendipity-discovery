// Native, reusable adaptation of the React Bits Slide Commit interaction.
// Pointer completion requires endpoint + release; keyboard requires End/arrows
// THEN Enter/Space. The callback must honor its AbortSignal before committing.
export const SLIDE = Object.freeze({ stiffness:520, damping:28, mass:.9, hold:850, tolerance:.5 });
export function bindSlideCommit({trigger,onConfirm,onOpen=()=>{},onClose=()=>{},label='滑动以换一阵风 →',doneLabel='已换一阵风 ✓'}) {
  const panel=document.createElement('div');panel.className='slide-panel';panel.hidden=true;panel.id=trigger.id+'-confirmation';
  panel.innerHTML='<div class="slide-track"><span class="slide-label"></span><div class="slide-fill"><span class="slide-filled-label"></span></div><button type="button" class="slide-grip" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></button><span class="slide-done"></span></div><p class="slide-help">拖至终点松手 · 键盘 End 后 Enter · Esc 取消</p><span class="sr-only slide-announcement" role="status"></span>';
  trigger.parentElement.append(panel);trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',panel.id);
  const track=panel.querySelector('.slide-track'),grip=panel.querySelector('.slide-grip'),fill=panel.querySelector('.slide-fill');
  const plain=panel.querySelector('.slide-label'),inverted=panel.querySelector('.slide-filled-label'),done=panel.querySelector('.slide-done');
  const help=panel.querySelector('.slide-help'),announcement=panel.querySelector('.slide-announcement');
  grip.setAttribute('aria-label',label);help.id=panel.id+'-help';grip.setAttribute('aria-describedby',help.id);
  for(const element of [plain,fill,done])element.setAttribute('aria-hidden','true');
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),listeners=[];
  let phase='closed',x=0,travel=1,gesture=null,raf=0,timer=0,run=0,operation=null,animations=[];
  const busy=()=>phase==='pending'||phase==='done';
  function on(el,type,fn,options){el.addEventListener(type,fn,options);listeners.push(()=>el.removeEventListener(type,fn,options));}
  function setPhase(next){phase=next;panel.dataset.phase=next;grip.setAttribute('aria-busy',String(next==='pending'));grip.setAttribute('aria-disabled',String(busy()));}
  function paint(value,squash=0){x=value;const shown=Math.max(0,Math.min(travel,x)),percent=Math.round(shown/travel*100);
    track.style.setProperty('--slide-x',shown+'px');track.style.setProperty('--slide-squash',String(squash));
    fill.style.width=(shown+44)+'px';grip.setAttribute('aria-valuenow',String(percent));grip.setAttribute('aria-valuetext',percent===100?'已到终点，按 Enter 或空格确认':label+'，'+percent+'%');
  }
  function stopAnimation(){cancelAnimationFrame(raf);raf=0;animations.forEach(a=>a.cancel());animations=[];}
  function release(){if(!gesture)return;const id=gesture.id;gesture=null;if(grip.hasPointerCapture(id))grip.releasePointerCapture(id);}
  function home(){stopAnimation();if(motion.matches){paint(0);setPhase('ready');return;}setPhase('returning');let velocity=0,last=performance.now();
    function frame(now){const dt=Math.min(.032,(now-last)/1000);last=now;const count=Math.max(1,Math.ceil(dt/(1/120))),step=dt/count;
      for(let i=0;i<count;i++){velocity+=(-SLIDE.stiffness*x-SLIDE.damping*velocity)/SLIDE.mass*step;x+=velocity*step;}
      paint(x,Math.min(.07,Math.max(0,-x)/80));
      if(Math.abs(x)<.12&&Math.abs(velocity)<1){paint(0);setPhase('ready');raf=0;}else raf=requestAnimationFrame(frame);
    }raf=requestAnimationFrame(frame);
  }
  function close({focus=false}={}){if(phase==='closed')return;
    ++run;operation?.abort();operation=null;clearTimeout(timer);stopAnimation();release();setPhase('closed');panel.hidden=true;
    trigger.disabled=false;trigger.setAttribute('aria-expanded','false');onClose();if(focus&&!document.hidden)trigger.focus({preventScroll:true});
  }
  function open(){if(trigger.disabled||phase!=='closed')return;travel=1;panel.hidden=false;setPhase('ready');trigger.setAttribute('aria-expanded','true');plain.textContent=inverted.textContent=label;done.textContent=doneLabel;announcement.textContent='';help.textContent='拖至终点松手 · 键盘 End 后 Enter · Esc 取消';
    travel=Math.max(1,track.clientWidth-52);inverted.style.width=(track.clientWidth-8)+'px';paint(0);onOpen();grip.focus({preventScroll:true});
    if(!motion.matches)animations.push(panel.animate([{opacity:0,transform:'translateY(-3px)'},{opacity:1,transform:'translateY(0)'}],{duration:130,easing:'ease-out'}));
  }
  async function commit(){if(busy()||phase==='closed')return;stopAnimation();release();setPhase('pending');paint(travel);trigger.disabled=true;announcement.textContent='正在换一阵风…';help.textContent='正在准备新的探索…';
    const id=++run;operation=new AbortController();
    try{await onConfirm(operation.signal);if(id!==run)return;setPhase('done');announcement.textContent=doneLabel;help.textContent='';
      if(!motion.matches)animations.push(track.animate([{transform:'scale(1)'},{transform:'scale(.985)'},{transform:'scale(1)'}],{duration:260}));
      timer=setTimeout(()=>close({focus:panel.contains(document.activeElement)}),SLIDE.hold);
    }catch(error){if(id!==run)return;trigger.disabled=false;setPhase('error');announcement.textContent='未能换一阵风，当前现场已保留。';help.textContent='未能完成，现场已保留；可重新滑动';home();}
  }
  on(trigger,'click',()=>{if(phase==='closed')open();else close({focus:true});});
  on(grip,'pointerdown',e=>{if(busy()||gesture||e.button!==0||!e.isPrimary)return;e.preventDefault();e.stopPropagation();stopAnimation();
    const rect=track.getBoundingClientRect();travel=Math.max(1,rect.width-52);gesture={id:e.pointerId,start:e.clientX,offset:e.clientX-Math.max(0,x),moved:0};setPhase('dragging');
    try{grip.setPointerCapture(e.pointerId)}catch{release();home();}
  });
  function move(e){if(!gesture||e.pointerId!==gesture.id)return;e.stopPropagation();if(e.cancelable)e.preventDefault();gesture.moved=Math.max(gesture.moved,Math.abs(e.clientX-gesture.start));const next=Math.max(0,Math.min(travel,e.clientX-gesture.offset));paint(next,motion.matches?0:Math.min(.025,gesture.moved/1200));}
  on(grip,'pointermove',move);
  on(grip,'pointerup',e=>{if(!gesture||e.pointerId!==gesture.id)return;move(e);const complete=gesture.moved>=6&&x>=travel-SLIDE.tolerance;release();if(complete)commit();else home();});
  on(grip,'pointercancel',e=>{if(gesture?.id===e.pointerId){release();home();}});
  on(grip,'lostpointercapture',e=>{if(gesture?.id===e.pointerId){release();home();}});
  on(grip,'click',e=>{e.preventDefault();e.stopPropagation();});
  on(grip,'keydown',e=>{if(busy())return;let next=x;
    if(['ArrowRight','ArrowUp','ArrowLeft','ArrowDown','Home','End','Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();stopAnimation();release();
      if(e.key==='End')next=travel;else if(e.key==='Home')next=0;else if(e.key.startsWith('Arrow'))next=Math.max(0,Math.min(travel,x+(e.key==='ArrowRight'||e.key==='ArrowUp'?1:-1)*travel/10));
      else{if(x>=travel-SLIDE.tolerance)commit();else{help.textContent='方向键移至终点，再按 Enter 确认';announcement.textContent=help.textContent;}return;}
      setPhase('ready');paint(next);help.textContent='方向键调整 · 到终点后 Enter 确认';
    }
  });
  on(document,'keydown',e=>{if(e.key==='Escape'&&phase!=='closed'){e.preventDefault();close({focus:true});}});
  on(document,'pointerdown',e=>{if(phase!=='closed'&&!panel.contains(e.target)&&!trigger.contains(e.target))close();});
  on(panel,'focusout',()=>queueMicrotask(()=>{if(phase!=='closed'&&!panel.contains(document.activeElement)&&document.activeElement!==trigger)close();}));
  on(window,'resize',()=>close());on(window,'blur',()=>close());on(window,'pagehide',()=>close());
  on(document,'visibilitychange',()=>{if(document.hidden)close();});
  on(motion,'change',()=>{if(phase==='returning'){stopAnimation();paint(0);setPhase('ready');}});
  return {open,close,destroy(){close();listeners.forEach(remove=>remove());panel.remove();trigger.removeAttribute('aria-controls');trigger.removeAttribute('aria-expanded');}};
}
