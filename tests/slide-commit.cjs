const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path');
const base=process.env.TEST_URL||'http://localhost:8765/';
const key='serendipity.exploration.scene.v1';
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage(),results=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const check=(name,ok)=>{results.push({name,ok});if(!ok)throw Error(name)};
  const ready=async p=>{await p.waitForSelector('.orb');await p.waitForFunction(()=>!document.querySelector('#shuffle').disabled)};
  const snapshot=p=>p.locator('.orb').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.topicId,width:n.style.width,transform:n.style.transform})));
  const ids=async p=>(await snapshot(p)).map(n=>n.id);
  const open=async p=>{await p.locator('#shuffle').click();await p.getByRole('slider').waitFor()};
  const keyboard=async p=>{await p.getByRole('slider').press('End');await p.getByRole('slider').press('Enter')};
  const closed=p=>p.waitForFunction(()=>document.querySelector('.slide-panel').hidden);
  async function drag(p,fraction,release=true){const track=await p.locator('.slide-track').boundingBox(),grip=await p.getByRole('slider').boundingBox();await p.mouse.move(grip.x+22,grip.y+22);await p.mouse.down();await p.mouse.move(grip.x+22+(track.width-52)*fraction,grip.y+22,{steps:12});if(release)await p.mouse.up();}
  await page.goto(base);await ready(page);const first=await snapshot(page);
  await open(page);check('opens without discarding',JSON.stringify(first)===JSON.stringify(await snapshot(page)));
  await drag(page,.5);await page.waitForTimeout(100);check('partial return and unchanged scene',await page.getByRole('slider').getAttribute('aria-valuenow')==='0'&&JSON.stringify(first)===JSON.stringify(await snapshot(page)));
  await page.keyboard.press('Escape');check('Escape closes',await page.locator('.slide-panel').isHidden());
  await open(page);await page.getByRole('slider').press('End');check('End alone never resets',JSON.stringify(first)===JSON.stringify(await snapshot(page)));await page.keyboard.press('Escape');
  await open(page);await page.getByRole('slider').press('Enter');check('Enter at start never resets',JSON.stringify(first)===JSON.stringify(await snapshot(page)));await page.mouse.click(5,450);check('outside closes',await page.locator('.slide-panel').isHidden());
  await page.evaluate(()=>{window.replacements=0;new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length&&r.removedNodes.length))window.replacements++}).observe(document.querySelector('#field'),{childList:true})});
  await open(page);await drag(page,1,false);check('endpoint before release preserves scene',JSON.stringify(first)===JSON.stringify(await snapshot(page)));await page.mouse.up();
  await page.waitForFunction(()=>document.querySelector('.slide-panel').dataset.phase==='done');check('completion feedback',await page.locator('.slide-done').innerText()==='已换一阵风 ✓');
  await page.keyboard.press('Enter');await page.keyboard.press('Enter');await closed(page);const changed=await snapshot(page);
  check('one completed gesture one replacement',await page.evaluate(()=>window.replacements===1));check('confirmed new topics',JSON.stringify(first.map(n=>n.id))!==JSON.stringify(changed.map(n=>n.id)));
  await page.reload();await ready(page);check('refresh restores exact topics sizes positions',JSON.stringify(changed)===JSON.stringify(await snapshot(page)));
  await page.evaluate(()=>{window.opened=[];window.nativeOpen=window.open;window.open=u=>opened.push(u)});
  await page.locator('.orb').first().click();await page.locator('.orb').first().click();const recent=await page.evaluate(k=>JSON.parse(sessionStorage.getItem(k)).recent,key);
  check('search remains synchronous and recent distinct',await page.evaluate(()=>opened.length===2&&opened[0]!==opened[1]));await page.reload();await ready(page);
  check('recent de-duplication survives reload',JSON.stringify(recent)===JSON.stringify(await page.evaluate(k=>JSON.parse(sessionStorage.getItem(k)).recent,key)));
  const parentIds=await ids(page);const popupPromise=page.waitForEvent('popup');await page.evaluate(url=>window.open(url,'_blank'),base);const popup=await popupPromise;await ready(popup);
  check('opener-created tab starts independently',JSON.stringify(parentIds)!==JSON.stringify(await ids(popup)));check('new tab does not overwrite parent scene',JSON.stringify(parentIds)===JSON.stringify(await ids(page)));await popup.close();await page.bringToFront();
  await page.locator('.edge-brand').click();check('brand does not silently reset',JSON.stringify(parentIds)===JSON.stringify(await ids(page)));
  await open(page);await keyboard(page);await closed(page);check('keyboard explicit confirmation',JSON.stringify(parentIds)!==JSON.stringify(await ids(page)));
  const beforeResize=await ids(page);await open(page);await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);check('resize closes confirmation',await page.locator('.slide-panel').isHidden());check('resize retains displayed topics',JSON.stringify(beforeResize)===JSON.stringify(await ids(page)));
  check('resized layout usable',await page.evaluate(()=>{const boxes=[...document.querySelectorAll('.orb')].map(n=>n.getBoundingClientRect());return document.documentElement.scrollWidth<=innerWidth&&boxes.every((a,i)=>a.left>=0&&a.top>=0&&a.right<=innerWidth+1&&a.bottom<=innerHeight+1&&boxes.slice(i+1).every(b=>Math.hypot(a.x+a.width/2-b.x-b.width/2,a.y+a.height/2-b.y-b.height/2)>=a.width/2+b.width/2-1))}));
  await open(page);await page.screenshot({path:'/tmp/slide-commit-mobile.png'});await page.keyboard.press('Escape');await page.reload();await ready(page);check('mobile refresh retains themes',JSON.stringify(beforeResize)===JSON.stringify(await ids(page)));
  await page.evaluate(k=>sessionStorage.setItem(k,'{bad'),key);await page.reload();await ready(page);check('invalid session safely falls back',await page.locator('.orb').count()>=3);
  await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(500);
  // Inject only a layout fault in this test context; never expose a production
  // fault/reset endpoint. Confirm must fail before replacing current DOM/world.
  const layout=fs.readFileSync(path.join(__dirname,'../assets/layout.js'),'utf8').replace('  const p = CONFIG.layout;','  if(window.failNextScene)throw new Error("test layout failure");\n  const p = CONFIG.layout;');
  await page.route('**/assets/layout.js',route=>route.fulfill({contentType:'application/javascript',body:layout}));await page.reload();await ready(page);const beforeFailure=await snapshot(page);
  await page.evaluate(()=>window.failNextScene=true);await open(page);await keyboard(page);await page.waitForFunction(()=>document.querySelector('.slide-help').textContent.includes('现场已保留'));
  check('failure preserves exact scene',JSON.stringify(beforeFailure)===JSON.stringify(await snapshot(page)));check('failure permits retry',await page.getByRole('slider').getAttribute('aria-valuenow')==='0'&&!await page.locator('#shuffle').isDisabled());
  await page.evaluate(()=>window.failNextScene=false);await keyboard(page);await closed(page);check('retry succeeds',JSON.stringify(beforeFailure)!==JSON.stringify(await snapshot(page)));
  await page.unroute('**/assets/layout.js');await page.emulateMedia({colorScheme:'dark'});await open(page);check('dark track',await page.locator('.slide-track').evaluate(n=>getComputedStyle(n).backgroundColor==='rgb(32, 32, 32)'));await page.screenshot({path:'/tmp/slide-commit-dark.png'});await page.keyboard.press('Escape');
  await page.emulateMedia({reducedMotion:'no-preference'});await open(page);await drag(page,.6);await page.waitForTimeout(850);check('spring returns in motion mode',await page.getByRole('slider').getAttribute('aria-valuenow')==='0');
  const beforeAbort=await ids(page);await keyboard(page);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForTimeout(350);check('blur aborts uncommitted transition',JSON.stringify(beforeAbort)===JSON.stringify(await ids(page))&&await page.locator('.slide-panel').isHidden());
  await open(page);const pendingIds=await ids(page);await page.evaluate(()=>{const g=document.querySelector('.slide-grip');for(const key of ['End','Enter','Escape'])g.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));});await page.waitForTimeout(250);check('Escape aborts pending commit',JSON.stringify(pendingIds)===JSON.stringify(await ids(page)));
  // Real CDP touch input, not synthetic MouseEvents; hardware remains untested.
  const mobileContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const mobile=await mobileContext.newPage();await mobile.emulateMedia({reducedMotion:'reduce'});await mobile.goto(base);await ready(mobile);const client=await context.newCDPSession(mobile);
  async function touchSlide(fraction,cancel=false){await open(mobile);const grip=await mobile.getByRole('slider').boundingBox(),track=await mobile.locator('.slide-track').boundingBox();const x=grip.x+22,y=grip.y+22;await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});for(let i=1;i<=12;i++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(track.width-52)*fraction*i/12,y,id:1}]});await client.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});}
  const touchBefore=await ids(mobile);await touchSlide(1,true);await mobile.waitForTimeout(100);check('touch cancel at endpoint preserves scene',JSON.stringify(touchBefore)===JSON.stringify(await ids(mobile)));await mobile.keyboard.press('Escape');await touchSlide(1);await closed(mobile);check('touch drag release confirms',JSON.stringify(touchBefore)!==JSON.stringify(await ids(mobile)));
  const denied=await browser.newContext({reducedMotion:'reduce'});await denied.addInitScript(()=>Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('Storage denied','SecurityError')}}));const deniedPage=await denied.newPage();await deniedPage.goto(base);await ready(deniedPage);check('denied storage keeps app usable',await deniedPage.locator('#status').innerText().then(t=>t.includes('无法保存现场')));await open(deniedPage);await keyboard(deniedPage);await closed(deniedPage);check('confirmed reset works without storage',await deniedPage.locator('.orb').count()>=3);await denied.close();
  await page.keyboard.press('Escape');check('component destroy cleans pending work',await page.evaluate(async()=>{const {bindSlideCommit}=await import('./assets/slide-commit.js');const host=document.createElement('div'),trigger=document.createElement('button');trigger.id='cleanup-test';host.append(trigger);document.body.append(host);let resolve,calls=0,signal;const control=bindSlideCommit({trigger,onConfirm:s=>{signal=s;calls++;return new Promise(r=>resolve=r)}});control.open();const grip=host.querySelector('.slide-grip');for(const key of ['End','Enter'])grip.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));control.destroy();resolve();await Promise.resolve();trigger.click();const ok=calls===1&&signal.aborted&&!host.querySelector('.slide-panel');host.remove();return ok}));
  check('no JS errors',errors.length===0);console.log(JSON.stringify({results,errors},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
