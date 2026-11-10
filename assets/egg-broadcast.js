import {disasterMessage,eggPreferences} from './egg-settings.js?v=20261109-eggs1';
export function createBroadcast(hint,status,onLayout){
 hint.setAttribute('role','status');hint.setAttribute('aria-live','polite');hint.setAttribute('aria-atomic','true');
 const baseline=hint.textContent,note=hint.parentElement,motion=matchMedia('(prefers-reduced-motion: reduce)');let animation=null,timer=0,generation=0,current='';
 function render(count,pending,immediate=false){const text=count?disasterMessage(count):pending?eggPreferences().resetMessage:baseline;const active=!!(count||pending);note.toggleAttribute('data-broadcast',active);if(text===current)return;current=text;const id=++generation,opacity=parseFloat(getComputedStyle(hint).opacity);clearTimeout(timer);animation?.cancel();
  const replace=()=>{if(id!==generation)return;animation?.cancel();animation=null;hint.textContent=text;hint.title=active?text:'';onLayout();if(!motion.matches&&!immediate)animation=hint.animate([{opacity:0},{opacity:1}],{duration:200,easing:'cubic-bezier(.16,1,.3,1)',fill:'none'})};
  if(immediate||motion.matches){replace();return}animation=hint.animate([{opacity},{opacity:0}],{duration:95,easing:'cubic-bezier(.4,0,1,1)',fill:'forwards'});timer=setTimeout(replace,95);
 }
 window.addEventListener('pagehide',()=>{clearTimeout(timer);animation?.cancel();hint.textContent=current||baseline});
 return {render};
}
