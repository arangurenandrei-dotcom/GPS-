const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const cp=require('node:child_process');
const os=require('node:os');
const path=require('node:path');
const core=require('../comercial-core.js');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function loadFunction(name,context={}){
 const start=html.indexOf('function '+name+'(');
 assert.ok(start>=0,name);
 const sandbox={ComercialCore:core,...context};vm.createContext(sandbox);
 let end=start;
 while((end=html.indexOf('\n',end+1))>=0){
  let compiled;try{compiled=new vm.Script('('+html.slice(start,end)+')');}catch{continue;}
  return compiled.runInContext(sandbox);
 }
 throw Error('Cannot extract '+name);
}
test('all inline scripts parse, including Firebase module',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'comercial-check-'));
 try{let i=0;for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(!m[2].trim())continue;
  const file=path.join(dir,`${i++}.${/type="module"/.test(m[1])?'mjs':'cjs'}`);
  fs.writeFileSync(file,m[2]);cp.execFileSync(process.execPath,['--check',file]);
 }}finally{fs.rmSync(dir,{recursive:true});}
});
test('area accepts comma and old ranges; empty/invalid never invents 70',()=>{
 for(const v of ['',undefined,null,'abc',-1,Infinity,'22abc'])assert.equal(core.area(v),0);
 assert.equal(core.area('80,25'),80.25);assert.equal(core.area('60-80'),70);
});
test('attic formula and invalid inputs',()=>{
 assert.equal(core.attic(110,2).net,48);assert.equal(core.attic(260,2).net,119);
 assert.equal(core.attic(180,2).net,81);
 for(const v of [0,-1,1.5,''])assert.equal(core.attic(100,v),null);
 assert.equal(core.attic(3,1,100,100).net,0);
 assert.equal(core.attic(200,2,50,45).net,38);
 assert.equal(core.attic(200,2,50,0).net,50);
 assert.equal(core.attic(200,2,101,25),null);
});
test('calendar dates reject rollover',()=>{
 assert.ok(core.date('2024-02-29'));assert.ok(!core.date('2026-02-29'));
 assert.ok(!core.date('2026-04-31'));assert.ok(!core.date('17/11/2026'));
});
const row={id:'old-1',telefono:'+34 600 123 456',municipio:'Pamplona',direccion:'Mayor 1',fecha:'2026-11-20',hora:'09:00',equipo:'2'};
const zone={comercial:'Andrei (Jefe)',town:'Pamplona',clients:[{clientUid:'f_1',phone:'600123456',street:'Mayor 1',obraStatus:'agendada',obraDate:row.fecha,obraTime:row.hora,obraEquipoInstalacion:2}]};
test('link only one exact synced appointment, preserve identity',()=>{
 assert.equal(core.linkable(row,[zone]).c.clientUid,'f_1');
 for(const override of [{hora:'11:00'},{equipo:3},{fecha:'2026-11-21'}])assert.equal(core.linkable({...row,...override},[zone]),null);
 assert.equal(core.linkable(row,[zone,zone]),null);
 assert.equal(core.linkable(row,[{...zone,comercial:'Mikel (Jefe)'}]),null);
 assert.equal(core.linkable(row,[{...zone,clients:[{...zone.clients[0],crmOrigenId:'other'}]}]),null);
});
test('roof measurement has correct area in Navarra and reversed order',()=>{
 const area=loadFunction('calculatePolygonAreaM2');
 const lat=42.8,lng=-1.65,rad=Math.PI/180,R=6378137;
 const dy=10/R/rad,dx=10/(R*Math.cos(lat*rad))/rad;
 const p=[[lat,lng],[lat+dy,lng],[lat+dy,lng+dx],[lat,lng+dx]];
 assert.equal(area(p),100);assert.equal(area(p.reverse()),100);assert.equal(area([]),0);
});
test('Mikel actions return before map, permission or import access',()=>{
 for(const name of ['toggleCatastroLayer','openIdenaOfficialViewer','startRoofMeasureMode','sendLocalMobileNotification','setMapDisplay','openHistoricalImportModal']){
  const fn=loadFunction(name,{isMikelTeamMember:()=>true,currentUserName:'Mikel (Jefe)'});
  assert.doesNotThrow(()=>fn('catastro'));
 }
});
class Element {
 constructor(tag){this.tag=tag;this.children=[];this.style={};this.value='';}
 appendChild(el){this.children.push(el);return el;}
 replaceChildren(){this.children=[];}
 setAttribute(){}
 focus(){}
 addEventListener(){}
 remove(){}
}
function importer(zones=[],verify){
 const body=new Element('body'),writes=[];
 const doc={body,createElement:t=>new Element(t),getElementById:()=>null};
 const fn=loadFunction('openHistoricalImportModal',{
  document:doc,currentUserName:'Andrei (Jefe)',sessionStorage:{getItem:()=> 'jefe'},
  savedZones:zones,getActiveTeamUsers:()=>['Andrei (Jefe)','Comercial 1'],
  getTodayISO:()=> '2026-11-17',TextEncoder,crypto:require('node:crypto').webcrypto,
  window:{auth:{currentUser:{uid:'test'}},verificarHistoricoKonsor:verify,KonsorBridge:{busy:false,save:async(k,c)=>writes.push(structuredClone(c))}},
  alert:()=>{},confirm:()=>true
 });fn();
 const all=[];const walk=e=>{all.push(e);e.children.forEach(walk);};walk(body);
 const buttons=all.filter(e=>e.tag==='button');
 const paste=all.find(e=>e.tag==='textarea');
 const inputs=all.filter(e=>e.tag==='select'||e.tag==='input'&&e.type!=='file');
 const keys=['id','nombre','telefono','municipio','direccion','m2','comercial','estado','fecha','hora','equipo'];
 return {
  writes,buttons,paste,inputs,all,
  add:r=>{
   paste.value=keys.join(';')+'\n'+keys.map(k=>r[k]||'').join(';');
   buttons.find(b=>/Revisar tabla/.test(b.textContent)).onclick();
  },
  manual:r=>{
   ['nombre','telefono','municipio','direccion','m2','estado'].forEach((key,i)=>inputs[i].value=r[key]||'');
   buttons.find(b=>/Añadir/.test(b.textContent)).onclick();
  },
  save:()=>buttons.find(b=>/Guardar fichas/.test(b.textContent)).onclick()
 };
}
test('historical save keeps owner, date and m² in confirmed batch',async()=>{
 const ui=importer();ui.add({...row,nombre:'Cliente de prueba',comercial:'Comercial 1',estado:'Por llamar',fecha:'2025-03-15',m2:'52,5'});
 await ui.save();assert.equal(ui.writes.length,1);
 const z=ui.writes[0][0];assert.equal(z.comercial,'Comercial 1');assert.equal(z.date,'2025-03-15');assert.equal(z.clients[0].m2,52.5);assert.equal(z.clients[0].callStatus,'pendiente');
});
test('historical appointment links same UID and creates no extra reservation',async()=>{
 const ui=importer([structuredClone(zone)]);ui.add({...row,nombre:'Cliente',estado:'agendada'});await ui.save();
 assert.equal(ui.writes.length,1);assert.equal(ui.writes[0].length,1);
 const c=ui.writes[0][0].clients[0];assert.equal(c.clientUid,'f_1');assert.equal(c.crmOrigenId,row.id);assert.equal(c.obraEquipoInstalacion,2);
});
test('unverified KONSOR booking and duplicate batch never write',async()=>{
 const ui=importer();ui.add({...row,nombre:'Cliente',estado:'agendada'});await ui.save();assert.equal(ui.writes.length,0);
 const dup=importer();const r={...row,nombre:'Cliente',estado:'Por llamar'};dup.add(r);dup.add(r);await dup.save();assert.equal(dup.writes.length,0);
});
test('verified external appointment saves event ID for server revalidation',async()=>{
 const requests=[];
 const ui=importer([],async d=>{requests.push(d);return {data:{ok:true,eventId:'calendar-event-1'}};});
 ui.add({...row,nombre:'Cliente',estado:'agendada'});
 await ui.buttons.find(b=>/Verificar citas/.test(b.textContent)).onclick();
 assert.equal(requests[0].crmOrigenId,row.id);assert.equal(ui.writes.length,0);
 await ui.save();assert.equal(ui.writes.length,1);
 assert.equal(ui.writes[0][0].clients[0].crmKonsorEventId,'calendar-event-1');
 assert.equal(ui.writes[0][0].clients[0].crmKonsorTown,'Pamplona');
});

