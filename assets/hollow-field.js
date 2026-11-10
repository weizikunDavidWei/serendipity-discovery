// At most 9 topic circles + 30 Easter eggs share one existing shader.
export const HOLLOW_LIMIT=39;
let model=null;
export function setHollowBodies(bodies){model=bodies}
export function packCircles(elements,rect,out){
 const unit=Math.max(1,Math.min(rect.width,rect.height));let count=0;
 for(const element of elements){if(count===Math.min(HOLLOW_LIMIT,out.length/3))break;const b=element.getBoundingClientRect();if(!b.width||!b.height)continue;const i=count++*3;out[i]=(b.left+b.width/2-rect.left-rect.width/2)/unit;out[i+1]=(rect.height/2-(b.top+b.height/2-rect.top))/unit;out[i+2]=b.width/2/unit}return count;
}
export function attachHollow(field,host,getPreferences){
 const sources=new Float32Array(HOLLOW_LIMIT*3);let rect=host.getBoundingClientRect();
 const observer=new ResizeObserver(()=>{rect=host.getBoundingClientRect()});observer.observe(host);
 const oldDestroy=field.destroy.bind(field);field.destroy=()=>{observer.disconnect();oldDestroy()};
 field.beforeRender=()=>{
  const p=getPreferences();field.hollowCount=0;field.hollowRange=p.hollowSize;
  if(!p.hollowEnabled||p.hollowSize<=0)return;
  if(host.id==='topolines-background'&&model&&!document.querySelector('#field.is-resizing')){
   const unit=Math.max(1,Math.min(rect.width,rect.height));let count=0;
   for(const b of model){if(count===HOLLOW_LIMIT)break;const i=count++*3;sources[i]=(b.x-rect.width/2)/unit;sources[i+1]=(rect.height/2-b.y)/unit;sources[i+2]=b.r/unit}
   field.hollowCount=count;
  }else{
   const nodes=host.id==='topolines-background'?document.querySelectorAll('#field .orb'):host.querySelectorAll('[data-hollow-orb]');
   field.hollowCount=packCircles(nodes,rect,sources);
  }
  field.hollowSources=sources;
 };
}
