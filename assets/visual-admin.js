import {preferences,savePreferences,renderToggle} from './visual-settings.js';
import {mountTerrain} from './topolines.js';
const range=document.querySelector('#terrain-opacity'), style=document.querySelector('#toggle-style'), output=document.querySelector('#terrain-opacity-value');
mountTerrain(document.querySelector('#terrain-preview'));
function sync(){const p=preferences();range.value=Math.round(p.opacity*100);output.value=range.value+'%';style.value=p.toggleStyle;document.querySelector('#terrain-enabled').checked=p.enabled;
 renderToggle(document.querySelector('#preview-crosshair'),'准星',true,'crosshair');renderToggle(document.querySelector('#preview-terrain'),'等高线',p.enabled,'topolines');}
function save(p,reset=false){const ok=savePreferences(p,reset);document.querySelector('#visual-save-status').textContent=ok?'个人设置已保存在当前浏览器；未修改公开默认配置。':'浏览器无法保存；当前预览有效，刷新后可能丢失。';}
range.addEventListener('input',()=>save({opacity:Number(range.value)/100}));style.addEventListener('change',()=>save({toggleStyle:style.value}));
document.querySelector('#terrain-enabled').addEventListener('change',e=>save({enabled:e.target.checked}));
document.querySelector('#visual-reset').addEventListener('click',()=>save({},true));
window.addEventListener('visual-preferences',sync);sync();
