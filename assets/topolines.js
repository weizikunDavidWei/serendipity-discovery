import {TopoField} from './vendor/topolines-0.3.0.js';
import {defaults,preferences,savePreferences,renderToggle} from './visual-settings.js';
export function mountTerrain(host) {
  const dark=matchMedia('(prefers-color-scheme: dark)');
  const seed=Array.from(crypto.getRandomValues(new Uint32Array(2))).join('-');
  let field=null,clock=0,disposed=false;
  function sync(){
    if(disposed)return;
    const p=preferences(),active=p.enabled&&p.opacity>0;
    host.hidden=!active;
    if(!active||document.hidden){field?.pause();return;}
    if(!field){
      field=new TopoField(host,{...defaults.topolines,seed,opacity:p.opacity,color:dark.matches?'#ffffff':'#000000',interactive:false});
      if(!field.ok){host.dataset.supported='false';host.textContent='';return;}
      host.dataset.supported='true';field.setClock(clock);
    }
    field.setOptions({opacity:p.opacity,color:dark.matches?'#ffffff':'#000000'});field.play();
  }
  function suspend(){if(field){clock=field.clock;field.destroy();field=null;}}
  dark.addEventListener('change',sync);window.addEventListener('visual-preferences',sync);
  document.addEventListener('visibilitychange',sync);window.addEventListener('pagehide',suspend);window.addEventListener('pageshow',sync);
  sync();
  return {sync, get field(){return field;},destroy(){disposed=true;suspend();dark.removeEventListener('change',sync);window.removeEventListener('visual-preferences',sync);document.removeEventListener('visibilitychange',sync);window.removeEventListener('pagehide',suspend);window.removeEventListener('pageshow',sync);}};
}
const host=document.querySelector('#topolines-background');
if(host){
  mountTerrain(host);
  const button=document.querySelector('#topolines-toggle');
  const sync=()=>renderToggle(button,'等高线',preferences().enabled,'topolines');
  button.addEventListener('click',()=>savePreferences({enabled:!preferences().enabled}));
  window.addEventListener('visual-preferences',sync);sync();
}
