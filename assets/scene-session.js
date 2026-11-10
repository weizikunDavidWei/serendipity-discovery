import {CONFIG} from './config.js';
export const SCENE_KEY='serendipity.exploration.scene.v1';
export function readScene(data){
  try{
    // Browsers may copy sessionStorage into an opener-created tab. A fresh
    // navigation there starts independently; reloads/back-forward keep its scene.
    if(window.opener&&performance.getEntriesByType('navigation')[0]?.type==='navigate')return null;
    const s=JSON.parse(sessionStorage.getItem(SCENE_KEY));
    if(!s||s.schemaVersion!==1||!Array.isArray(s.topicIds)||s.topicIds.length<1||s.topicIds.length>CONFIG.count.max||new Set(s.topicIds).size!==s.topicIds.length)return null;
    const valid=n=>typeof n==='number'&&Number.isFinite(n);
    if(!valid(s.width)||!valid(s.height)||s.width<1||s.height<1||s.width>100000||s.height>100000||!valid(s.time)||s.time<0)return null;
    const topics=s.topicIds.map(id=>data.topics.find(t=>t.id===id));if(topics.some(t=>!t))return null;
    if(!Array.isArray(s.bodies)||s.bodies.length!==topics.length)return null;
    const bodies=s.bodies.map(b=>{
      if(!b||!['x','y','r','vx','vy','phase'].every(k=>valid(b[k]))||b.r<20||b.r>Math.min(s.width,s.height)/2||b.x<b.r||b.y<b.r||b.x>s.width-b.r||b.y>s.height-b.r||Math.hypot(b.vx,b.vy)>CONFIG.physics.dragSpeed+1)throw Error('scene');
      return {x:b.x,y:b.y,r:b.r,vx:b.vx,vy:b.vy,phase:b.phase};
    });
    if(s.eggs!==undefined&&(!Array.isArray(s.eggs)||s.eggs.length>30))return null;
    if(s.worldResetPendingExploration!==undefined&&typeof s.worldResetPendingExploration!=='boolean')return null;
    const eggs=Array.isArray(s.eggs)?s.eggs.slice(0,30).map(b=>{
      if(!b||!['x','y','r','vx','vy','phase'].every(k=>valid(b[k]))||b.x<0||b.y<0||b.x>s.width||b.y>s.height||b.r<1||b.r>Math.min(s.width,s.height)/2||Math.hypot(b.vx,b.vy)>CONFIG.physics.dragSpeed+1)throw Error('egg');
      return {x:b.x,y:b.y,r:b.r,vx:b.vx,vy:b.vy,phase:b.phase,egg:true};
    }):[];
    const worldResetPendingExploration=!eggs.length&&s.worldResetPendingExploration===true;
    const recent=Array.isArray(s.recent)?s.recent.filter(w=>typeof w==='string'&&w.length<=100).slice(-20):[];
    return {...s,topics,bodies,eggs,worldResetPendingExploration,recent};
  }catch{return null;}
}
export function writeScene(world,topics,recent,event={}){
  if(!world||!topics.length)return false;
  try{sessionStorage.setItem(SCENE_KEY,JSON.stringify({schemaVersion:1,width:world.bounds.width,height:world.bounds.height,time:world.time,
    topicIds:topics.map(t=>t.id),bodies:world.bodies.filter(b=>!b.egg).map(b=>({x:b.x,y:b.y,r:b.r,vx:b.drag?0:b.vx,vy:b.drag?0:b.vy,phase:b.phase||0})),eggs:world.bodies.filter(b=>b.egg).slice(0,30).map(b=>({x:b.x,y:b.y,r:b.growth?.target||b.r,vx:b.drag?0:b.vx,vy:b.drag?0:b.vy,phase:b.phase||0})),worldResetPendingExploration:event.worldResetPendingExploration===true,recent:recent.slice(-20)}));return true;}catch{return false;}
}
