import {loadPublic,shuffle,randomIndex,searchURL} from './data.js';
const field=document.querySelector('#field'),status=document.querySelector('#status'),shuffleButton=document.querySelector('#shuffle'),surprise=document.querySelector('#surprise');
let data,shown=[],recent=[];
function pick(words){const pool=words.filter(w=>!recent.includes(w));const fallback=words.filter(w=>w!==recent[recent.length-1]);const available=pool.length?pool:(fallback.length?fallback:words);const word=available[randomIndex(available.length)];recent.push(word);if(recent.length>20)recent.shift();return word;}
function explore(words){const word=pick(words);window.open(searchURL(word),'_blank','noopener,noreferrer');status.textContent='已打开「'+word+'」 · 继续偶然发现';}
function render(){
  const number=matchMedia('(max-width:700px)').matches?6:8;
  const next=shuffle(data.topics.filter(t=>!shown.includes(t.id)));const fallback=shuffle(data.topics.filter(t=>shown.includes(t.id)));const topics=[...next,...fallback].slice(0,number);shown=topics.map(t=>t.id);
  field.replaceChildren();topics.forEach((topic,i)=>{const slot=document.createElement('div');slot.className='orb-slot';const b=document.createElement('button');b.className='orb';b.type='button';b.style.setProperty('--size',[166,136,180,148,140,174,150,164][i]+'px');b.style.setProperty('--delay',(-i*1.3)+'s');b.setAttribute('aria-label','探索'+topic.name+'，在新标签页打开 Bilibili');const n=document.createElement('span');n.className='number';n.textContent=String(i+1).padStart(2,'0')+' / ↗';const name=document.createElement('span');name.className='name';name.textContent=topic.name;if([...topic.name].length>4)name.style.fontSize=[...topic.name].length>10?'11px':'14px';b.append(n,name);b.addEventListener('click',()=>explore(topic.keywords));slot.append(b);field.append(slot);});document.querySelector('#theme-count').textContent=topics.length+' 个随机主题';
}
shuffleButton.addEventListener('click',()=>{render();status.textContent='已换一组主题 · 选择任意圆圈开始';});surprise.addEventListener('click',()=>explore(data.topics.flatMap(t=>t.keywords)));
loadPublic().then(d=>{data=d;render();field.setAttribute('aria-busy','false');shuffleButton.disabled=false;surprise.disabled=false;status.textContent='不记录兴趣，不设定目的地。';}).catch(e=>{field.setAttribute('aria-busy','false');status.textContent=e.message+'。请通过本地服务器打开，或刷新重试。';const b=document.createElement('button');b.textContent='重新加载';b.onclick=()=>location.reload();field.append(b);});
matchMedia('(max-width:700px)').addEventListener('change',()=>{if(data)render();});
