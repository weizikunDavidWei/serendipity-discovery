import {gap} from './config.js';
export const GROWTH_SECONDS=.46;
export function growthCurve(t){t=Math.max(0,Math.min(1,t));const u=t-1;return 1+1.3*u*u*u+.3*u*u}
export function growBody(body,dt){if(!body.growth)return;const g=body.growth;g.elapsed=Math.min(GROWTH_SECONDS,g.elapsed+dt);body.r=g.from+(g.target-g.from)*growthCurve(g.elapsed/GROWTH_SECONDS);if(g.elapsed>=GROWTH_SECONDS){body.r=g.target;delete body.growth}}
// Reserve the final radius before insertion. No existing body is moved to spawn it.
export function eggPlacement(point,bodies,bounds,boxes,rng=Math.random,desired=null){
 const unit=Math.min(bounds.width,bounds.height),wanted=desired||Math.max(9,Math.min(62,unit*.075))*(.42+rng()*.58);
 let best=null;
 const clearance=(x,y)=>{let room=Math.min(x-12,y-12,bounds.width-12-x,bounds.height-12-y);for(const b of bodies)room=Math.min(room,Math.hypot(x-b.x,y-b.y)-(b.growth?.target||b.r)-gap({r:wanted},b)-2);for(const box of boxes)room=Math.min(room,Math.hypot(x-Math.max(box.x,Math.min(box.x+box.width,x)),y-Math.max(box.y,Math.min(box.y+box.height,y)))-10);return room/1.015};
 for(let i=0;i<800;i++){let x,y;if(i===0){({x,y}=point)}else if(i<260){const a=rng()*Math.PI*2,d=Math.sqrt(rng())*unit*.33;x=point.x+Math.cos(a)*d;y=point.y+Math.sin(a)*d}else{x=12+rng()*(bounds.width-24);y=12+rng()*(bounds.height-24)}const r=Math.min(wanted,clearance(x,y));if(r<5)continue;const score=r/wanted*unit-Math.hypot(x-point.x,y-point.y)*.18;if(!best||score>best.score)best={x,y,r,score};if(r>=wanted&&i>20&&Math.hypot(x-point.x,y-point.y)<unit*.15)break}
 return best;
}
