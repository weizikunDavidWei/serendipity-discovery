// Directional regression: use the production scalar field, output its gradient
// only in this test context, then read GPU pixels. No diagnostic code ships in
// the production shader. Run with Playwright + installed Chrome on local server.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TEST_URL||'http://localhost:8765/';
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const results=[],errors=[];
  function check(name,ok){results.push({name,ok});if(!ok)throw Error(name);}
  const context=await browser.newContext({viewport:{width:1280,height:840},reducedMotion:'reduce'});
  await context.addInitScript(()=>{
    const original=WebGLRenderingContext.prototype.shaderSource;
    WebGLRenderingContext.prototype.shaderSource=function(shader,source){
      if(source.includes('float v = fbm'))source=source.replace(
        'gl_FragColor = vec4(uColor * a, a);',
        'vec2 grad = vec2(dFdx(v), dFdy(v)) * min(uRes.x, uRes.y); gl_FragColor = vec4(normalize(grad) * 0.5 + 0.5, min(length(grad)/32.0, 1.0), 1.0);'
      );
      return original.call(this,shader,source);
    };
  });
  const diagnostic=await context.newPage();diagnostic.on('pageerror',e=>errors.push(e.message));
  // Optional baseline source for checking that this regression fails the old shader.
  if(process.env.BASELINE_SHADER){const fs=require('node:fs');await diagnostic.route('**/assets/vendor/topolines-0.3.0.js',route=>route.fulfill({body:fs.readFileSync(process.env.BASELINE_SHADER,'utf8'),contentType:'application/javascript'}));}
  await diagnostic.goto(new URL('tests/hollow-direction.html',base).href);
  await diagnostic.waitForFunction(()=>!!window.directionFixture);
  const gradients=await diagnostic.evaluate(()=>{
    const f=directionFixture,gl=f.field.gl,canvas=f.field.canvas,measurements=[];
    function metric(enabled,cx,cy,r){
      f.settings.hollowEnabled=enabled;f.render();
      const data=new Uint8Array(canvas.width*canvas.height*4);
      gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,data);
      let count=0,alignment=0,radialSlope=0;
      for(const ratio of [1.015,1.04,1.08,1.12])for(let i=0;i<192;i++){
        const angle=2*Math.PI*i/192,nx=Math.cos(angle),ny=Math.sin(angle);
        const x=Math.round(cx+nx*r*ratio),y=Math.round(canvas.height-(cy-ny*r*ratio));
        const j=(y*canvas.width+x)*4,gx=data[j]/255*2-1,gy=data[j+1]/255*2-1;
        const magnitude=data[j+2]/255*32,length=Math.hypot(gx,gy);
        if(length<.2||magnitude<.125)continue;
        const dot=Math.abs((gx*nx+gy*ny)/length);
        alignment+=dot;radialSlope+=magnitude*dot;count++;
      }
      return {alignment:alignment/count,radialSlope:radialSlope/count,samples:count};
    }
    for(const radius of [205,84]){
      f.scene([[600,410,radius]]);
      for(const seed of ['hollow-direction-01','hollow-direction-02','hollow-direction-03','hollow-direction-04']){
        f.setSeed(seed);measurements.push({radius,seed,off:metric(false,600,410,radius),on:metric(true,600,410,radius)});
      }
    }
    return measurements;
  });
  // A contour's tangent is perpendicular to its scalar gradient: a radial
  // gradient here means circumferential contours, NOT radial contour lines.
  for(const m of gradients){
    check(`tangential contours r=${m.radius} ${m.seed}`,m.on.alignment>.84&&m.on.alignment>m.off.alignment+.10);
    check(`compressed spacing r=${m.radius} ${m.seed}`,m.on.radialSlope>m.off.radialSlope*1.35);
  }
  await context.close();
  const page=await browser.newPage({viewport:{width:1280,height:840},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('tests/hollow-direction.html',base).href);
  await page.waitForFunction(()=>!!window.directionFixture);
  const stability=await page.evaluate(()=>{
    const f=directionFixture,g=f.field.gl,c=f.field.canvas;
    function snapshot(){f.render();const pixels=new Uint8Array(c.width*c.height*4);g.readPixels(0,0,c.width,c.height,g.RGBA,g.UNSIGNED_BYTE,pixels);return pixels;}
    f.scene([[600,410,150]]);f.settings.hollowSize=.5;f.settings.hollowEnabled=false;
    const off=snapshot();f.settings.hollowEnabled=true;const on=snapshot();
    const extent=150*(.35+2.65*.5);let farChanged=0,nearChanged=0;
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
      const d=Math.hypot(x+.5-600,c.height-y-.5-410),i=(y*c.width+x)*4+3;
      if(off[i]===on[i])continue;
      if(d>150+extent+2)farChanged++;
      if(d>150&&d<210)nearChanged++;
    }
    // Range changes no scale/density/speed/clock. CPU options and shader
    // uniforms remain untouched; only the envelope's support changes.
    const levels=f.field.live.levels,scale=f.field.live.scale,speed=f.field.live.speed,clock=f.field.clock;
    f.settings.hollowSize=.2;snapshot();f.settings.hollowSize=.8;snapshot();
    const rangeOnly=levels===f.field.live.levels&&scale===f.field.live.scale&&speed===f.field.live.speed&&clock===f.field.clock;
    const circles=[[440,410,205],[741,410,88],[895,480,70]];
    f.settings.hollowSize=.5;f.scene(circles);const close=snapshot();f.scene([...circles].reverse());const reverse=snapshot();
    let orderMax=0;for(let i=3;i<close.length;i+=4)orderMax=Math.max(orderMax,Math.abs(close[i]-reverse[i]));
    f.scene(circles);let prior=snapshot(),largestMean=0;
    for(let step=1;step<=24;step++){
      f.scene([[440+step*.25,410,205],circles[1],circles[2]]);const next=snapshot();let sum=0;
      for(let i=3;i<prior.length;i+=4)sum+=Math.abs(prior[i]-next[i]);
      largestMean=Math.max(largestMean,sum/(c.width*c.height));prior=next;
    }
    f.settings.hollowEnabled=false;const disabled=snapshot();f.settings.hollowSize=0;const zero=snapshot();
    let zeroDiff=0;for(let i=3;i<zero.length;i+=4)if(zero[i]!==disabled[i])zeroDiff++;
    return {farChanged,nearChanged,rangeOnly,orderMax,largestMean,zeroDiff,glError:g.getError(),canvases:document.querySelectorAll('canvas').length};
  });
  check('outer terrain pixel-identical',stability.farChanged===0);
  check('rim terrain actually changes',stability.nearChanged>500);
  check('slider changes range only',stability.rangeOnly);
  check('close sources have no ordering seam',stability.orderMax<=5);
  check('subpixel motion changes continuously',stability.largestMean<3);
  check('OFF / zero baseline identical',stability.zeroDiff===0);
  check('one renderer / no GL error',stability.canvases===1&&stability.glError===0);
  await page.evaluate(()=>{directionFixture.settings.hollowEnabled=true;directionFixture.settings.hollowSize=.5;directionFixture.scene([[430,410,205],[935,390,84]])});
  await page.screenshot({path:'/tmp/hollow-direction-separated.png'});
  await page.evaluate(()=>directionFixture.scene([[440,410,205],[741,410,88],[895,480,70]]));
  await page.screenshot({path:'/tmp/hollow-direction-close.png'});
  check('no JS errors',errors.length===0);
  console.log(JSON.stringify({results,gradients,stability,errors},null,2));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
