/* Tests rápidos de la demo autónoma. Ejecución: node --test tests/edificio-demo.test.cjs */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','edificio-demo.html'),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(source,'La demo debe incluir su script integrado.');
new vm.Script(source);

function session(){
 const areas=Object.fromEntries(['app','modal-root','toast-root'].map(key=>[key,{innerHTML:''}]));
 const listeners={};const values=new Map();
 const document={
  getElementById:id=>areas[id],
  addEventListener:(type,handler)=>{listeners[type]=handler;}
 };
 const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 const ctx={document,window:{},localStorage:storage,setTimeout:()=>1,clearTimeout:()=>{},
  FormData:function(){},confirm:()=>true};
 vm.runInNewContext(source,ctx);
 return {
  areas,
  state:()=>JSON.parse(values.get('konsor_edificio_demo_interactivo_v2')),
  click(action){
   listeners.click({preventDefault(){},target:{closest:()=>({
    disabled:false,getAttribute:()=>action
   })}});
  }
 };
}
test('La entrada ofrece nueve perfiles distintos',()=>{
 const s=session();
 assert.match(s.areas.app.innerHTML,/¿Como quién quieres entrar/);
 assert.equal((s.areas.app.innerHTML.match(/class="profile"/g)||[]).length,9);
});
test('Un CEO puede visitar todas las plantas',()=>{
 const s=session();s.click('enter:ceo');s.click('nav:building');
 assert.equal((s.areas.app.innerHTML.match(/class="floor-card"/g)||[]).length,5);
 assert.equal((s.areas.app.innerHTML.match(/disabled aria-label="Sin acceso/g)||[]).length,0);
});
test('Los trabajadores ven solo su planta',()=>{
 const profiles=[
  ['comercial','comercial'],['tecnico','tecnicos'],['oficina','oficina'],['administracion','administracion']
 ];
 for(const [role,floor] of profiles){
  const s=session();s.click('enter:'+role);s.click('nav:building');
  assert.equal((s.areas.app.innerHTML.match(/disabled aria-label="Sin acceso/g)||[]).length,4);
  s.click('floor:'+floor);
  assert.match(s.areas.app.innerHTML,/PLANTA 0[1-5]/);
  s.click('tab:bandeja');
  assert.match(s.areas.app.innerHTML,/Bandeja de/);
  s.click('tab:asistentes');
  assert.match(s.areas.app.innerHTML,/Automatizaciones del departamento/);
 }
});
test('Los jefes acceden a su departamento y a Dirección',()=>{
 for(const r of ['jefe-comercial','jefe-tecnicos','jefe-oficina','jefe-administracion']){
  const s=session();s.click('enter:'+r);s.click('nav:building');
  assert.equal((s.areas.app.innerHTML.match(/disabled aria-label="Sin acceso/g)||[]).length,3);
 }
});
test('Finalizar una tarea actualiza el almacenamiento de la demo',()=>{
 const s=session();s.click('enter:ceo');s.click('floor:tecnicos');
 s.click('task:t3');
 assert.equal(s.state().tasks.find(t=>t.id==='t3').status,'hecha');
});
test('Traspasar expediente crea el pendiente en la siguiente planta',()=>{
 const s=session();s.click('enter:ceo');
 s.click('advance:EX-101');
 assert.equal(s.state().cases.find(x=>x.id==='EX-101').stage,'oficina');
 assert.ok(s.state().tasks.some(x=>x.floor==='oficina'&&x.title.includes('EX-101')));
 assert.ok(s.state().alerts.some(x=>x.title==='Nuevo expediente recibido'));
});
test('Una automatización simulada crea tarea, aviso y registro',()=>{
 const s=session();s.click('enter:ceo');const before=s.state();
 s.click('run:route');
 const after=s.state();
 assert.equal(after.tasks.length,before.tasks.length+1);
 assert.equal(after.alerts.length,before.alerts.length+1);
 assert.equal(after.logs.length,before.logs.length+1);
});
test('Las notificaciones informativas pueden descartarse; las de acción no',()=>{
 const s=session();s.click('enter:ceo');
 s.click('dismiss:a2');assert.equal(s.state().alerts.some(x=>x.id==='a2'),false);
 s.click('dismiss:a1');assert.equal(s.state().alerts.some(x=>x.id==='a1'),true);
});
test('Reiniciar devuelve los valores de ejemplo',()=>{
 const s=session();s.click('enter:ceo');
 s.click('task:t3');assert.equal(s.state().tasks.find(t=>t.id==='t3').status,'hecha');
 s.click('resetdemo');assert.equal(s.state().tasks.find(t=>t.id==='t3').status,'pendiente');
});
