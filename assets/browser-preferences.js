import {isBrowserProvider} from './search-platforms.js';
export const BROWSER_KEY = 'serendipity.search.browser-provider.v1';
function read(){try{const id=localStorage.getItem(BROWSER_KEY);return isBrowserProvider(id)?id:'google'}catch{return 'google'}}
let current=read();
export const getBrowserProvider=()=>current;
function apply(id){
  if(id===current)return;
  current=id;
  window.dispatchEvent(new CustomEvent('browser-provider-change',{detail:{provider:id}}));
}
export function saveBrowserProvider(id){
  if(!isBrowserProvider(id))return false;
  let saved=true;
  try{localStorage.setItem(BROWSER_KEY,id)}catch{saved=false}
  apply(id);
  return saved;
}
window.addEventListener('storage',e=>{if(e.key===BROWSER_KEY||e.key===null)apply(read())});
