'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const operative=require('../app/core/asistente-operativo.js');
const fixtures=[
 ['pausa con hojas pendientes','comercial',{shift:{status:'lunch'},waitingDump:3},'jornada.reanudar'],
 ['volcado antes que sector','comercial',{shift:{status:'working'},waitingDump:2,old:3,todayCount:5},'oficina.volcados'],
 ['sector vencido antes que nuevo','comercial',{shift:{status:'working'},old:1,todayCount:4},'jornada.sector'],
 ['sector de hoy','comercial',{shift:{status:'working'},todayCount:2},'jornada.sector'],
 ['sin jornada','comercial',{},'jornada.iniciar'],
 ['sin pendientes','comercial',{shift:{status:'working'}},'resultados.consultar'],
 ['técnico subsanación','tecnico',{corrections:1,jobsLeft:2,requiredSacks:18},'tecnico.subsanar'],
 ['técnico sin foto','tecnico',{missingEvidence:2,jobsLeft:2},'tecnico.evidencias'],
 ['técnico carga','tecnico',{jobsLeft:2,plannedM2:148,requiredSacks:20,materialLoaded:false},'tecnico.carga'],
 ['técnico siguiente vivienda','tecnico',{jobsLeft:1,plannedM2:66,requiredSacks:8,materialLoaded:true},'tecnico.ruta'],
 ['oficina firma vencida','oficina',{urgentSignatures:2,missingEvidence:1},'oficina.llamar'],
 ['oficina fotos','oficina',{missingEvidence:1,readyToSend:3},'oficina.subsanar'],
 ['oficina revisión','oficina',{reviewDocuments:1,readyToSend:2},'oficina.revisar'],
 ['oficina envío','oficina',{readyToSend:1},'oficina.enviar'],
 ['administración pago al día cinco','administracion',{paymentsDue:2,dayOfMonth:5},'administracion.escalar'],
 ['administración combustible','administracion',{paymentsDue:2,dayOfMonth:3,fuelAnomalies:1},'administracion.combustible'],
 ['CEO pago al cinco','ceo',{paymentsDue:2,dayOfMonth:5,expenseAnomalies:1},'direccion.pagos'],
 ['CEO gastos','ceo',{expenseAnomalies:1,missingFinancialData:3},'direccion.gastos'],
 ['CEO sin datos','ceo',{missingFinancialData:3},'direccion.datos'],
 ['CEO estable','ceo',{},'direccion.panel']
];
for(const [label,role,facts,id] of fixtures){
 test(label,()=>{const v=operative.recommend(role,facts);assert.equal(v.id,id);assert.ok(v.title&&v.description&&v.button&&v.why);assert.ok(Object.isFrozen(v));});
}
test('rol desconocido no recibe recomendación',()=>assert.equal(operative.recommend('desconocido',{jobsLeft:100}),null));
test('no inventa importes ni áreas negativas',()=>{
 const v=operative.recommend('tecnico',{jobsLeft:2,plannedM2:-100,requiredSacks:-5});
 assert.match(v.title,/0 sacos para 0 m²/);
});
test('roles comerciales y jefatura utilizan la misma prioridad',()=>{
 for(const role of ['comercial','jefe_equipo_comercial','jefe_planta_comercial'])
  assert.equal(operative.recommend(role,{waitingDump:1,old:3}).id,'oficina.volcados');
});
