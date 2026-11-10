export const EGG_KEY='serendipity.easter.preferences.v1';
export const EGG_LIMIT=30, RESET_THRESHOLD=7, CLICK_INTERVAL=500;
export const MILESTONES=[1,2,3,5,7,10,12,15,18,20,23,25,28,29,30];
const lines=[
'空洞生成！治安局正在确认鼠标是否合法。',
'第二处空洞已登记，调查协会建议市民停止双倍好奇。',
'三处空洞，绳匠开始按鼠标点击次数计费。',
'五处异常已立案，萝卜导航申请绕开你的光标。',
'七处空洞同时营业，治安局正在寻找城市重置按钮。',
'十处空洞，调查协会决定把事故地图改成抽象画。',
'十二份报告已归档，盗洞客申请将鼠标列为专业设备。',
'十五处空洞，绳匠的加班申请已进入另一处空洞。',
'十八处异常，以太资源部门表示库存充足，城市除外。',
'二十处空洞，治安局建议先给现实留一个出口。',
'二十三处异常，萝卜导航现提供原地迷路服务。',
'二十五处空洞，事故责任书已超过安全承重。',
'二十八处异常，调查协会正在调查调查协会去了哪里。',
'二十九处空洞，新艾利都尚余一份乐观的统计口径。',
'新艾利都重大空洞灾害：事故原因，市民觉得好玩。'];
export const eggDefaults=Object.freeze({developer:false,enabled:true,clicks:'5',messages:Object.freeze(Object.fromEntries(MILESTONES.map((n,i)=>[n,lines[i]]))),resetMessage:'世界已重置，欢迎来到新艾利都。'});
function cleanText(value,fallback){return typeof value==='string'&&value.trim()&&value.trim().length<=300&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)?value.trim():fallback}
export function sanitizeEggSettings(raw){const messages={};for(const n of MILESTONES)messages[n]=cleanText(raw?.messages?.[n],eggDefaults.messages[n]);return {developer:raw?.developer===true,enabled:raw?.enabled!==false,clicks:typeof raw?.clicks==='string'&&/^[1-9]\d*$/.test(raw.clicks)?raw.clicks:'5',messages,resetMessage:cleanText(raw?.resetMessage,eggDefaults.resetMessage)}}
function read(){try{return sanitizeEggSettings(JSON.parse(localStorage.getItem(EGG_KEY)))}catch{return sanitizeEggSettings(null)}}
let current=read();
export const eggPreferences=()=>({...current,messages:{...current.messages}});
export function saveEggPreferences(patch,reset=false){current=sanitizeEggSettings(reset?null:{...current,...patch,messages:{...current.messages,...patch.messages}});let saved=true;try{localStorage.setItem(EGG_KEY,JSON.stringify(current))}catch{saved=false}window.dispatchEvent(new Event('egg-preferences'));return saved}
function sync(){current=read();window.dispatchEvent(new Event('egg-preferences'))}
window.addEventListener('storage',e=>{if(e.key===EGG_KEY||e.key===null)sync()});window.addEventListener('pageshow',sync);
export function disasterMessage(count,p=current){const reached=MILESTONES.filter(n=>n<=count),n=reached[reached.length-1];return n?p.messages[n]:''}
