import { CONFIG } from './config.js';
import { DragVelocity } from './drag-velocity.js';

// One pointer controller shared by the homepage and the real-input QA scene.
// Focus never controls the simulation; only explicit keyboard navigation does.
export function bindDrag(button, body, { getWorld, reduced, explore, wake, settle, claim, releaseClaim }) {
  let gesture = null, suppressUntil = 0;
  const clear = (throwBody = false, velocity = null) => {
    if (!gesture) return;
    const old = gesture; gesture = null;
    if (old.dragging) {
      suppressUntil = performance.now() + CONFIG.interaction.clickSuppression;
      getWorld().release(body, throwBody && !reduced(), velocity);
    }
    button.classList.remove('is-dragging');
    releaseClaim(button);
    if (button.hasPointerCapture?.(old.id)) button.releasePointerCapture(old.id);
    settle();
  };
  function sample(e, ending = false) {
    let events = [];
    try { events = e.getCoalescedEvents?.() || []; } catch { /* optional Safari API */ }
    for (const point of [...events, e]) {
      const last = gesture.trail.samples[gesture.trail.samples.length - 1];
      // A duplicate pointerup is not a new stationary segment of the gesture.
      if (ending && last && Math.hypot(point.clientX-last.x,point.clientY-last.y)<0.5) continue;
      gesture.trail.add(point.clientX,point.clientY,point.timeStamp);
    }
  }
  button.addEventListener('pointerdown', e => {
    if (!e.isPrimary || e.button !== 0 || gesture || !claim(button)) return;
    const rect = button.parentElement.getBoundingClientRect();
    gesture = { id:e.pointerId, x:e.clientX, y:e.clientY, type:e.pointerType, dragging:false,
      offsetX:e.clientX-rect.left-body.x, offsetY:e.clientY-rect.top-body.y, trail:new DragVelocity() };
    sample(e);
    try { button.setPointerCapture(e.pointerId); } catch { clear(false); }
  });
  button.addEventListener('pointermove', e => {
    if (!gesture || e.pointerId !== gesture.id) return;
    sample(e);
    const threshold=gesture.type==='touch'?CONFIG.interaction.touchThreshold:CONFIG.interaction.mouseThreshold;
    if (!gesture.dragging && Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)<threshold) return;
    gesture.dragging=true;
    const rect=button.parentElement.getBoundingClientRect(),world=getWorld(),edge=CONFIG.layout.edge;
    body.drag={
      x:Math.max(body.r+edge,Math.min(world.bounds.width-body.r-edge,e.clientX-rect.left-gesture.offsetX)),
      y:Math.max(body.r+edge,Math.min(world.bounds.height-body.r-edge,e.clientY-rect.top-gesture.offsetY)),
    };
    button.classList.add('is-dragging');
    if(e.cancelable)e.preventDefault();
    wake();
  });
  button.addEventListener('pointerup',e=>{
    if(!gesture||e.pointerId!==gesture.id)return;
    let velocity=null;
    if(gesture.dragging){sample(e,true);velocity=gesture.trail.velocity(e.timeStamp);}
    clear(gesture.dragging,velocity);
  });
  button.addEventListener('pointercancel',e=>{if(gesture&&e.pointerId===gesture.id)clear(false);});
  button.addEventListener('lostpointercapture',e=>{if(gesture&&e.pointerId===gesture.id)clear(false);});
  button.addEventListener('click',e=>{
    if(e.detail!==0&&performance.now()<suppressUntil){e.preventDefault();return;}
    explore();
  });
  button.addEventListener('dragstart',e=>e.preventDefault());
  return { cancel:()=>clear(false), get dragging(){return Boolean(gesture?.dragging);} };
}
