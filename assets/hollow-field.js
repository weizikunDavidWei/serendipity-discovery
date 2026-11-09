// Read current displayed circles (including resize transitions), never write physics.
export const HOLLOW_LIMIT=9;
export function packCircles(elements,rect,out){
  const unit=Math.max(1,Math.min(rect.width,rect.height));let count=0;
  for(const element of elements){if(count===HOLLOW_LIMIT)break;const b=element.getBoundingClientRect();if(!b.width||!b.height)continue;
    const i=count++*3;out[i]=(b.left+b.width/2-rect.left-rect.width/2)/unit;
    out[i+1]=(rect.height/2-(b.top+b.height/2-rect.top))/unit;out[i+2]=b.width/2/unit;
  }return count;
}
export function attachHollow(field,host,getPreferences){
  const sources=new Float32Array(HOLLOW_LIMIT*3);
  field.beforeRender=()=>{
    const p=getPreferences();field.hollowCount=0;field.hollowRange=p.hollowSize;
    if(!p.hollowEnabled||p.hollowSize<=0)return;
    const nodes=host.id==='topolines-background'?document.querySelectorAll('#field .orb'):host.querySelectorAll('[data-hollow-orb]');
    if(!nodes.length)return;
    field.hollowCount=packCircles(nodes,host.getBoundingClientRect(),sources);field.hollowSources=sources;
  };
}
