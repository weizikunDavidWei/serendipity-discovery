// Pure search adapters: no exploration state or presentation dependencies.
export const PLATFORMS=Object.freeze([
  Object.freeze({id:'bilibili',label:'bilibili',endpoint:'https://search.bilibili.com/all?keyword='}),
  Object.freeze({id:'youtube',label:'YouTube',endpoint:'https://www.youtube.com/results?search_query='}),
  Object.freeze({id:'google',label:'Google',endpoint:'https://www.google.com/search?q='}),
]);
export const platformInfo=id=>PLATFORMS.find(p=>p.id===id)||PLATFORMS[0];
export const isPlatform=id=>PLATFORMS.some(p=>p.id===id);
export const searchURL=(word,platform='bilibili')=>platformInfo(platform).endpoint+encodeURIComponent(word);
