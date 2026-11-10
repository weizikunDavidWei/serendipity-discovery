import {BROWSER_PROVIDERS} from './search-platforms.js?v=20261109-browser2';
import {getBrowserProvider,saveBrowserProvider} from './browser-preferences.js?v=20261109-browser2';
const select=document.querySelector('#browser-provider'),status=document.querySelector('#browser-save-status');
for(const provider of BROWSER_PROVIDERS){const option=document.createElement('option');option.value=provider.id;option.textContent=provider.label;select.append(option)}
function sync(){select.value=getBrowserProvider()}
select.disabled=false;sync();
select.addEventListener('change',()=>{
  const saved=saveBrowserProvider(select.value);
  status.textContent=saved?'已保存至当前浏览器；首页标签与搜索目标已同步。':'浏览器无法保存设置，请允许本地存储后重试。';
});
window.addEventListener('browser-provider-change',sync);
