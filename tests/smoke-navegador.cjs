'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const cp=require('node:child_process');
const puppeteer=require('puppeteer-core');
const root=path.resolve(__dirname,'..');
const MIME={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'};
const chrome=cp.execFileSync('bash',['-lc','command -v google-chrome || command -v chromium || command -v chromium-browser'],{encoding:'utf8'}).trim();
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return}
 const p=fs.existsSync(file)&&fs.statSync(file).isFile()?file:path.join(root,'index.html');
 const body=fs.readFileSync(p);res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
});
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;
 const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const [label,width,height,user,role] of [
   ['iPhone',390,844,'Comercial 1','comercial'],
   ['Escritorio',1440,900,'Andrei (Jefe)','jefe']
  ]){
   const page=await browser.newPage();
   await page.setViewport({width,height,deviceScaleFactor:1,isMobile:width<500,hasTouch:width<500});
   await page.setRequestInterception(true);
   page.on('request',req=>{
    const host=new URL(req.url()).hostname;
    if(/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|cloudfunctions\.net|firebaseapp\.com/i.test(host))req.abort();
    else req.continue();
   });
   await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForFunction('window.KonsorUI && window.KonsorOperativo && window.KonsorModules && window.cnvShowHome && window.openCnResults',{timeout:30000});
   const login=await page.$('#loginScreen .login-card');assert.ok(login,'El login debe existir');
   const data=await page.evaluate(({user,role})=>{
    window.eval("currentUserName="+JSON.stringify(user)+"; currentUserRole="+JSON.stringify(role)+";");
    document.getElementById('appContainer').style.display='block';
    document.getElementById('loginScreen').style.display='none';
    window.cnvShowHome();
    const home=document.querySelector('#cnvHome');
    return {
     visible:!!home&&home.getClientRects().length>0,
     next:home?.querySelector('.cnv-home-hero h2')?.textContent||'',
     tiles:home?.querySelectorAll('.cnv-home-grid .cnv-tile').length||0,
     direction:!!home?.querySelector('.cnv-home-management'),
     overflow:home?home.scrollWidth-home.clientWidth:1000
    };
   },{user,role});
   assert.ok(data.visible,label+' no muestra Inicio');
   assert.ok(data.next,label+' no muestra recomendación');
   assert.equal(data.tiles,4,label+' debe conservar cuatro accesos');
   assert.equal(data.direction,role==='jefe',label+' permisos visuales Dirección');
   assert.ok(data.overflow<12,label+' desbordamiento lateral '+data.overflow);
   const resultados=await page.evaluate(()=>{
    const home=document.querySelector('#cnvHome');
    const cards=home.querySelectorAll('.cnv-home-grid .cnv-tile');
    cards[3].click(); // Pulsación real del botón Resultados en Inicio
    const panel=document.getElementById('konsorResultsV3');
    return {
      opened:panel?.classList.contains('active')||false,
      heading:panel?.querySelector('.kr-head h2')?.textContent||'',
      content:panel?.querySelector('.kr-main')?.textContent?.trim()||''
    };
   });
   assert.ok(resultados.opened,label+' no abre Resultados desde la tarjeta de Inicio');
   assert.equal(resultados.heading,'Resultados',label+' título de Resultados ausente');
   assert.ok(resultados.content.length>30,label+' Resultados se abre pero aparece vacío');
   await page.waitForSelector('#konsorResultsV3 .cn-global-nav .cn-global-back',{timeout:10000});
   const layout=await page.evaluate(()=>{
    const head=document.querySelector('#konsorResultsV3 .kr-head');
    const left=head.querySelector('.cn-global-back').getBoundingClientRect();
    const middle=head.querySelector('.cn-nav-title').getBoundingClientRect();
    const right=head.querySelector('.cn-global-close').getBoundingClientRect();
    return {
      style:getComputedStyle(head).display,
      leftWidth:left.width,rightWidth:right.width,
      separate:left.right+3<=middle.left&&middle.right+3<=right.left,
      inViewport:left.left>=0&&right.right<=window.innerWidth,
      title:middle.width
    };
   });
   assert.equal(layout.style,'grid',label+' cabecera no utiliza columnas separadas');
   assert.equal(layout.leftWidth,44,label+' área táctil de la flecha');
   assert.equal(layout.rightWidth,44,label+' área táctil de la X');
   assert.ok(layout.separate&&layout.inViewport,label+' controles se superponen al título: '+JSON.stringify(layout));
   assert.ok(layout.title>80,label+' sin ancho para el título');
   await page.click('#konsorResultsV3 .cn-global-back');
   assert.ok(await page.evaluate(()=>!document.getElementById('konsorResultsV3').classList.contains('active')),
      label+' flecha no vuelve desde Resultados');
   await page.evaluate(()=>window.openCnResults());
   await page.waitForSelector('#konsorResultsV3 .cn-global-close');
   await page.click('#konsorResultsV3 .cn-global-close');
   assert.ok(await page.evaluate(()=>!document.getElementById('konsorResultsV3').classList.contains('active')),
      label+' X no cierra Resultados');
   await page.evaluate(()=>{
     window.__navBackCount=0;
     const overlay=document.createElement('div');
     overlay.id='nav-internal-test';
     overlay.className='modal-overlay active';
     overlay.style.cssText='display:flex;z-index:20000;';
     overlay.innerHTML='<div class="modal-card"><header class="modal-header"><span>Expediente con un título muy largo para comprobar que nunca se solapa</span><button type="button" onclick="document.getElementById(\'nav-internal-test\').classList.remove(\'active\')">×</button></header><div class="modal-scrollable-content"><button type="button" data-konsor-back="true" onclick="window.__navBackCount++">‹ Volver al paso anterior</button></div></div>';
     document.body.append(overlay);
   });
   await page.waitForSelector('#nav-internal-test .cn-global-back',{timeout:10000});
   await page.click('#nav-internal-test .cn-global-back');
   const inner=await page.evaluate(()=>({back:window.__navBackCount,open:document.getElementById('nav-internal-test').classList.contains('active')}));
   assert.equal(inner.back,1,label+' flecha no volvió al paso interno');
   assert.equal(inner.open,true,label+' flecha cerró toda la sección');
   if(width<500){
     const swiped=await page.evaluate(()=>{
       const target=document.querySelector('#nav-internal-test .modal-scrollable-content');
       const touch=(x)=>new Touch({identifier:1,target,clientX:x,clientY:180,pageX:x,pageY:180});
       const a=touch(6),b=touch(145);
       target.dispatchEvent(new TouchEvent('touchstart',{touches:[a],changedTouches:[a],bubbles:true,cancelable:true}));
       target.dispatchEvent(new TouchEvent('touchmove',{touches:[b],changedTouches:[b],bubbles:true,cancelable:true}));
       target.dispatchEvent(new TouchEvent('touchend',{touches:[],changedTouches:[b],bubbles:true,cancelable:true}));
       return window.__navBackCount;
     });
     assert.equal(swiped,2,'Deslizar desde la izquierda no activó el mismo paso atrás');
   }
   await page.click('#nav-internal-test .cn-global-close');
   assert.ok(await page.evaluate(()=>!document.getElementById('nav-internal-test').classList.contains('active')),
       label+' la X no cerró el expediente');
   await page.evaluate(()=>window.konsorMotor.openDay());
   await page.waitForSelector('#km-flow .cn-global-back',{timeout:10000});
   const kmLayout=await page.evaluate(()=>{
    const h=document.querySelector('#km-flow .km-head');
    const l=h.querySelector('.cn-global-back').getBoundingClientRect();
    const m=h.querySelector('.cn-nav-title').getBoundingClientRect();
    const r=h.querySelector('.cn-global-close').getBoundingClientRect();
    return {back:!!h.querySelector('.cn-global-back'),close:!!h.querySelector('.cn-global-close'),
      overlap:l.right>m.left||m.right>r.left,hiddenOld:getComputedStyle(h.querySelector('.km-back')).display==='none'};
   });
   assert.ok(kmLayout.back&&kmLayout.close&&!kmLayout.overlap&&kmLayout.hiddenOld,
      label+' cabecera del asistente de jornada sin unificar: '+JSON.stringify(kmLayout));
   await page.click('#km-flow .cn-global-back');
   assert.equal(await page.evaluate(()=>!!document.querySelector('#km-flow')),false,
      label+' la flecha del asistente no vuelve un nivel');
   await page.evaluate(()=>window.konsorMotor.openDay());
   await page.waitForSelector('#km-flow .cn-global-close');
   await page.click('#km-flow .cn-global-close');
   assert.equal(await page.evaluate(()=>!!document.querySelector('#km-flow')),false,
      label+' la X del asistente no lo cierra');
   if(role==='jefe'){
     await page.evaluate(()=>window.openKonsorDirection());
     await page.waitForSelector('#konsorDirectionHub .cn-global-back',{timeout:10000});
     const bossHeader=await page.evaluate(()=>{
       const head=document.querySelector('#konsorDirectionHub .kd-head');
       const a=head.querySelector('.cn-global-back').getBoundingClientRect();
       const t=head.querySelector('.cn-nav-title').getBoundingClientRect();
       const b=head.querySelector('.cn-global-close').getBoundingClientRect();
       return {ok:a.right<t.left&&t.right<b.left,
         nativeBackHidden:getComputedStyle(head.querySelector('.kd-back')).display==='none'};
     });
     assert.ok(bossHeader.ok&&bossHeader.nativeBackHidden,'Dirección tiene flecha duplicada o se solapa');
     await page.click('#konsorDirectionHub .cn-global-close');
     const directionClose=await page.evaluate(()=>{
       const root=document.getElementById('konsorDirectionHub');
       const head=root.querySelector('.kd-head');
       const screens=[...document.querySelectorAll('.modal-overlay.active,.cnx-modal.active,.koc-overlay.active,.kr-overlay.active,.kd-overlay.active,.km-overlay,.cn-territorio.active,.cn-oficina.active,#konsor-csv-wizard')]
         .map(el=>({id:el.id,classes:el.className,display:getComputedStyle(el).display,zIndex:getComputedStyle(el).zIndex}));
       return {closed:!root.classList.contains('active'),native:!!head.querySelector('.cn-nav-native-close'),
         hiddenNative:getComputedStyle(head.querySelector('.cn-nav-native-close')).display,screens};
     });
     assert.ok(directionClose.closed,'La X no cierra Dirección: '+JSON.stringify(directionClose));
   }
   console.log('OK '+label+': navegación real en Jornada y Dirección');
   console.log('OK '+label+': cabecera sin solapes, flecha, X y pasos internos');
   console.log('OK '+label+': Inicio → Resultados abre y muestra contenido');
   console.log('OK '+label+': '+data.next+' · '+data.tiles+' accesos');
   await page.close();
  }
 }finally{await browser.close();server.close();}
}
main().catch(error=>{console.error(error);server.close();process.exitCode=1;});
