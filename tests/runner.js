import {runReleaseTests,runArrowTests,runPointerReleaseTests} from './bugfix-tests.js';
import {SCENE_KEY} from '../assets/scene-session.js';
import {runPhysicsTests} from './physics-tests.js';
import {validate,loadPublic,searchURL,csvEncode,csvParse,randomIndex,shuffle} from '../assets/data.js';
const $=s=>document.querySelector(s);let passed=0,failed=0,frame;
function assert(ok,message){if(!ok)throw new Error(message);}
async function test(name,fn){const li=document.createElement('li');try{await fn();passed++;li.textContent='PASS · '+name;}catch(e){failed++;li.className='fail';li.textContent='FAIL · '+name+' — '+e.message;}$('#results').append(li);}
async function wait(fn){for(let n=0;n<100;n++){if(fn())return;await new Promise(r=>setTimeout(r,25));}throw new Error('等待页面状态超时');}
async function open(path,width=1440,fixture=false){if(frame)frame.remove();sessionStorage.removeItem(SCENE_KEY);frame=document.createElement('iframe');frame.style.width=width+'px';frame.style.height='1100px';$('#preview').append(frame);const loaded=new Promise((r,j)=>{frame.onload=r;frame.onerror=j;});if(fixture){const html=await(await fetch('../index.html')).text();const bootstrap=`<script>
 const actualMedia=window.matchMedia.bind(window);const reduced=new EventTarget();reduced.matches=true;reduced.media='(prefers-reduced-motion: reduce)';
 window.matchMedia=q=>q===reduced.media?reduced:actualMedia(q);
 window.testMotion=value=>{reduced.matches=value;reduced.dispatchEvent(new Event('change'));};
 const actualRAF=window.requestAnimationFrame.bind(window);window.testFrames=[];let last=0;
 window.requestAnimationFrame=fn=>actualRAF(time=>{if(last&&window.testFrames.length<180)window.testFrames.push(time-last);last=time;fn(time);});
 </scr`+`ipt>`;frame.srcdoc=html.replace('<head>','<head><base href="'+new URL('../',location.href).href+'">'+bootstrap);}else frame.src='../'+path;await loaded;await wait(()=>frame.contentDocument.querySelector(path.startsWith('admin')?'#workspace:not([hidden])':'.orb'));if(fixture)frame.scrollIntoView({block:'start'});return frame.contentWindow;}
