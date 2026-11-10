import {eggPreferences,saveEggPreferences,MILESTONES} from './egg-settings.js?v=20261109-eggs1';
const q=s=>document.querySelector(s),developer=q('#egg-developer'),enabled=q('#egg-enabled'),clicks=q('#egg-clicks'),stage=q('#egg-stage'),text=q('#egg-message'),status=q('#egg-save-status');
for(const count of MILESTONES){const option=document.createElement('option');option.value=String(count);option.textContent=`${count} 个空洞`;stage.append(option)}
const ending=document.createElement('option');ending.value='reset';ending.textContent='世界重置结局';stage.append(ending);
function sync(){const p=eggPreferences();developer.checked=p.developer;q('#egg-controls').disabled=!p.developer;enabled.checked=p.enabled;if(document.activeElement!==clicks)clicks.value=p.clicks;if(document.activeElement!==text)text.value=stage.value==='reset'?p.resetMessage:p.messages[stage.value]}
function save(p,reset=false){status.textContent=saveEggPreferences(p,reset)?'开发者偏好已保存在当前浏览器，未修改公开默认值或词库。':'浏览器无法保存；刷新后可能丢失。';sync()}
developer.addEventListener('change',()=>save({developer:developer.checked}));enabled.addEventListener('change',()=>save({enabled:enabled.checked}));
clicks.addEventListener('change',()=>{if(!/^[1-9]\d*$/.test(clicks.value)){clicks.setCustomValidity('请输入至少1次的正整数，不设置次数上限。');clicks.reportValidity();status.textContent='触发次数未保存；请填写正整数。';return}clicks.setCustomValidity('');save({clicks:clicks.value})});clicks.addEventListener('input',()=>clicks.setCustomValidity(''));
stage.addEventListener('change',()=>{const p=eggPreferences();text.value=stage.value==='reset'?p.resetMessage:p.messages[stage.value]});
text.addEventListener('input',()=>{if(!text.value.trim()){status.textContent='文案不能为空；原文案仍保留。';return}save(stage.value==='reset'?{resetMessage:text.value}:{messages:{[stage.value]:text.value}})});
q('#egg-defaults').addEventListener('click',()=>{save({},true);text.value=eggPreferences().messages[stage.value]||eggPreferences().resetMessage});
window.addEventListener('egg-preferences',sync);sync();
