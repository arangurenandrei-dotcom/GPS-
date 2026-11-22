/*
 * KONSOR — motor de siguientes acciones para todos los departamentos.
 * Decide acciones a partir de hechos. No realiza pagos, envíos ni escrituras.
 */
(function(root){
'use strict';
const roles=new Set(['comercial','jefe_equipo_comercial','jefe_planta_comercial','tecnico','jefe_planta_tecnica','oficina','jefe_planta_oficina','administracion','jefe_planta_administracion','ceo']);
const n=x=>Number.isFinite(Number(x))&&Number(x)>0?Math.floor(Number(x)):0;
const card=(id,title,description,button,icon,why)=>Object.freeze({id,title,description,button,icon,why});
const plural=(v,s,p)=>v===1?s:p;
function recommend(role,state={}){
 if(!roles.has(role))return null;
 const s=state&&typeof state==='object'?state:{};
 if(s.shift?.status==='lunch')
  return card('jornada.reanudar','Tu pausa sigue activa','Cuando vuelvas a trabajar, reanuda la jornada para que el registro sea correcto.','Revisar jornada','calendar','Pausa en curso');
 if(['comercial','jefe_equipo_comercial','jefe_planta_comercial'].includes(role)){
  const dumps=n(s.waitingDump),old=n(s.old),today=n(s.todayCount);
  if(dumps)return card('oficina.volcados','Tienes '+dumps+' '+plural(dumps,'sector sin volcar','sectores sin volcar'),'Empieza por el más antiguo y continúa el trabajo de Oficina.','Ir a Oficina','office','Hojas de calle pendientes');
  if(old)return card('jornada.sector','Tienes '+old+' '+plural(old,'sector pendiente','sectores pendientes'),'Continúa lo pendiente antes de empezar nuevos sectores.','Ver jornada','calendar','Sectores anteriores');
  if(today)return card('jornada.sector','Tienes '+today+' '+plural(today,'sector para hoy','sectores para hoy'),'Consulta el orden asignado y abre la ruta cuando estés preparado.','Ver jornada','calendar','Asignaciones de hoy');
  if(!s.shift)return card('jornada.iniciar','Prepara tu jornada','Consulta tu trabajo y confirma el inicio cuando vayas a trabajar.','Ver mi jornada','calendar','Sin jornada');
  return card('resultados.consultar','Todo al día por ahora','Consulta tus resultados o revisa tus próximas asignaciones.','Ver resultados','results','Sin pendientes');
 }
 if(['tecnico','jefe_planta_tecnica'].includes(role)){
  const corrections=n(s.corrections),missing=n(s.missingEvidence),left=n(s.jobsLeft),sacks=n(s.requiredSacks),metres=n(s.plannedM2);
  if(corrections)return card('tecnico.subsanar','Tienes '+corrections+' '+plural(corrections,'subsanación pendiente','subsanaciones pendientes'),'Aporta a Oficina la evidencia que le falta.','Resolver solicitud','office','Trámite bloqueado');
  if(missing)return card('tecnico.evidencias','Faltan evidencias obligatorias','Completa medidas, fotografías y el parte antes de cerrar la obra.','Completar parte','office','Parte incompleto');
  if(left&&!s.materialLoaded)return card('tecnico.carga','Prepara '+sacks+' sacos para '+metres+' m² aproximados','Revisa la carga y lleva una reserva para imprevistos.','Revisar carga','map','Material sin cargar');
  if(left)return card('tecnico.ruta','Tienes '+left+' '+plural(left,'instalación pendiente','instalaciones pendientes'),'Abre la siguiente dirección y completa sus evidencias.','Abrir instalación','map','Ruta en curso');
  if(!s.shift)return card('jornada.iniciar','Prepara tu jornada','Consulta las instalaciones asignadas antes de confirmar el inicio.','Abrir jornada','calendar','Sin jornada');
  return card('jornada.cerrar','Trabajos registrados','Comprueba el material sobrante y revisa el cierre.','Revisar cierre','calendar','Sin órdenes abiertas');
 }
 if(['oficina','jefe_planta_oficina'].includes(role)){
  const urgent=n(s.urgentSignatures),missing=n(s.missingEvidence),review=n(s.reviewDocuments),send=n(s.readyToSend);
  if(urgent)return card('oficina.llamar','Hay '+urgent+' '+plural(urgent,'cliente que necesita llamada','clientes que necesitan llamada'),'Falta una firma correcta o ha vencido el plazo.','Abrir llamadas','calls','Firma pendiente o incorrecta');
  if(missing)return card('oficina.subsanar','Hay '+missing+' '+plural(missing,'expediente incompleto','expedientes incompletos'),'Solicita solo las evidencias que faltan, sin repetir tareas.','Revisar incidencias','office','Evidencias incompletas');
  if(review)return card('oficina.revisar','Hay '+review+' '+plural(review,'expediente para revisar','expedientes para revisar'),'Comprueba fotografías y medidas recibidas.','Revisar documentos','office','Pruebas entregadas');
  if(send)return card('oficina.enviar','Hay '+send+' '+plural(send,'expediente listo para enviar','expedientes listos para enviar'),'El correo y el texto se preparan desde la ficha.','Preparar envío','office','Revisión terminada');
  return card('oficina.bandeja','Oficina al día por ahora','Consulta expedientes en espera y próximos vencimientos.','Ver bandeja','office','Sin tareas prioritarias');
 }
 if(['administracion','jefe_planta_administracion'].includes(role)){
  const pay=n(s.paymentsDue),fuel=n(s.fuelAnomalies),unclassified=n(s.unclassifiedExpenses);
  if(pay&&n(s.dayOfMonth)>=5)return card('administracion.escalar','Hay '+pay+' '+plural(pay,'pago sin confirmar','pagos sin confirmar'),'Consultar con el responsable externo de pagos.','Revisar pagos','calendar','Plazo de pago');
  if(fuel)return card('administracion.combustible','Hay '+fuel+' '+plural(fuel,'gasto de combustible a revisar','gastos de combustible a revisar'),'Comparar kilómetros, litros y justificantes antes de concluir nada.','Revisar gastos','map','Desviación estimada');
  if(unclassified)return card('administracion.clasificar','Hay '+unclassified+' '+plural(unclassified,'gasto sin clasificar','gastos sin clasificar'),'Clasificar tarjeta, peaje o comida por concepto y vehículo.','Clasificar gastos','office','Información incompleta');
  return card('administracion.control','Pagos y gastos organizados','Consulta confirmaciones y revisa las excepciones.','Abrir administración','office','Sin alertas prioritarias');
 }
 if(role==='ceo'){
  const pay=n(s.paymentsDue),expense=n(s.expenseAnomalies),missing=n(s.missingFinancialData);
  if(pay&&n(s.dayOfMonth)>=5)return card('direccion.pagos','Hay '+pay+' '+plural(pay,'pago sin confirmar','pagos sin confirmar'),'Contactar con Administración o gestoría.','Revisar incidencias','office','Fecha límite de pagos');
  if(expense)return card('direccion.gastos','Hay '+expense+' '+plural(expense,'desviación de gasto','desviaciones de gasto'),'Consultar la comparación antes de tomar decisiones.','Ver gastos','results','Importe anómalo');
  if(missing)return card('direccion.datos','Faltan datos en '+missing+' '+plural(missing,'expediente','expedientes'),'Completar costes y periodos para preparar previsiones fiables.','Revisar datos','results','Previsión incompleta');
  return card('direccion.panel','Consulta la situación de KONSOR','Revisa ingresos, costes, compromisos y riesgos registrados.','Abrir dirección','results','Resumen empresarial');
 }
 return null;
}
const api=Object.freeze({recommend});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.KonsorOperativo=api;
})(typeof window!=='undefined'?window:undefined);
