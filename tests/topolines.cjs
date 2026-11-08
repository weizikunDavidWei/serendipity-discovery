// Run against an isolated local server with Playwright and installed Chrome.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args){const gl=original.apply(this,args);if(args[0]==='webgl'&&gl&&!gl._tracked){gl._tracked=true;const draw=gl.drawArrays.bind(gl);gl.drawArrays=(...a)=>{this.dataset.draws=String(Number(this.dataset.draws||0)+1);draw(...a)}}return gl;}});
const page=await context.newPage(),results=[];const errors=[];page.on('pageerror',e=>errors.push(e.message));
const base=process.env.TEST_URL||'http://localhost:8765/';
function check(name,ok){results.push({name,ok});if(!ok)throw Error(name)}
const uniform=(name)=>page.evaluate(name=>{const c=document.querySelector('#topolines-background canvas'),g=c.getContext('webgl');return g.getUniform(g.getParameter(g.CURRENT_PROGRAM),g.getUniformLocation(g.getParameter(g.CURRENT_PROGRAM),name))},name);
await page.goto(base);await page.waitForSelector('#topolines-background canvas');await page.waitForSelector('.orb');await page.waitForTimeout(250);
check('WebGL draws',Number(await page.locator('#topolines-background canvas').getAttribute('data-draws'))>1);
check('default 22%',Math.abs(await uniform('uOpacity')-.22)<.001);
await page.emulateMedia({colorScheme:'dark'});await page.waitForTimeout(80);check('dark white',Array.from(await uniform('uColor')).every(x=>x===1));
await page.emulateMedia({colorScheme:'light'});await page.waitForTimeout(80);check('light black',Array.from(await uniform('uColor')).every(x=>x===0));
await page.locator('#topolines-toggle').click();await page.waitForTimeout(80);let before=await page.locator('#topolines-background canvas').getAttribute('data-draws');await page.setViewportSize({width:1380,height:950});await page.waitForTimeout(100);check('OFF stops GPU even on resize',before===await page.locator('#topolines-background canvas').getAttribute('data-draws'));
await page.reload();check('OFF persists',await page.locator('#topolines-toggle').getAttribute('aria-pressed')==='false');check('OFF lazy no canvas',await page.locator('#topolines-background canvas').count()===0);await page.locator('#topolines-toggle').click();await page.waitForSelector('#topolines-background canvas');
let orb=await page.locator('.orb').first().boundingBox();await page.mouse.move(orb.x+orb.width/2,orb.y+orb.height/2);await page.waitForTimeout(100);check('Crosshair lock retained',await page.locator('.crosshair-lock').isVisible());
await page.evaluate(()=>{window.searches=[];window.open=u=>searches.push(u)});await page.mouse.down();await page.mouse.move(orb.x+orb.width/2+120,orb.y+orb.height/2+25,{steps:12});await page.mouse.up();check('drag no accidental search',await page.evaluate(()=>searches.length===0));await page.locator('#surprise').click();check('search retained',await page.evaluate(()=>searches[0].includes('search.bilibili.com')));
const admin=await context.newPage();await admin.goto(new URL('admin.html',base).href);await admin.waitForSelector('#terrain-preview canvas');await admin.locator('#terrain-opacity').fill('67');await admin.locator('#terrain-opacity').dispatchEvent('input');check('exact slider label',await admin.locator('#terrain-opacity-value').innerText()==='67%');await page.waitForTimeout(150);check('live across tabs',Math.abs(await uniform('uOpacity')-.67)<.001);
for(const style of ['compact','minimal','text']){await admin.locator('#toggle-style').selectOption(style);await page.waitForTimeout(80);check('shared '+style,await page.evaluate(s=>['crosshair-toggle','topolines-toggle'].every(id=>document.getElementById(id).dataset.toggleStyle===s),style));}
await admin.reload();check('admin preference retained',await admin.locator('#terrain-opacity').inputValue()==='67');await admin.locator('#visual-reset').click();await page.waitForTimeout(100);check('reset22%',Math.abs(await uniform('uOpacity')-.22)<.001);
await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);before=await page.locator('#topolines-background canvas').getAttribute('data-draws');await page.waitForTimeout(100);check('reduced motion static',before===await page.locator('#topolines-background canvas').getAttribute('data-draws'));
await page.screenshot({path:'/tmp/serendipity-topolines-desktop.png'});await admin.screenshot({path:'/tmp/serendipity-topolines-admin.png'});
await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(700);check('mobile no overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));check('single canvas',await page.locator('#topolines-background canvas').count()===1);await page.screenshot({path:'/tmp/serendipity-topolines-mobile.png'});
check('no JS errors',!errors.length);console.log(JSON.stringify({results,errors},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
