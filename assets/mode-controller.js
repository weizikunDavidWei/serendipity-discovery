import {isPlatform} from './search-platforms.js?v=20261109-browser2';
import {getBrowserProvider} from './browser-preferences.js?v=20261109-browser2';
export const PLATFORM_KEY='serendipity.search.platform.v1';
// The old Google segment is now the configurable browser slot. Preserve selection.
const normalize=id=>id==='google'?'browser':id;
function read(){try{const id=normalize(localStorage.getItem(PLATFORM_KEY));return isPlatform(id)?id:'bilibili'}catch{return 'bilibili'}}
let current=read();
export const getPlatform=()=>current;
export const getSearchProvider=()=>current==='browser'?getBrowserProvider():current;
function apply(id){if(id===current)return false;current=id;document.documentElement.dataset.searchPlatform=id;window.dispatchEvent(new CustomEvent('search-platform-change',{detail:{platform:id}}));return true;}
export function setPlatform(id){id=normalize(id);if(!isPlatform(id))return false;try{localStorage.setItem(PLATFORM_KEY,id)}catch{/* selection remains usable in this page */}return apply(id);}
document.documentElement.dataset.searchPlatform=current;
window.addEventListener('storage',e=>{if(e.key===PLATFORM_KEY||e.key===null)apply(read())});

// Safari may restore a frozen page after settings changed elsewhere. Re-read
// persisted preferences without rebuilding the scene or the control.
const resync=()=>apply(read());
window.addEventListener('pageshow',resync);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)resync()});
