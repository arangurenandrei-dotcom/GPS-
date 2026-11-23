'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const motor=fs.readFileSync(path.join(root,'motor-operativo-konsor.js'),'utf8');
const office=fs.readFileSync(path.join(root,'oficina-llamadas-obras-v2.js'),'utf8');
function part(text,start,end){
 const a=text.indexOf(start),b=text.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'No se encontró '+start);
 return text.slice(a,b);
}
function zone(id,n,legacy=false){
 return {id,town:'Ayegui',comercial:'Andrei (Jefe)',isSingleHouse:true,
  isLegacyPortfolio:legacy,points:[],
  clients:Array.from({length:n},(_,i)=>({
   clientUid:id+'-'+i,name:'Contacto '+i,phone:'600123456',street:'Mayor '+id+' '+i,
   captacionRespuesta:'si',callStatus:'pendiente',
   importedLegacy:legacy,legacyReviewStatus:legacy?'pendiente':undefined,obraStatus:'a_poner'
  }))};
}
test('Oficina reconoce las 37 fichas sin atribuirles sectores territoriales',()=>{
 const ctx={savedZones:[zone('a',20),zone('b',17,true)],currentUserName:'Andrei (Jefe)',
  currentUserRole:'jefe',window:{konsorIsHistoricalOnlySector:()=>false}};
 const setup='const zones=()=>savedZones;const me=()=>currentUserName;const isMikel=n=>String(n||"").startsWith("Mikel");const myTeam=z=>isMikel(z.comercial)===isMikel(me());';
 const segment=part(motor,'const territory=','const shift=');
 vm.runInNewContext(setup+segment+'this.counts=[clients(false).length,territory().length];',ctx);
 assert.equal(ctx.counts[0],37);
 assert.equal(ctx.counts[1],0);
});
test('Primera llamada no exige año, superficie ni CTE, ni revisión histórica finalizada',()=>{
 const ctx={Date};
 const setup='const booked=i=>["agendada","realizada"].includes(i.c.obraStatus);const done=i=>booked(i)||["no_interesado","descartado"].includes(i.c.callStatus);';
 const segment=part(office,'const legacyNeedsReview=','/* Las oportunidades');
 vm.runInNewContext(setup+segment+'this.eligible={complete,callable};',ctx);
 const c={name:'Cliente',street:'Calle Mayor 2',phone:'600123456',captacionRespuesta:'si',
  importedLegacy:true,legacyReviewStatus:'pendiente',callStatus:'pendiente',obraStatus:'a_poner'};
 const item={c,z:{town:'Ayegui'}};
 assert.equal(ctx.eligible.callable(item),true);
 assert.equal(ctx.eligible.callable({c:{...c,phone:'600'},z:item.z}),false);
 assert.equal(ctx.eligible.callable({c:{...c,captacionRespuesta:'no'},z:item.z}),false);
 assert.equal(ctx.eligible.callable({c:{...c,callStatus:'ya_llamado'},z:item.z}),false);
 assert.equal(ctx.eligible.callable({c:{...c,callStatus:'bloqueada'},z:item.z}),true);
});
test('Los mismos 37 clientes están en el listado general de llamadas',()=>{
 const ctx={savedZones:[zone('a',20),zone('b',17,true)],currentUserName:'Andrei (Jefe)',
  currentUserRole:'jefe',scope:'mine',Date,isMikelTeamMember:()=>false};
 const segment=part(office,'const owns=','/* Las oportunidades');
 vm.runInNewContext(segment+'this.queue=all();this.available=this.queue.filter(callable).length;',ctx);
 assert.equal(ctx.queue.length,37);
 assert.equal(ctx.available,37);
});
