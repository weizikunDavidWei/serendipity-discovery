import {PLATFORMS} from './search-platforms.js';
import {getPlatform,setPlatform} from './mode-controller.js';
import {bindRubberSegment} from './rubber-segment.js';
const root=document.querySelector('#platform-switch');
if(root){const segment=bindRubberSegment(root,{items:PLATFORMS,value:getPlatform(),onChange:setPlatform});window.addEventListener('search-platform-change',e=>segment.setValue(e.detail.platform));}