function click(w,s){w.document.querySelector(s).click();}
async function confirmShuffle(w){click(w,'#shuffle');const grip=w.document.querySelector('.slide-grip');for(const key of ['End','Enter'])grip.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));await wait(()=>w.document.querySelector('.slide-panel').hidden);}
function fill(w,s,value){const input=w.document.querySelector(s);input.value=value;input.dispatchEvent(new w.Event('input',{bubbles:true}));}
function submit(w,s){w.document.querySelector(s).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));}
const status=w=>w.document.querySelector('#admin-status').textContent;
function layout(w){const d=w.document;assert(d.documentElement.scrollWidth<=w.innerWidth+1,'页面水平溢出');const nodes=[...d.querySelectorAll('.orb')],r=nodes.map(e=>e.getBoundingClientRect());for(let i=0;i<r.length;i++){assert(Math.abs(r[i].width-r[i].height)<2,'圆圈形状失真');assert(r[i].left>=-1&&r[i].right<=w.innerWidth+1&&r[i].top>=-1&&r[i].bottom<=w.innerHeight+1,'圆圈越界');assert(nodes[i].scrollWidth<=nodes[i].clientWidth+2,'圆圈文字溢出');for(let j=i+1;j<r.length;j++)assert(Math.hypot((r[i].left+r[i].width/2)-(r[j].left+r[j].width/2),(r[i].top+r[i].height/2)-(r[j].top+r[j].height/2))>=r[i].width/2+r[j].width/2-1,'圆圈重叠');}}
const mediaRules=new WeakMap();
function forceMedia(w,feature,enabled){if(!mediaRules.has(w)){const rules=[];for(const sheet of w.document.styleSheets)for(const rule of sheet.cssRules)if(rule instanceof w.CSSMediaRule)rules.push({rule,original:rule.conditionText});mediaRules.set(w,rules);}for(const {rule,original} of mediaRules.get(w))if(original.includes(feature))rule.media.mediaText=enabled?'all':'not all';}
const settle=()=>new Promise(r=>setTimeout(r,300));
$('#run').onclick=async()=>{
 $('#run').disabled=true;$('#results').replaceChildren();passed=0;failed=0;const priorScene=sessionStorage.getItem(SCENE_KEY);const keys=['serendipity.draft.v1','serendipity.history.v1'],prior=keys.map(k=>localStorage.getItem(k));keys.forEach(k=>localStorage.removeItem(k));
 try{
 const data=await (await fetch('../data/keywords.json')).json();
 await runPhysicsTests(test,assert);
 await runReleaseTests(test,assert);
 await runPointerReleaseTests(data,test,assert);
 await test('初始词库：16 个领域 / 240 个关键词，全库无重复',()=>{const d=validate(data);assert(d.topics.length===16,'主题数量');assert(d.topics.flatMap(t=>t.keywords).length===240,'词条数量');});
 await test('中文及特殊字符 URL 编码往返正确',()=>{for(const s of ['中文关键词','A&B #声音 + 空间','量子纠缠']){const u=new URL(searchURL(s));assert(u.origin==='https://search.bilibili.com'&&u.searchParams.get('keyword')===s,'编码错误');}});
 await test('拒绝空值、重复、无效 ID 和控制字符；不执行 HTML',()=>{for(const change of [d=>d.topics[0].keywords.push('詹姆斯韦布空间望远镜'),d=>d.topics[0].keywords.push(' '),d=>d.topics[0].id='a/b',d=>d.topics[0].keywords.push('a\nb')]){const d=structuredClone(data);change(d);let rejected=false;try{validate(d);}catch{rejected=true;}assert(rejected,'应拒绝无效输入');}});
 await test('CSV 引号、逗号、中文和公式前缀安全往返；拒绝破损格式',()=>{const d={schemaVersion:1,topics:[{id:'csv',name:'测试,主题',keywords:['中文"引号"','A,B','=SUM(A1)']}]};assert(JSON.stringify(csvParse(csvEncode(d)).topics[0].keywords)===JSON.stringify(d.topics[0].keywords),'CSV 往返不一致');let rejected=false;try{csvParse('topic,keyword\nx,"unclosed');}catch{rejected=true;}assert(rejected,'应拒绝不闭合引号');});
 await test('随机索引有效且 Fisher–Yates 保留全部元素',()=>{for(let i=0;i<1000;i++)assert(randomIndex(15)<15,'索引越界');assert(shuffle([1,2,3,4]).sort().join()==='1,2,3,4','随机主题丢失');});
 let w=await open('');
 await test('桌面 1440：5–9 个不同圆圈，无重叠、越界或文字溢出',()=>{layout(w);const count=w.document.querySelectorAll('.orb').length;assert(count>=5&&count<=9,'数量范围错误');});
 await test('浅色模式：白底黑圆白字',async()=>{forceMedia(w,'prefers-color-scheme',false);await settle();assert(w.getComputedStyle(w.document.documentElement).getPropertyValue('--bg').trim()==='#fff','背景');const orb=w.document.querySelector('.orb');assert(w.getComputedStyle(orb).backgroundColor==='rgb(0, 0, 0)'&&w.getComputedStyle(orb).color==='rgb(255, 255, 255)','圆圈颜色');});
 await test('实时切换深色：黑底白圆黑字',async()=>{forceMedia(w,'prefers-color-scheme',true);await settle();const orb=w.document.querySelector('.orb');assert(w.getComputedStyle(w.document.documentElement).getPropertyValue('--bg').trim()==='#000','背景');assert(w.getComputedStyle(orb).backgroundColor==='rgb(255, 255, 255)'&&w.getComputedStyle(orb).color==='rgb(0, 0, 0)','圆圈颜色');});
 await test('标志与版式：™、大型↘入口、无旧Hero或网格',()=>{assert(w.document.querySelector('.brand-dot').textContent==='™','品牌符号');assert(w.document.querySelector('svg.direction path'),'矢量箭头丢失');assert(!w.document.querySelector('.intro,.field-label,footer'),'旧分区残留');assert(w.getComputedStyle(w.document.querySelector('#field')).display!=='grid','网格残留');});
 await runArrowTests(w,test,assert,forceMedia);
 await test('换组、同步中文新窗口、近期去重与完全随机',async()=>{w=await open('');await confirmShuffle(w);let opened=[];w.open=(...args)=>opened.push(args);const button=w.document.querySelector('.orb'),topic=data.topics.find(t=>button.textContent.includes(t.name));for(let i=0;i<15;i++)button.click();const words=opened.map(a=>new URL(a[0]).searchParams.get('keyword'));assert(opened.length===15,'非同步打开');assert(new Set(words).size===15,'周期内重复');assert(words.every(x=>topic.keywords.includes(x)),'错主题');click(w,'#surprise');assert(opened.length===16,'完全随机失败');});
 await test('鼠标与触摸：小幅移动可点击，拖动后抑制搜索，键盘点击保留',async()=>{
  let opened=[];w.open=(...args)=>opened.push(args);w.HTMLElement.prototype.setPointerCapture=function(){};w.HTMLElement.prototype.hasPointerCapture=()=>false;
  const b=w.document.querySelector('.orb');
  const event=(type,x,y,kind)=>b.dispatchEvent(new w.PointerEvent(type,{bubbles:true,cancelable:true,pointerId:1,isPrimary:true,pointerType:kind,button:0,clientX:x,clientY:y}));
  for(const kind of ['mouse','touch']){event('pointerdown',400,400,kind);event('pointermove',402,401,kind);event('pointerup',402,401,kind);b.dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1}));assert(opened.length>0,'轻触未搜索');const count=opened.length;event('pointerdown',400,400,kind);event('pointermove',700,500,kind);await new Promise(r=>setTimeout(r,200));event('pointerup',700,500,kind);b.dispatchEvent(new w.MouseEvent('click',{bubbles:true,detail:1}));assert(opened.length===count,'拖动误触搜索');b.click();assert(opened.length===count+1,'键盘激活被错误抑制');await new Promise(r=>setTimeout(r,500));}
 });
 await test('视口缩放恢复：1440 → 390 → 1440，边界重算',async()=>{frame.style.width='390px';await new Promise(r=>setTimeout(r,700));layout(w);frame.style.width='1440px';await new Promise(r=>setTimeout(r,700));layout(w);});
 for(const width of [768,390,320])await test(width+'px 响应式：圆圈无重叠、越界、文字溢出',async()=>{w=await open('',width);layout(w);});
 await test('reduced-motion：真正停止模拟，实时恢复和停止，后台不追帧',async()=>{
  w=await open('',390,true);const positions=()=>[...w.document.querySelectorAll('.orb')].map(n=>n.style.transform).join('|');const initial=positions();await new Promise(r=>setTimeout(r,400));assert(initial===positions(),'减少动态仍在移动');
  w.testMotion(false);await new Promise(r=>setTimeout(r,600));assert(initial!==positions(),'关闭减少动态未恢复');
  w.testMotion(true);const stopped=positions();await new Promise(r=>setTimeout(r,400));assert(stopped===positions(),'实时减少动态未停止');
  w.testMotion(false);Object.defineProperty(w.document,'hidden',{configurable:true,get:()=>true});w.document.dispatchEvent(new w.Event('visibilitychange'));const background=positions();await new Promise(r=>setTimeout(r,400));assert(background===positions(),'后台仍在模拟');
  Object.defineProperty(w.document,'hidden',{configurable:true,get:()=>false});w.document.dispatchEvent(new w.Event('visibilitychange'));await new Promise(r=>setTimeout(r,300));layout(w);
 });
 await test('动画采样与重复换组：对象数量有界，窗口无滚动条',async()=>{
  for(let i=0;i<12;i++){await confirmShuffle(w);assert(w.document.querySelectorAll('.orb').length<=6,'DOM对象增长');}
  layout(w);const times=w.testFrames.filter(t=>t>0&&t<100);times.sort((a,b)=>a-b);document.querySelector('#benchmark').textContent+='；实际 rAF 样本 '+times.length+'，中位间隔 '+(times[Math.floor(times.length/2)]||0).toFixed(1)+'ms（非跨设备性能保证）';
 });
 w=await open('admin.html');w.confirm=()=>true;w.prompt=()=> '验收主题';
 await test('管理页创建、重命名主题',()=>{click(w,'#add-topic');assert(w.document.querySelector('#topic-name').value==='验收主题','创建失败');fill(w,'#topic-name','验收重命名');submit(w,'#rename-form');assert(status(w).includes('已重命名'),'重命名失败');});
 await test('管理页增改删词条及注入防护',()=>{fill(w,'#new-word','验收关键词');submit(w,'#add-form');let input=w.document.querySelector('.word-row input');input.value='<img src=x onerror=alert(1)>';submit(w,'.word-row');assert(!w.document.querySelector('#words img'),'HTML 被执行');assert(w.document.querySelector('.word-row input').value.startsWith('<img'),'文本修改失败');click(w,'.word-row button[type=button]');assert(w.document.querySelectorAll('.word-row').length===0,'删除失败');});
 await test('批量粘贴：跳过全库和批内重复；搜索及统计',()=>{fill(w,'#bulk','验收甲\n验收乙\n验收甲\n量子纠缠');submit(w,'#bulk-form');assert(status(w).includes('导入 2 项')&&status(w).includes('重复 2 项'),'批量去重错误');fill(w,'#search','验收甲');assert(w.document.querySelectorAll('.word-row').length===1,'搜索失败');fill(w,'#search','');assert(w.document.querySelector('#stats').textContent.includes('242'),'统计失败');});
 await test('自动保存草稿：刷新后恢复；首页公开数据独立',async()=>{await new Promise(r=>setTimeout(r,50));w=await open('admin.html');assert(status(w).includes('已恢复'),'未恢复草稿');assert(w.document.querySelector('#stats').textContent.includes('242'),'草稿数据丢失');w.confirm=()=>true;});
 let exported=[];w.URL.createObjectURL=blob=>{exported.push(blob);return 'blob:test';};w.HTMLAnchorElement.prototype.click=function(){};
 await test('管理页 JSON / CSV 导出可重新校验',async()=>{click(w,'#export-json');click(w,'#export-csv');assert(exported.length===2,'未生成下载');assert(validate(JSON.parse(await exported[0].text())).topics.length===17,'JSON 内容');assert(csvParse(await exported[1].text()).topics.flatMap(t=>t.keywords).length===242,'CSV 内容');});
 async function importFile(text,name){const input=w.document.querySelector('#import'),dt=new w.DataTransfer();dt.items.add(new w.File([text],name));input.files=dt.files;input.dispatchEvent(new w.Event('change'));await wait(()=>input.value==='');}
 await test('JSON 文件导入、替换前备份、历史恢复',async()=>{const incoming={schemaVersion:1,topics:[{id:'imported',name:'导入验收',keywords:['文件导入甲','文件导入乙']}]};await importFile(JSON.stringify(incoming),'test.json');assert(status(w).includes('导入成功'),'导入失败');assert(w.document.querySelector('#stats').textContent.includes('1 个主题'),'未替换');click(w,'#restore-backup');assert(w.document.querySelector('#stats').textContent.includes('242'),'历史恢复失败');});
 await test('无效 JSON 导入保持原草稿',async()=>{await importFile('{bad','bad.json');assert(status(w).includes('导入失败'),'无效导入未被拒绝');assert(w.document.querySelector('#stats').textContent.includes('242'),'草稿被改变');});
 await test('CSV 文件导入、校验、去重、恢复公开版本',async()=>{await importFile('topic,keyword\nCSV主题,CSV词条甲\nCSV主题,CSV词条乙','test.csv');assert(status(w).includes('导入成功'),'CSV导入失败');click(w,'#validate');assert(status(w).includes('校验通过'),'校验失败');click(w,'#dedupe');assert(status(w).includes('移除 0'),'去重失败');click(w,'#restore-public');assert(w.document.querySelector('#stats').textContent.includes('240'),'公开恢复失败');});
 await test('管理页删除主题及备份恢复',()=>{click(w,'#delete-topic');assert(w.document.querySelector('#stats').textContent.includes('15 个主题'),'删除失败');click(w,'#restore-backup');assert(w.document.querySelector('#stats').textContent.includes('16 个主题'),'恢复失败');});
 await test('管理页 390px 手机布局可用，无水平溢出',async()=>{w=await open('admin.html',390);assert(w.document.documentElement.scrollWidth<=390,'管理页水平溢出');});
 }catch(e){await test('测试执行环境',()=>{throw e;});}finally{if(frame){frame.remove();frame=null;}if(priorScene===null)sessionStorage.removeItem(SCENE_KEY);else sessionStorage.setItem(SCENE_KEY,priorScene);keys.forEach((k,i)=>{if(prior[i]===null)localStorage.removeItem(k);else localStorage.setItem(k,prior[i]);});$('#summary').textContent=passed+' 项通过 / '+failed+' 项失败 · 测试前存储已恢复';$('#run').disabled=false;}
};
