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
   await page.waitForFunction('window.KonsorUI && window.KonsorOperativo && window.KonsorModules && window.cnvShowHome',{timeout:30000});
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
   console.log('OK '+label+': '+data.next+' · '+data.tiles+' accesos');
   await page.close();
  }
 }finally{await browser.close();server.close();}
}
main().catch(error=>{console.error(error);server.close();process.exitCode=1;});
