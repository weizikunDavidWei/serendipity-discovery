import {searchURL,platformInfo} from './search-platforms.js?v=20261109-browser2';
import {getSearchProvider} from './mode-controller.js?v=20261109-browser2';
import './visual-settings.js';
import { loadPublic, shuffle, randomIndex } from './data.js';
import { CONFIG } from './config.js';
import { World } from './physics.js?v=20261109-eggs1';
import { bindDrag } from './interaction.js';
import { arrange, countLimit } from './layout.js';
import { bindSlideCommit } from './slide-commit.js';
import { readScene, writeScene } from './scene-session.js?v=20261109-eggs1';
import {eggPreferences,EGG_LIMIT,RESET_THRESHOLD} from './egg-settings.js?v=20261109-eggs1';
import {eggPlacement} from './egg-geometry.js?v=20261109-eggs1';
import {bindEggInput} from './egg-input.js?v=20261109-eggs1';
import {createBroadcast} from './egg-broadcast.js?v=20261109-eggs1';
import {openConfirmedSearch} from './search-launch.js?v=20261109-eggs1';
import {setHollowBodies} from './hollow-field.js?v=20261109-eggs1';

const field = document.querySelector('#field');
const status = document.querySelector('#status');
const shuffleButton = document.querySelector('#shuffle');
shuffleButton.disabled = true;
const surprise = document.querySelector('#surprise');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let worldResetPendingExploration=false;
let data, world, shown = [], topics = [], recent = [], nodes = [];
let raf = 0, lastTime = null, active = null, keyboardHold = false;
let resizeTimer = 0, transitionTimer = 0, shuffling = false;
let pointerMode = true, confirmationHold = false, lastSaved = 0, storageAvailable = true;
function saveScene(force = false) {
  if (!world || (!force && performance.now() - lastSaved < 1000)) return;
  lastSaved = performance.now();storageAvailable = writeScene(world, topics, recent, {worldResetPendingExploration});
}

