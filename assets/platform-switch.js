import {PLATFORMS,platformInfo} from './search-platforms.js';
import {getPlatform,setPlatform} from './mode-controller.js';
import {getBrowserProvider} from './browser-preferences.js';
import {bindRubberSegment} from './rubber-segment.js';
const root=document.querySelector('#platform-switch');
if(root){
  const items=PLATFORMS.map(item=>item.id==='browser'?{...item,label:platformInfo(getBrowserProvider()).label}:item);
  const segment=bindRubberSegment(root,{items,value:getPlatform(),onChange:setPlatform});
  window.addEventListener('search-platform-change',e=>segment.setValue(e.detail.platform));
  window.addEventListener('browser-provider-change',()=>segment.setLabel('browser',platformInfo(getBrowserProvider()).label));
}
