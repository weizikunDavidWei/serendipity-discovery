import {defaults,preferences,savePreferences,renderToggle} from './visual-settings.js';
import {mountTerrain} from './topolines.js?v=20261109-eggs1';
const range=document.querySelector('#terrain-opacity'), style=document.querySelector('#toggle-style'), output=document.querySelector('#terrain-opacity-value');
mountTerrain(document.querySelector('#terrain-preview'));
function sync(){const p=preferences();document.querySelector('#hollow-enabled').checked=p.hollowEnabled;document.querySelector('#hollow-state').textContent='空间扭曲 / '+(p.hollowEnabled?'ON':'OFF');document.querySelector('#hollow-size').value=Math.round(p.hollowSize*100);document.querySelector('#hollow-size-value').value=Math.round(p.hollowSize*100)+'%';range.value=Math.round(p.opacity*100);output.value=range.value+'%';style.value=p.toggleStyle;document.querySelector('#font-weight').value=p.fontWeight;document.querySelector('#terrain-enabled').checked=p.enabled;
 renderToggle(document.querySelector('#preview-crosshair'),'准星',true,'crosshair');renderToggle(document.querySelector('#preview-terrain'),'等高线',p.enabled,'topolines');}
function save(p,reset=false){const ok=savePreferences(p,reset);document.querySelector('#visual-save-status').textContent=ok?'个人设置已保存在当前浏览器；未修改公开默认配置。':'浏览器无法保存；当前预览有效，刷新后可能丢失。';}
document.querySelector('#font-weight').addEventListener('change',e=>save({fontWeight:e.target.value}));
range.addEventListener('input',()=>save({opacity:Number(range.value)/100}));style.addEventListener('change',()=>save({toggleStyle:style.value}));
document.querySelector('#terrain-enabled').addEventListener('change',e=>save({enabled:e.target.checked}));
document.querySelector('#visual-reset').addEventListener('click',()=>save({},true));
document.querySelector('#hollow-enabled').addEventListener('change',e=>save({hollowEnabled:e.target.checked}));
document.querySelector('#hollow-size').addEventListener('input',e=>save({hollowSize:Number(e.target.value)/100}));
document.querySelector('#hollow-reset').addEventListener('click',()=>save({hollowEnabled:true,hollowSize:defaults.hollowSize}));
window.addEventListener('visual-preferences',sync);sync();
