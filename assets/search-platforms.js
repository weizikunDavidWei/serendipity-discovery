// Search providers are independent of the three presentation slots.
export const BROWSER_PROVIDERS = Object.freeze([
  Object.freeze({id:'google',label:'Google',endpoint:'https://www.google.com/search?q='}),
  Object.freeze({id:'bing',label:'必应',endpoint:'https://www.bing.com/search?q='}),
  Object.freeze({id:'yandex',label:'Yandex',endpoint:'https://yandex.com/search/?text='}),
  Object.freeze({id:'xiaohongshu',label:'小红书',endpoint:'https://www.xiaohongshu.com/search_result?keyword='}),
  Object.freeze({id:'baidu',label:'百度',endpoint:'https://www.baidu.com/s?wd='}),
]);
const providers = Object.freeze([
  Object.freeze({id:'bilibili',label:'bilibili',endpoint:'https://search.bilibili.com/all?keyword='}),
  Object.freeze({id:'youtube',label:'YouTube',endpoint:'https://www.youtube.com/results?search_query='}),
  ...BROWSER_PROVIDERS,
]);
export const PLATFORMS = Object.freeze([
  Object.freeze({id:'bilibili',label:'bilibili'}),
  Object.freeze({id:'youtube',label:'YouTube'}),
  Object.freeze({id:'browser',label:'Google'}),
]);
export const platformInfo = id => providers.find(p=>p.id===id)||providers[0];
export const isPlatform = id => PLATFORMS.some(p=>p.id===id);
export const isBrowserProvider = id => BROWSER_PROVIDERS.some(p=>p.id===id);
export const searchURL = (word,provider='bilibili') => platformInfo(provider).endpoint+encodeURIComponent(word);
