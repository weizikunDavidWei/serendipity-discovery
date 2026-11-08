export const normalize = value => String(value).normalize('NFKC').trim().replace(/\s+/g,' ');
export const key = value => normalize(value).toLocaleLowerCase();
export function validate(raw, {draft=false}={}) {
  if (!raw || raw.schemaVersion !== 1 || !Array.isArray(raw.topics)) throw new Error('需要 schemaVersion: 1 和 topics 数组。');
  if (!raw.topics.length || raw.topics.length > 200) throw new Error('词库需要 1–200 个主题。');
  const ids=new Set(), names=new Set(), words=new Set(); let count=0;
  const topics=raw.topics.map(t=>{
    if (!t || typeof t.id!=='string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(t.id) || ids.has(t.id)) throw new Error('主题 ID 缺失、不合法或重复。');
    if (typeof t.name!=='string' || !normalize(t.name) || normalize(t.name).length>24 || names.has(key(t.name))) throw new Error('主题名称为空、重复或超过 24 字符。');
    if (!Array.isArray(t.keywords) || (!draft && !t.keywords.length) || t.keywords.length>5000) throw new Error('每个主题需要 1–5000 个关键词（本地草稿可为空）。');
    ids.add(t.id);names.add(key(t.name));
    const keywords=t.keywords.map(w=>{
      if(typeof w!=='string' || !normalize(w) || normalize(w).length>100 || /[\u0000-\u001f\u007f]/.test(w)) throw new Error('关键词必须是 1–100 字符的单行文字。');
      if(words.has(key(w))) throw new Error('发现重复关键词：'+normalize(w));
      words.add(key(w));count++;return normalize(w);
    });return {id:t.id,name:normalize(t.name),keywords};
  });
  if(count>20000) throw new Error('词库总量不能超过 20,000 个关键词。');
  return {schemaVersion:1,updatedAt:typeof raw.updatedAt==='string'?raw.updatedAt:new Date().toISOString(),topics};
}
export async function loadPublic(){const r=await fetch('./data/keywords.json',{cache:'no-cache'});if(!r.ok)throw new Error('公开词库加载失败（'+r.status+'）');return validate(await r.json());}
export function randomIndex(length){if(!Number.isInteger(length)||length<1)throw new Error('随机池为空');const max=4294967296,limit=max-max%length,a=new Uint32Array(1);do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%length;}
export function shuffle(items){const out=[...items];for(let i=out.length-1;i>0;i--){const j=randomIndex(i+1);[out[i],out[j]]=[out[j],out[i]];}return out;}
export const searchURL = word => 'https://search.bilibili.com/all?keyword='+encodeURIComponent(word);
export function csvEncode(data){return '\uFEFFtopic,keyword\r\n'+data.topics.flatMap(t=>t.keywords.map(w=>[t.name,w].map(s=>'"'+(/^[=+\-@\t\r]/.test(s)?"'"+s:s).replace(/"/g,'""')+'"').join(','))).join('\r\n');}
export function csvParse(text){
  text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false,closed=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;}else if(c==='"'){if(cell||closed)throw new Error('CSV 引号格式错误');quoted=true;}else if(c===','){row.push(cell);cell='';closed=false;}else if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';closed=false;}else{if(closed)throw new Error('CSV 引号后存在多余字符');cell+=c;}}
  if(quoted)throw new Error('CSV 引号未闭合');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
  if(!rows.length||rows[0].join(',')!=='topic,keyword')throw new Error('CSV 表头必须为 topic,keyword');
  const topics=[];for(const r of rows.slice(1)){if(r.length!==2)throw new Error('CSV 每行必须有两列');const name=normalize(r[0]);let t=topics.find(x=>key(x.name)===key(name));if(!t){t={id:'import-'+(topics.length+1),name,keywords:[]};topics.push(t);}t.keywords.push(r[1].replace(/^'(?=[=+\-@\t\r])/,'') );}
  return validate({schemaVersion:1,topics});
}
