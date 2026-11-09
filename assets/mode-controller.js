import {isPlatform} from './search-platforms.js';
export const PLATFORM_KEY='serendipity.search.platform.v1';
function read(){try{const id=localStorage.getItem(PLATFORM_KEY);return isPlatform(id)?id:'bilibili'}catch{return 'bilibili'}}
let current=read();
export const getPlatform=()=>current;
function apply(id){if(id===current)return false;current=id;document.documentElement.dataset.searchPlatform=id;window.dispatchEvent(new CustomEvent('search-platform-change',{detail:{platform:id}}));return true;}
export function setPlatform(id){if(!isPlatform(id))return false;try{localStorage.setItem(PLATFORM_KEY,id)}catch{/* selection remains usable in this page */}return apply(id);}
document.documentElement.dataset.searchPlatform=current;
window.addEventListener('storage',e=>{if(e.key===PLATFORM_KEY||e.key===null)apply(read())});
