const KEY = 'serendipity.visual.preferences.v1';
const fallback = {schemaVersion:1,topolines:{enabled:true,speed:.005,scale:2.29,levels:10,lineWidth:1.7,warp:.12,opacity:.22,maxDpr:1.25},toggleStyle:'text',fontWeight:'bold',hollowEnabled:true,hollowSize:.01};
export let defaults = fallback;
try {
  const r = await fetch(new URL('../data/visual-defaults.json',import.meta.url));
  if (!r.ok) throw Error('config');
  const d = await r.json();
  if(d.schemaVersion===1) defaults={...fallback, ...d,topolines:{...fallback.topolines,...d.topolines}};
} catch { /* Offline: use the same bundled public defaults. */ }
function sanitize(p) {
  return {hollowEnabled:typeof p?.hollowEnabled==='boolean'?p.hollowEnabled:defaults.hollowEnabled,hollowSize:typeof p?.hollowSize==='number'&&Number.isFinite(p.hollowSize)?Math.max(0,Math.min(1,p.hollowSize)):defaults.hollowSize,fontWeight:['regular','bold'].includes(p?.fontWeight)?p.fontWeight:defaults.fontWeight,opacity:typeof p?.opacity==='number'&&Number.isFinite(p.opacity)?Math.min(1,Math.max(0,p.opacity)):defaults.topolines.opacity,
    enabled:typeof p?.enabled==='boolean'?p.enabled:defaults.topolines.enabled,
    toggleStyle:['text','compact','minimal'].includes(p?.toggleStyle)?p.toggleStyle:defaults.toggleStyle};
}
function read(){try{return sanitize(JSON.parse(localStorage.getItem(KEY)))}catch{return sanitize(null)}}
let current=read();
function applyTypography(){document.documentElement.dataset.fontWeight=current.fontWeight;}
applyTypography();
export const preferences=()=>({...current});
export function savePreferences(p,reset=false){
  current=sanitize(reset?null:{...current,...p});
  applyTypography();
  let saved=true;
  try {localStorage.setItem(KEY,JSON.stringify(current))}catch{saved=false}
  window.dispatchEvent(new CustomEvent('visual-preferences',{detail:preferences()}));
  return saved;
}
window.addEventListener('storage',e=>{if(e.key===KEY||e.key===null){current=read();applyTypography();window.dispatchEvent(new Event('visual-preferences'));}});
const paths={crosshair:'M8 1v14M1 8h14M5 5h6v6H5z',topolines:'M1 12c3-8 8-8 14 0M2 8c3-6 7-6 12 0M4 4c2-3 5-3 8 0'};
export function renderToggle(button,label,on,kind){
  const style=current.toggleStyle;
  button.replaceChildren(); button.dataset.toggleStyle=style;
  button.setAttribute('aria-pressed',String(on));button.setAttribute('aria-label',label);
  if(style!=='text'){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 16 16');svg.setAttribute('aria-hidden','true');
    const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[kind]);svg.append(path);button.append(svg);
  }
  const text=document.createElement('span');text.className='toggle-state';
  text.textContent=style==='text'?`${label} / ${on?'ON':'OFF'}`:style==='compact'?(on?'ON':'OFF'):(on?'●':'○');button.append(text);
}