function pick(words) {
  const pool = words.filter(w => !recent.includes(w));
  const fallback = words.filter(w => w !== recent[recent.length - 1]);
  const available = pool.length ? pool : fallback.length ? fallback : words;
  const word = available[randomIndex(available.length)];
  recent.push(word);
  if (recent.length > 20) recent.shift();
  saveScene(true);
  return word;
}
function explore(words,normalTopic=false) {
  // Keep window.open in the original trusted click, without an await or timer.
  const word = pick(words);
  const url=searchURL(word,getSearchProvider());
  if(worldResetPendingExploration&&normalTopic){
    if(!openConfirmedSearch(url)){status.textContent='浏览器未打开搜索，请允许新标签页后重试。';return}
    worldResetPendingExploration=false;updateBroadcast();saveScene(true);
  }else window.open(url, '_blank', 'noopener,noreferrer');
  status.textContent = '已打开「' + word + '」 · 在 '+platformInfo(getSearchProvider()).label+' 偶然发现';
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
    if(body.egg)nodes[i].style.width=nodes[i].style.height=body.r*2+'px';
    nodes[i].style.transform = `translate3d(${(body.x - body.r).toFixed(2)}px,${(body.y - body.r).toFixed(2)}px,0)`;
  });
  setHollowBodies(world.bodies);
  if(motion.matches)document.dispatchEvent(new Event('orb-geometry'));
  saveScene();
}
function stop() {
  cancelAnimationFrame(raf); raf = 0; lastTime = null;
  if (world) world.accumulator = 0;
}
function running() {
  return world && !document.hidden && !keyboardHold && !confirmationHold && !shuffling && !field.classList.contains('is-resizing') && (!motion.matches || active?.controller?.dragging);
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
    explore:()=>{if(topic)explore(topic.keywords,true)},
    claim:()=>{if(active)return false;active={button,controller};pointerMode=true;keyboardHold=false;start();return true;},
    releaseClaim:()=>{active=null;},
    wake:()=>{pointerMode=true;keyboardHold=false;start();},
    settle:()=>{if(motion.matches){world.bodies.forEach(b=>{b.vx=0;b.vy=0;});stop();}else start();},
  });
}
// Prepare without mutating the current world/DOM. A failed allocation or layout
// must never erase the exploration that the user is trying to replace.
function prepareScene(nextTopics, previous = [], restored = null) {
  const { width, height, boxes } = geometry();
  const minimums = nextTopics.map(t => [...t.name].length > 16 ? 140 : [...t.name].length > 8 ? 110 : 0);
  let bodies = restored?.bodies || arrange(nextTopics.length, width, height, boxes, Math.random, previous, minimums);
  const nextTopicsVisible = nextTopics.slice(0, bodies.length);
  const nextWorld = new World(bodies, { width, height }, boxes);
  if (restored) { nextWorld.time = restored.time; nextWorld.solve(false, 36); }
  if (motion.matches) for (const body of bodies) { body.vx = 0; body.vy = 0; }
  const fragment = document.createDocumentFragment();
  const nextNodes = bodies.map((body, i) => {
    const topic = nextTopicsVisible[i], button = document.createElement('button');
    button.className = 'orb'; button.type = 'button'; button.dataset.topicId = topic.id;
    button.style.width = button.style.height = body.r * 2 + 'px';
    button.setAttribute('aria-label', '探索' + topic.name + '，在新标签页打开 '+platformInfo(getSearchProvider()).label);
    button.setAttribute('aria-description', '点击探索，或拖动推动其他主题。');
    const number = document.createElement('span'); number.className = 'number';
    number.textContent = String(i + 1).padStart(2, '0') + ' / ↗';
    if (body.r < 42) number.hidden = true;
    const name = document.createElement('span'); name.className = 'name'; name.textContent = topic.name;
    const length = [...topic.name].length;
    const size = Math.max(12, Math.min(48, body.r * (length > 10 ? 0.18 : length > 4 ? 0.23 : 0.29)));
    name.style.fontSize = size + 'px';
    button.append(number, name); fragment.append(button); wire(button, body, topic);
    return button;
  });
  return { world: nextWorld, topics: nextTopicsVisible, nodes: nextNodes, fragment };
}
function makeEggNode(body){const button=document.createElement('button');button.type='button';button.className='orb egg-orb';button.dataset.egg='';button.setAttribute('aria-label','空洞球体，可拖动');button.style.width=button.style.height=body.r*2+'px';wire(button,body,null);return button}
function eggCount(){return world?.bodies.filter(b=>b.egg).length||0}
const broadcast=createBroadcast(document.querySelector('#gesture-hint'),status,()=>{if(world){world.obstacles=geometry().boxes;if(motion.matches){world.solve(false);draw();}}});
function updateBroadcast(immediate=false){broadcast.render(eggCount(),worldResetPendingExploration,immediate)}
function commitScene(next) {
  cancelDrag(); stop();
  world = next.world; topics = next.topics; nodes = next.nodes;
  field.replaceChildren(next.fragment);
  shown = topics.map(t => t.id);
  document.querySelector('#theme-count').textContent = String(topics.length).padStart(2, '0') + ' / TOPICS';
  draw(); saveScene(true); start();
}
function createScene(nextTopics, previous = []) { commitScene(prepareScene(nextTopics, previous)); }
function usable(scene) {
  const { bodies, bounds, obstacles } = scene.world;
  return bodies.every((a,i) => a.x>=a.r+11 && a.y>=a.r+11 && a.x<=bounds.width-a.r-11 && a.y<=bounds.height-a.r-11 &&
    bodies.slice(i+1).every(b=>Math.hypot(a.x-b.x,a.y-b.y)>=a.r+b.r-1) &&
    obstacles.every(box=>Math.hypot(a.x-Math.max(box.x,Math.min(box.x+box.width,a.x)),a.y-Math.max(box.y,Math.min(box.y+box.height,a.y)))>=a.r+7));
}
function prepareSaved(saved) {
  const {width,height}=geometry(),same=Math.abs(width-saved.width)<1&&Math.abs(height-saved.height)<1;
  const scale=same?1:Math.min(1,width/saved.width,height/saved.height);
  const bodies=saved.bodies.map(b=>({...b,x:b.x*width/saved.width,y:b.y*height/saved.height,r:Math.max(24,b.r*scale),vx:b.vx*scale,vy:b.vy*scale}));
  let candidate=prepareScene(saved.topics,[],{bodies,time:saved.time});
  if(!usable(candidate))candidate=prepareScene(saved.topics,bodies.map(b=>({x:b.x,y:b.y})));
  for(const old of saved.eggs||[]){
    let body={...old,egg:true,r:Math.max(5,old.r*scale),x:old.x*width/saved.width,y:old.y*height/saved.height,vx:old.vx*scale,vy:old.vy*scale};
    if(!same){const place=eggPlacement(body,candidate.world.bodies,candidate.world.bounds,candidate.world.obstacles,Math.random,body.r);if(!place)continue;body={...body,x:place.x,y:place.y,r:place.r}}
    if(motion.matches)body.vx=body.vy=0;
    candidate.world.bodies.push(body);const node=makeEggNode(body);candidate.nodes.push(node);candidate.fragment.append(node);
  }
  candidate.world.solve(false,36);return candidate;
}
function spawnEgg(clientX,clientY){
  if(!world||shuffling||eggCount()>=EGG_LIMIT)return false;
  const rect=field.getBoundingClientRect(),place=eggPlacement({x:clientX-rect.left,y:clientY-rect.top},world.bodies,world.bounds,geometry().boxes);
  if(!place)return false;
  const body={x:place.x,y:place.y,r:motion.matches?place.r:1.5,vx:motion.matches?0:(Math.random()-.5)*12,vy:motion.matches?0:(Math.random()-.5)*12,phase:Math.random()*Math.PI*2,egg:true};
  if(!motion.matches)body.growth={from:1.5,target:place.r,elapsed:0};
  const node=makeEggNode(body);world.bodies.push(body);nodes.push(node);field.append(node);
  worldResetPendingExploration=false;updateBroadcast();draw();saveScene(true);document.dispatchEvent(new CustomEvent('egg-scene-change',{detail:{count:eggCount()}}));start();return true;
}
const eggInput=bindEggInput(field,{settings:eggPreferences,spawn:spawnEgg,ready:()=>!!world&&!shuffling&&!confirmationHold&&!field.classList.contains('is-resizing')});
window.addEventListener('egg-preferences',()=>updateBroadcast());
function chooseTopics() {
  const { width, height } = geometry();
  const limit = Math.min(data.topics.length, countLimit(width, height));
  const minimum = Math.min(limit, CONFIG.count.min);
  const count = minimum + randomIndex(limit - minimum + 1);
  return [...shuffle(data.topics.filter(t => !shown.includes(t.id))),
    ...shuffle(data.topics.filter(t => shown.includes(t.id)))].slice(0, count);
}
async function shuffleScene(signal) {
  if (shuffling) throw new Error('正在换一阵风');
  // All fallible scene generation happens before the old scene is touched.
  let next;
  try { next = prepareScene(chooseTopics()); }
  catch (e) { status.textContent = '未能生成新场景，当前探索已保留。'; throw e; }
  shuffling = true; cancelDrag(); stop(); saveScene(true);
  field.classList.add('is-leaving');
  try {
    await new Promise((resolve,reject)=>{
      const abort=()=>{clearTimeout(transitionTimer);signal.removeEventListener('abort',abort);reject(new DOMException('已取消','AbortError'));};
      signal.addEventListener('abort',abort,{once:true});
      transitionTimer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},motion.matches?0:CONFIG.transition.shuffle);
      if(signal.aborted)abort();
    });
    if (signal.aborted) throw new DOMException('已取消','AbortError');
    const actual = geometry();
    if (next.world.bounds.width !== actual.width || next.world.bounds.height !== actual.height) next = prepareScene(next.topics);
    field.classList.remove('is-resizing');
    const special=eggCount()>=RESET_THRESHOLD;
    worldResetPendingExploration=special||worldResetPendingExploration;
    eggInput.reset();commitScene(next);updateBroadcast();saveScene(true);
    document.dispatchEvent(new CustomEvent('egg-scene-change',{detail:{count:0}}));
    field.classList.add('is-entering');
    status.textContent = '新的方向，新的偶然。';
  } finally {
    field.classList.remove('is-leaving');shuffling=false;
    try { resizeScene(); } catch { status.textContent='窗口空间不足，当前主题已保留，请增大窗口。'; }
    start();
  }
}
function resizeScene() {
  if (!world || shuffling) return;
  const { width, height } = geometry();
  if (Math.abs(width - world.bounds.width) < 1 && Math.abs(height - world.bounds.height) < 1) return;
  const old = nodes.map(n => n.style.transform);
  const saved = {width:world.bounds.width,height:world.bounds.height,time:world.time,topics,bodies:world.bodies.filter(b=>!b.egg).map(b=>({...b})),eggs:world.bodies.filter(b=>b.egg).map(b=>({...b,r:b.growth?.target||b.r}))};
  field.classList.remove('is-entering');
  commitScene(prepareSaved(saved));updateBroadcast(true);
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
const slide = bindSlideCommit({trigger:shuffleButton,onConfirm:shuffleScene,
  onOpen:()=>{confirmationHold=true;cancelDrag();stop();saveScene(true);},
  onClose:()=>{confirmationHold=false;start();}});
document.querySelector('.edge-brand').addEventListener('click',e=>{
  if(e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();slide.close({focus:true});}
});
function updateSearchLabels(){nodes.slice(0,topics.length).forEach((node,i)=>node.setAttribute('aria-label','探索'+topics[i].name+'，在新标签页打开 '+platformInfo(getSearchProvider()).label));surprise.setAttribute('aria-label','完全随机探索，在新标签页打开 '+platformInfo(getSearchProvider()).label);}
window.addEventListener('search-platform-change',updateSearchLabels);window.addEventListener('browser-provider-change',updateSearchLabels);updateSearchLabels();
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
  saveScene(true);cancelDrag(false); stop(); if (!document.hidden) start();
});
motion.addEventListener('change', () => {
  cancelDrag(false); stop();
  if (world && motion.matches) world.bodies.forEach(b => { b.vx = 0; b.vy = 0; });
  start();
});
const observer = new ResizeObserver(() => { try { resizeScene(); } catch (e) { showError(e); } });
observer.observe(field);
window.addEventListener('blur', () => { cancelDrag(false); });
window.addEventListener('pagehide', () => { saveScene(true);cancelDrag(false); stop(); });
window.addEventListener('pageshow', start);
loadPublic().then(d => {
  data = d;
  const saved = readScene(data);let restored = false;
  if(saved){try{worldResetPendingExploration=saved.worldResetPendingExploration;commitScene(prepareSaved(saved));recent=saved.recent;saveScene(true);restored=true;}catch{/* invalid/unusable: fresh initialization below */}}
  if(!restored){worldResetPendingExploration=false;createScene(chooseTopics());}
  updateBroadcast(true);document.dispatchEvent(new CustomEvent('egg-scene-change',{detail:{count:eggCount()}}));
  field.setAttribute('aria-busy', 'false'); shuffleButton.disabled = false; slide.setEnabled(true); surprise.disabled = false;
  status.textContent = storageAvailable ? (restored?'已恢复当前标签页的探索现场。':'不记录兴趣，只保留好奇。') : '浏览器无法保存现场；刷新后可能重新开始探索。';
}).catch(e => { field.setAttribute('aria-busy', 'false'); showError(e); });
