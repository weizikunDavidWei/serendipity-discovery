import {PLATFORMS,platformInfo} from './search-platforms.js?v=20261109-browser2';
import {getPlatform,setPlatform} from './mode-controller.js?v=20261109-browser2';
import {getBrowserProvider} from './browser-preferences.js?v=20261109-browser2';
import {bindRubberSegment} from './rubber-segment.js?v=20261109-browser2';
const root=document.querySelector('#platform-switch');
if(root){
  const items=PLATFORMS.map(item=>item.id==='browser'?{...item,label:platformInfo(getBrowserProvider()).label}:item);
  const segment=bindRubberSegment(root,{items,value:getPlatform(),onChange:setPlatform});
  window.addEventListener('search-platform-change',e=>segment.setValue(e.detail.platform));
  window.addEventListener('browser-provider-change',()=>segment.setLabel('browser',platformInfo(getBrowserProvider()).label));
}
