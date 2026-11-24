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
     direction:!!Array.from(home?.querySelectorAll('.cnv-home-grid .cnv-tile')||[]).find(x=>x.textContent.includes("Dirección")),
      oldDirection:!!home?.querySelector('.cnv-home-management'),
     overflow:home?home.scrollWidth-home.clientWidth:1000
    };
   },{user,role});
   assert.ok(data.visible,label+' no muestra Inicio');
   assert.ok(data.next,label+' no muestra recomendación');
   assert.equal(data.tiles,role==='jefe'?6:5,label+' debe mostrar la sexta tarjeta Dirección solo al responsable');
   assert.equal(data.oldDirection,false,label+' conserva bloque Dirección antiguo');
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
   await page.evaluate(()=>window.cnvShowMap(false));
   await page.waitForSelector('#cnvMapToolbar .cnv-map-back',{timeout:10000});
   const mapBack=await page.evaluate(()=>{
     const b=document.querySelector('#cnvMapToolbar .cnv-map-back');
     return {width:b.getBoundingClientRect().width,active:document.body.classList.contains('cnv-map-active')};
   });
   assert.ok(mapBack.active&&mapBack.width===44,label+' Mapa sin flecha táctil homogénea');
   await page.click('#cnvMapToolbar .cnv-map-back');
   assert.ok(await page.evaluate(()=>document.body.classList.contains('cnv-home-active')),
     label+' flecha de Mapa no vuelve a Inicio');
   if(width<500){
     const office=await page.evaluate(()=>{
     document.querySelector('#cnvHome .cnv-home-grid .cnv-tile:nth-child(3)')?.click();
     const modal=document.getElementById('cnOficina');
     return {opened:modal?.classList.contains('active')||false,
      cards:[...modal?.querySelectorAll('.cn-office-home-grid .cn-office-home-tile')||[]].map(x=>x.childNodes[0]?.textContent?.trim())};
    });
    assert.ok(office.opened,label+' no abre Oficina');
    assert.deepEqual(office.cards,['Clientes','Llamadas','Calendario','Obras'],label+' accesos principales de Oficina');
    const forms=await page.evaluate(()=>{
      const result=[];
      for(const [mode,expected] of [['guided','Proceso guiado'],['full','Ficha completa']]){
       window.openCnOffice?.();
       const button=[...document.querySelectorAll('#cnOficina .cn-office-card button')].find(b=>b.textContent.trim()===expected);
       button?.click();
       const panel=document.getElementById('konsorLegacyPortfolio');
       result.push({mode,opened:!!panel,clicked:!!button,buttons:[...panel?.querySelectorAll('button')||[]].map(b=>b.textContent?.trim()).filter(Boolean),
        visibleFields:[...panel?.querySelectorAll('.kha-field')||[]].filter(x=>!x.hidden).length});
       panel?.remove();
      }
      return result;
    });
    assert.ok(forms.every(x=>x.clicked&&x.opened),label+' el botón real de alta guiada/completa no abre formulario');
    assert.ok(forms.every(x=>x.buttons.includes('Guardar pendiente')),label+' no se puede guardar una ficha nueva');
    assert.ok(forms.find(x=>x.mode==='full')?.visibleFields>=8,label+' ficha completa no muestra campos');
        await page.evaluate(()=>document.getElementById('cnOficina')?.classList.remove('active'));
    if(role==='jefe'){
     const direction=await page.evaluate(()=>{
      window.openKonsorDirection?.();
      const modal=document.getElementById('konsorDirectionHub');
      return {opened:modal?.classList.contains('active')||false,
       primary:[...modal?.querySelectorAll('.kd-nav-grid .kd-nav-tile .kd-nav-title strong')||[]].map(x=>x.textContent?.trim())};
     });
     assert.ok(direction.opened,'Dirección no se abre con permisos de jefe');
     assert.deepEqual(direction.primary,['Territorio','Cierre del día','Mi equipo'],'Navegación de Dirección');
     await page.evaluate(()=>document.getElementById('konsorDirectionHub')?.classList.remove('active'));
    }
    await page.evaluate(()=>window.cnvShowMap(false));
     const mapSwipe=await page.evaluate(()=>{
       const target=document.body;
       const t=x=>new Touch({identifier:8,target,clientX:x,clientY:250,pageX:x,pageY:250});
       const a=t(7),b=t(155);
       target.dispatchEvent(new TouchEvent('touchstart',{touches:[a],changedTouches:[a],bubbles:true,cancelable:true}));
       target.dispatchEvent(new TouchEvent('touchmove',{touches:[b],changedTouches:[b],bubbles:true,cancelable:true}));
       target.dispatchEvent(new TouchEvent('touchend',{touches:[],changedTouches:[b],bubbles:true,cancelable:true}));
       return document.body.classList.contains('cnv-home-active');
     });
     assert.ok(mapSwipe,'Gesto desde borde izquierdo de Mapa no vuelve a Inicio');
   }
   await page.evaluate(()=>{
     window.__navBackCount=0;
     const overlay=document.createElement('div');
     overlay.id='nav-internal-test';
     overlay.className='modal-overlay active';
     overlay.style.cssText='display:flex;z-index:20000;';
     overlay.innerHTML='<div class="modal-card"><header class="modal-header"><span>Expediente con un título muy largo para comprobar que nunca se solapa</span><button type="button" onclick="document.getElementById(\'nav-internal-test\').remove()">×</button></header><div class="modal-scrollable-content"><button type="button" data-konsor-back="true" onclick="window.__navBackCount++">‹ Volver al paso anterior</button></div></div>';
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
   assert.ok(await page.evaluate(()=>!document.getElementById('nav-internal-test')),
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
   await page.evaluate(()=>window.openCnOffice());
   await page.waitForSelector('#cnOficina .cn-global-back',{timeout:10000});
   const officeHeader=await page.evaluate(()=>{
     const h=document.querySelector('#cnOficina .cn-office-header');
     const a=h.querySelector('.cn-global-back').getBoundingClientRect();
     const t=h.querySelector('.cn-nav-title').getBoundingClientRect();
     const b=h.querySelector('.cn-global-close').getBoundingClientRect();
     return {noOverlap:a.right<t.left&&t.right<b.left,
       originalHidden:getComputedStyle(h.querySelector('.cn-office-exit')).display==='none'};
   });
   assert.ok(officeHeader.noOverlap&&officeHeader.originalHidden,
     label+' Oficina tiene título solapado o cierre duplicado');
   await page.click('#cnOficina .cn-global-close');
   assert.equal(await page.evaluate(()=>document.getElementById('cnOficina').classList.contains('active')),false,
      label+' la X de Oficina no cierra');
   await page.evaluate(()=>window.openCnCallQueue());
   await page.waitForSelector('#konsorOfficeCallV2 .cn-global-back',{timeout:10000});
   await page.click('#konsorOfficeCallV2 .cn-global-back');
   const returnedToOffice=await page.evaluate(()=>
     document.getElementById('cnOficina').classList.contains('active')&&
     !document.getElementById('konsorOfficeCallV2').classList.contains('active'));
   assert.ok(returnedToOffice,label+' volver desde Gestión de clientes debe recuperar Oficina');
   await page.click('#cnOficina .cn-global-back');
   assert.equal(await page.evaluate(()=>document.getElementById('cnOficina').classList.contains('active')),false,
      label+' la flecha de Oficina no vuelve a Inicio');
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
     const clickDebug=await page.evaluate(()=>{
       const b=document.querySelector('#konsorDirectionHub .cn-global-close'),rect=b.getBoundingClientRect();
       const hit=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
       const root=document.getElementById('konsorDirectionHub');
       return {hitTag:hit?.tagName,hitClass:hit?.className,hitId:hit?.id,at:{x:rect.left+rect.width/2,y:rect.top+rect.height/2},
         current:[...document.querySelectorAll('.modal-overlay,.koc-overlay,.kd-overlay,.km-overlay,.kr-overlay,.cnx-modal')]
           .filter(e=>getComputedStyle(e).display!=='none'&&e.getClientRects().length>0)
           .map(e=>({id:e.id,classes:e.className,display:getComputedStyle(e).display,z:getComputedStyle(e).zIndex})),
         native:!!root.querySelector('.cn-nav-native-close')};
     });
     await page.click('#konsorDirectionHub .cn-global-close');
     assert.equal(await page.evaluate(()=>document.querySelector('#konsorDirectionHub').classList.contains('active')),false,
       'La X no cierra Dirección: '+JSON.stringify(clickDebug));
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