test('manual form opens on demand and stores agendada without a reservation, ID or date',async()=>{
 const ui=importer();
 const toggle=ui.buttons.find(b=>/Meter cliente manual/.test(b.textContent));
 const box=ui.all.find(e=>e.hidden===true);
 assert.ok(ui.all.indexOf(ui.paste)<ui.all.indexOf(toggle));
 assert.ok(box);
 toggle.onclick();assert.equal(box.hidden,false);
 assert.deepEqual(ui.inputs.filter(e=>e.tag==='input').map(e=>e.placeholder),['Nombre','Teléfono','Municipio','Calle y número','m² (opcional)']);
 assert.equal(ui.inputs.at(-1).tag,'select');
 ui.manual({...row,nombre:'Cliente',estado:'Obra Agendada'});
 await ui.save();
 const z=ui.writes[0][0];
 assert.equal(z.comercial,'Andrei (Jefe)');
 assert.equal(z.clients[0].obraStatus,'agendada_historica');
 assert.equal(z.clients[0].obraDate,'');
 assert.equal(z.clients[0].crmOrigenId,undefined);
});
test('two different CSV clients without IDs save under the assigned commercial',async()=>{
 const ui=importer();
 ui.add({...row,id:'',fecha:'',nombre:'Uno',estado:'Por llamar'});
 ui.add({...row,id:'',fecha:'',nombre:'Dos',direccion:'Mayor 2',estado:'Por llamar'});
 await ui.save();
 assert.equal(ui.writes[0].length,2);
 assert.ok(ui.writes[0].every(z=>z.comercial==='Andrei (Jefe)'));
 assert.notEqual(ui.writes[0][0].id,ui.writes[0][1].id);
});
test('a dated CSV without original ID uses one technical reference for verification and saving',async()=>{
 let reference;
 const ui=importer([],async d=>{reference=d.crmOrigenId;return {data:{ok:true,eventId:'calendar-event-2'}};});
 ui.add({...row,id:'',nombre:'Cliente',estado:'Obra Agendada'});
 await ui.buttons.find(b=>/Verificar citas/.test(b.textContent)).onclick();
 await ui.save();
 assert.match(reference,/^local_/);
 assert.equal(ui.writes[0][0].clients[0].crmOrigenId,reference);
 assert.equal(ui.writes[0][0].clients[0].obraStatus,'agendada');
});

