// Native adaptation inspired by React Bits Crosshair (reactbits.dev).
// Read-only geometry: never changes the physics world or captures input.
export const CROSSHAIR = Object.freeze({ proximity: 18, padding: 7, smoothing: 0.045 });
export function pickOrb(elements, x, y) {
  let best = null, distance = Infinity;
  for (const element of elements) {
    const box = element.getBoundingClientRect(), r = box.width / 2;
    const edge = Math.hypot(x - box.left - r, y - box.top - box.height / 2) - r;
    if (edge <= CROSSHAIR.proximity && edge < distance) { best = { element, box }; distance = edge; }
  }
  return best;
}
export function initCrosshair() {
  const toggle = document.querySelector('#crosshair-toggle');
  const fine = matchMedia('(any-pointer: fine)'), reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'serendipity.crosshair.enabled';
  let enabled = true, visible = false, raf = 0, last = 0, x = 0, y = 0, tx = 0, ty = 0;
  try { enabled = localStorage.getItem(storageKey) !== 'false'; } catch { /* private browsing */ }
  const overlay = document.createElement('div'); overlay.className = 'crosshair';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = '<i class="crosshair-h"></i><i class="crosshair-v"></i><i class="crosshair-dot"></i><div class="crosshair-lock"><i></i><i></i><i></i><i></i></div>';
  document.body.append(overlay);
  const h = overlay.children[0], v = overlay.children[1], dot = overlay.children[2], lock = overlay.children[3];
  const allowed = () => enabled && fine.matches && !reduce.matches && !document.hidden;
  function hide() {
    visible = false; cancelAnimationFrame(raf); raf = 0; last = 0;
    overlay.hidden = true; lock.hidden = true;
    document.documentElement.classList.remove('crosshair-active');
  }
  function frame(time) {
    raf = 0;
    if (!visible || !allowed()) { hide(); return; }
    const dt = last ? Math.min(.05, (time - last) / 1000) : .016; last = time;
    const follow = 1 - Math.exp(-dt / CROSSHAIR.smoothing);
    x += (tx - x) * follow; y += (ty - y) * follow;
    h.style.transform = `translateY(${y}px)`; v.style.transform = `translateX(${x}px)`;
    dot.style.transform = `translate(${tx}px,${ty}px)`;
    // Resolve every frame, including a stationary pointer over a drifting orb.
    const target = pickOrb(document.querySelectorAll('.orb'), tx, ty);
    lock.hidden = !target;
    if (target) {
      const b = target.box, p = CROSSHAIR.padding;
      lock.style.transform = `translate(${b.left-p}px,${b.top-p}px)`;
      lock.style.width = b.width + p*2 + 'px'; lock.style.height = b.height + p*2 + 'px';
    }
    overlay.classList.toggle('is-locked', !!target);
    raf = requestAnimationFrame(frame);
  }
  function move(event) {
    if (event.pointerType !== 'mouse' || !allowed()) { hide(); return; }
    tx = event.clientX; ty = event.clientY;
    if (!visible) { x = tx; y = ty; visible = true; overlay.hidden = false; document.documentElement.classList.add('crosshair-active'); }
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function sync() {
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.textContent = '准星 / ' + (enabled ? 'ON' : 'OFF');
    toggle.title = reduce.matches ? '减少动态效果模式：准星暂停' : '启用或关闭十字准星';
    if (!allowed()) hide();
  }
  toggle.addEventListener('click', () => { enabled = !enabled; try { localStorage.setItem(storageKey, String(enabled)); } catch {} hide(); sync(); });
  document.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') hide(); }, { passive: true });
  document.addEventListener('pointerout', e => { if (!e.relatedTarget) hide(); });
  document.addEventListener('keydown', hide);
  window.addEventListener('blur', hide); window.addEventListener('pagehide', hide);
  document.addEventListener('visibilitychange', hide);
  fine.addEventListener('change', sync); reduce.addEventListener('change', sync);
  hide(); sync();
}
initCrosshair();
