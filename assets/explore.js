import { loadPublic, shuffle, randomIndex, searchURL } from './data.js';
import { CONFIG } from './config.js';
import { World } from './physics.js';
import { bindDrag } from './interaction.js';
import { arrange, countLimit } from './layout.js';

const field = document.querySelector('#field');
const status = document.querySelector('#status');
const shuffleButton = document.querySelector('#shuffle');
const surprise = document.querySelector('#surprise');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let data, world, shown = [], topics = [], recent = [], nodes = [];
let raf = 0, lastTime = null, active = null, keyboardHold = false;
let resizeTimer = 0, transitionTimer = 0, shuffling = false;
let pointerMode = true;

function pick(words) {
  const pool = words.filter(w => !recent.includes(w));
  const fallback = words.filter(w => w !== recent[recent.length - 1]);
  const available = pool.length ? pool : fallback.length ? fallback : words;
  const word = available[randomIndex(available.length)];
  recent.push(word);
  if (recent.length > 20) recent.shift();
  return word;
}
function explore(words) {
  // Keep window.open in the original trusted click, without an await or timer.
  const word = pick(words);
  window.open(searchURL(word), '_blank', 'noopener,noreferrer');
  status.textContent = '已打开「' + word + '」 · 在 Bilibili 偶然发现';
}
function geometry() {
  const rect = field.getBoundingClientRect();
  const boxes = [...document.querySelectorAll('[data-obstacle]')].map(el => {
    const r = el.getBoundingClientRect();
    return { x: r.left - rect.left - 6, y: r.top - rect.top - 6, width: r.width + 12, height: r.height + 12 };
  });
  return { width: rect.width, height: rect.height, boxes };
}
function draw() {
  world.bodies.forEach((body, i) => {
    nodes[i].style.transform = `translate3d(${(body.x - body.r).toFixed(2)}px,${(body.y - body.r).toFixed(2)}px,0)`;
  });
  if(motion.matches)document.dispatchEvent(new Event('orb-geometry'));
}
function stop() {
  cancelAnimationFrame(raf); raf = 0; lastTime = null;
  if (world) world.accumulator = 0;
}
function running() {
  return world && !document.hidden && !keyboardHold && !shuffling && !field.classList.contains('is-resizing') && (!motion.matches || active?.controller?.dragging);
}
function tick(time) {
  raf = 0;
  if (!running()) { lastTime = null; return; }
  if (lastTime !== null) world.advance((time - lastTime) / 1000);
  lastTime = time;
  draw();
  raf = requestAnimationFrame(tick);
}
function start() {
  field.classList.toggle('is-static', motion.matches || keyboardHold);
  if (!raf && running()) { lastTime = null; raf = requestAnimationFrame(tick); }
}
function cancelDrag() {
  active?.controller?.cancel();
  active = null;
}
function wire(button, body, topic) {
  let controller;
  controller = bindDrag(button,body,{
    getWorld:()=>world, reduced:()=>motion.matches,
    explore:()=>explore(topic.keywords),
    claim:()=>{if(active)return false;active={button,controller};pointerMode=true;keyboardHold=false;start();return true;},
    releaseClaim:()=>{active=null;},
    wake:()=>{pointerMode=true;keyboardHold=false;start();},
    settle:()=>{if(motion.matches){world.bodies.forEach(b=>{b.vx=0;b.vy=0;});stop();}else start();},
  });
}
function createScene(nextTopics, previous = []) {
  cancelDrag(false); stop();
  const { width, height, boxes } = geometry();
  const minimums = nextTopics.map(t => [...t.name].length > 16 ? 140 : [...t.name].length > 8 ? 110 : 0);
  const bodies = arrange(nextTopics.length, width, height, boxes, Math.random, previous, minimums);
  topics = nextTopics.slice(0, bodies.length);
  world = new World(bodies, { width, height }, boxes);
  if (motion.matches) for (const body of bodies) { body.vx = 0; body.vy = 0; }
  field.replaceChildren();
  nodes = bodies.map((body, i) => {
    const topic = topics[i], button = document.createElement('button');
    button.className = 'orb'; button.type = 'button';
    button.style.width = button.style.height = body.r * 2 + 'px';
    button.setAttribute('aria-label', '探索' + topic.name + '，在新标签页打开 Bilibili');
    button.setAttribute('aria-description', '点击探索，或拖动推动其他主题。');
    const number = document.createElement('span'); number.className = 'number';
    number.textContent = String(i + 1).padStart(2, '0') + ' / ↗';
    if (body.r < 42) number.hidden = true;
    const name = document.createElement('span'); name.className = 'name'; name.textContent = topic.name;
    const length = [...topic.name].length;
    const size = Math.max(12, Math.min(48, body.r * (length > 10 ? 0.18 : length > 4 ? 0.23 : 0.29)));
    name.style.fontSize = size + 'px';
    button.append(number, name); field.append(button); wire(button, body, topic);
    return button;
  });
  shown = topics.map(t => t.id);
  document.querySelector('#theme-count').textContent = String(topics.length).padStart(2, '0') + ' / TOPICS';
  draw(); start();
}
function chooseTopics() {
  const { width, height } = geometry();
  const limit = Math.min(data.topics.length, countLimit(width, height));
  const minimum = Math.min(limit, CONFIG.count.min);
  const count = minimum + randomIndex(limit - minimum + 1);
  return [...shuffle(data.topics.filter(t => !shown.includes(t.id))),
    ...shuffle(data.topics.filter(t => shown.includes(t.id)))].slice(0, count);
}
function shuffleScene() {
  if (shuffling) return;
  shuffling = true; cancelDrag(false); stop(); shuffleButton.disabled = true;
  field.classList.add('is-leaving');
  clearTimeout(transitionTimer);
  transitionTimer = setTimeout(() => {
    try {
      field.classList.remove('is-resizing');
      createScene(chooseTopics());
      field.classList.remove('is-leaving'); field.classList.add('is-entering');
      status.textContent = '新的方向，新的偶然。';
    } catch (e) { showError(e); }
    shuffling = false; shuffleButton.disabled = false; start();
  }, motion.matches ? 0 : CONFIG.transition.shuffle);
}
function resizeScene() {
  if (!world || shuffling) return;
  const { width, height } = geometry();
  if (Math.abs(width - world.bounds.width) < 1 && Math.abs(height - world.bounds.height) < 1) return;
  const previous = world.bodies.map(b => ({ x: b.x * width / world.bounds.width, y: b.y * height / world.bounds.height }));
  const old = nodes.map(n => n.style.transform);
  const limit = countLimit(width, height);
  field.classList.remove('is-entering');
  createScene(topics.slice(0, limit), previous);
  stop();
  if (!motion.matches) {
    const targets = nodes.map(n => n.style.transform);
    nodes.forEach((n, i) => { n.style.transform = old[i] || targets[i]; });
    // Flush only once at resize, never during the physics loop.
    field.getBoundingClientRect();
    field.classList.add('is-resizing');
    nodes.forEach((n, i) => { n.style.transform = targets[i]; });
  }
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { field.classList.remove('is-resizing'); start(); }, motion.matches ? 0 : CONFIG.transition.resize);
}
function showError(e) {
  stop(); status.textContent = e.message;
  if (!field.querySelector('.retry')) {
    const button = document.createElement('button'); button.className = 'retry'; button.textContent = '重新装载';
    button.onclick = () => location.reload(); field.append(button);
  }
}
shuffleButton.addEventListener('click', shuffleScene);
surprise.addEventListener('click', () => explore(data.topics.flatMap(t => t.keywords)));
document.addEventListener('pointerdown',()=>{pointerMode=true;keyboardHold=false;start();},{capture:true});
document.addEventListener('keydown',e=>{if(e.key==='Tab'||e.key.startsWith('Arrow'))pointerMode=false;},{capture:true});
field.addEventListener('focusin', () => {
  keyboardHold = !pointerMode && document.activeElement.matches(':focus-visible');
  if (keyboardHold) stop();
});
field.addEventListener('focusout', () => {
  // Focus can move directly from one orb to another.
  queueMicrotask(() => {
    keyboardHold = !pointerMode && field.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
    if (!keyboardHold) start();
  });
});
document.addEventListener('visibilitychange', () => {
  cancelDrag(false); stop(); if (!document.hidden) start();
});
motion.addEventListener('change', () => {
  cancelDrag(false); stop();
  if (world && motion.matches) world.bodies.forEach(b => { b.vx = 0; b.vy = 0; });
  start();
});
const observer = new ResizeObserver(() => { try { resizeScene(); } catch (e) { showError(e); } });
observer.observe(field);
window.addEventListener('blur', () => { cancelDrag(false); });
window.addEventListener('pagehide', () => { cancelDrag(false); stop(); });
window.addEventListener('pageshow', start);
loadPublic().then(d => {
  data = d; createScene(chooseTopics());
  field.setAttribute('aria-busy', 'false'); shuffleButton.disabled = false; surprise.disabled = false;
  status.textContent = '不记录兴趣，只保留好奇。';
}).catch(e => { field.setAttribute('aria-busy', 'false'); showError(e); });