test('postal lookup requires the same portal and town with one Navarra postal code',()=>{
 const portal={isPortal:true,localities:['Pamplona/Iruña'],street:'Calle 1 de Mayo',portalNumber:7,cp:'31008'};
 const match=core.exactPostalCode;
 assert.equal(match([portal],'C/ 1 de Mayo 7, 2º A','Pamplona'),'31008');
 assert.equal(match([portal],'C/ 1 de Mayo 17','Pamplona'),'');
 assert.equal(match([portal],'C/ 1 de Mayo 7','Tudela'),'');
 assert.equal(match([portal],'C/ 1 de Mayo','Pamplona'),'');
 assert.equal(match([portal,{...portal,cp:'31009'}],'C/ 1 de Mayo 7','Pamplona'),'');
 const suffix={...portal,street:'Mayor',portalNumber:'7B'};
 assert.equal(match([suffix],'Mayor 7 B','Iruña'),'31008');
 assert.equal(match([suffix],'Mayor 7','Iruña'),'');
 assert.equal(match([{...suffix,street:'Bayona',streetType:'AVENIDA'}],'Av. Bayona 7B','Pamplona'),'31008');
});
test('postal lookup preserves manual values and rejects delayed responses for another address',async()=>{
 const pending=[];
 const postal={value:'',dataset:{},isConnected:true};
 const area={closest:()=>null,querySelector:()=>postal};
 const street={value:'Mayor 7',closest:()=>area};
 let updates=0;
 const resolve=loadFunction('fillPostalCodeFromStreet',{
  pendingPostalLookups:new WeakMap(),selectedZoneIndexToDump:0,savedZones:[{town:'Pamplona'}],
  queryCartoCiudadNavarra:()=>new Promise(done=>pending.push(done)),updateClientCteFromCp:()=>updates++
 });
 const candidate={isPortal:true,localities:['Pamplona'],street:'Mayor',portalNumber:7,cp:'31008'};
 const first=resolve(street);assert.equal(resolve(street),first);
 street.value='Mayor 9';const second=resolve(street);
 pending[0]([candidate]);await first;assert.equal(postal.value,'');
 pending[1]([{...candidate,portalNumber:9}]);await second;assert.equal(postal.value,'31008');assert.equal(updates,1);
 postal.value='31005';postal.dataset.autoPostalCode='';street.value='Mayor 10';
 await resolve(street);assert.equal(postal.value,'31005');assert.equal(pending.length,2);
});
