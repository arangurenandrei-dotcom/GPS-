/*
 * KONSOR · laboratorio operativa Oficina, Administración y Dirección.
 * SOLO datos ficticios en memoria: no hay autenticación, servidor, cobros
 * bancarios, firmas legales, archivos alojados ni tramitación CAE real.
 */
(function(){
"use strict";
const C={
 "K-0021":{docs:{titular:true,consentimiento:true,firma:true,antes:true,despues:false,parte:true},reviewed:false,eligibleReviewed:true,channel:"CAE previsto",finance:{expected:310000,cost:210000,invoiced:0,received:0}},
 "K-0022":{docs:{titular:true,consentimiento:true,firma:false,antes:false,despues:false,parte:false},reviewed:false,eligibleReviewed:false,channel:"CAE por evaluar",finance:{expected:280000,cost:176000,invoiced:0,received:0}},
 "K-0023":{docs:{titular:false,consentimiento:false,firma:false,antes:false,despues:false,parte:false},reviewed:false,eligibleReviewed:false,channel:"Servicio en estudio",finance:{expected:0,cost:0,invoiced:0,received:0}},
 "K-0024":{docs:{titular:true,consentimiento:true,firma:true,antes:true,despues:true,parte:true},reviewed:true,eligibleReviewed:true,channel:"CAE previsto",finance:{expected:370000,cost:230000,invoiced:370000,received:0}},
 "K-0025":{docs:{titular:true,consentimiento:true,firma:true,antes:false,despues:false,parte:false},reviewed:false,eligibleReviewed:true,channel:"CAE previsto",finance:{expected:235000,cost:154000,invoiced:0,received:0}},
 "K-0026":{docs:{titular:true,consentimiento:true,firma:true,antes:false,despues:false,parte:false},reviewed:false,eligibleReviewed:true,channel:"CAE previsto",finance:{expected:195000,cost:132000,invoiced:0,received:0}}
};
const labels={titular:"Identidad del titular verificada",consentimiento:"Autorización y consentimiento",firma:"Firma exigible",antes:"Fotografía anterior",despues:"Fotografía posterior",parte:"Parte de instalación"};
const correction={}; // {id,jobId,field,crew,assigned,done,requestedBy}
const payables=[
{id:"P01",to:"Proveedor de aislamiento · ejemplo",kind:"Materiales",due:"27/11/2026",cents:124000,paid:false},
{id:"P02",to:"Nóminas del personal · ejemplo",kind:"Personal",due:"30/11/2026",cents:236000,paid:false},
{id:"P03",to:"Peajes VIA-T · ejemplo",kind:"Movilidad",due:"28/11/2026",cents:9000,paid:false}
];
const expenses=[
{id:"E01",name:"Repostaje vehículo",category:"Combustible",amount:7840,classified:true},
{id:"E02",name:"Peaje autopista",category:"Peajes",amount:1220,classified:true},
{id:"E03",name:"Ticket pendiente de revisar",category:"Sin clasificar",amount:3680,classified:false}
];
const initialCash=845000;
let scenario=50;
const f=(c)=> (Number(c)/100).toLocaleString("es-ES",{style:"currency",currency:"EUR",minimumFractionDigits:2,maximumFractionDigits:2});
const money=(s)=>{let raw=String(s||"").trim();if(!/^[\d,.]+$/.test(raw))return null;let normalized=raw.includes(",")?raw.replace(/\./g,"").replace(",","."):raw;let parsed=Number(normalized);return Number.isFinite(parsed)&&parsed>=0?Math.round(parsed*100):null};
const e=(s)=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const sum=(arr,func)=>arr.reduce((n,x)=>n+func(x),0);
const get=(id)=>C[id];
const docMissing=(id)=>Object.keys(labels).filter(k=>!C[id].docs[k]);
function allowedOffice(ctx,j){return ctx.role==="jofi"||(ctx.role==="ofi"&&j.office==="O1")||ctx.role==="ceo"}
function allowedFinance(ctx,j){return ctx.role==="jadm"||(ctx.role==="adm"&&j.finance==="F1")||ctx.role==="ceo"}
function officeJobs(ctx){return ctx.jobs.filter(j=>allowedOffice(ctx,j))}
function financeJobs(ctx){return ctx.jobs.filter(j=>allowedFinance(ctx,j))}
function docStatus(j){
 const c=get(j.id);
 if(j.stage==="Viabilidad"&&!c.eligibleReviewed)return {status:"Esperando viabilidad",code:"hold"};
 if(j.stage==="Instalación")return {status:"Esperando instalación",code:"hold"};
 if(c.reviewed)return {status:"Revisión completada",code:"ready"};
 const missing=docMissing(j.id);
 if(!missing.length)return {status:"Lista para validar",code:"review"};
 if(correction[j.id]&&!correction[j.id].done)return {status:"Subsanación solicitada",code:"waiting"};
 return {status:"Faltan "+missing.length+" requisitos",code:"missing"};
}
function officeAnalysis(ctx){
 const list=officeJobs(ctx);
 const review=list.filter(j=>docStatus(j).code==="review");
 const missing=list.filter(j=>docStatus(j).code==="missing");
 const waiting=list.filter(j=>docStatus(j).code==="waiting");
 const ready=list.filter(j=>docStatus(j).code==="ready");
 const pending=list.filter(j=>docStatus(j).code==="hold");
 return {list,review,missing,waiting,ready,pending,action:review[0]||missing[0]||null};
}
function financeAnalysis(ctx){
 const list=financeJobs(ctx);
 const included=list.filter(j=>get(j.id).finance.expected>0);
 const expected=sum(included,j=>get(j.id).finance.expected);
 const cost=sum(included,j=>get(j.id).finance.cost);
 const invoiced=sum(included,j=>get(j.id).finance.invoiced);
 const received=sum(included,j=>get(j.id).finance.received);
 const outstanding=invoiced-received;
 const todoInvoices=included.filter(j=>get(j.id).reviewed&&get(j.id).finance.invoiced===0);
 const unpaidInvoices=included.filter(j=>get(j.id).finance.invoiced>get(j.id).finance.received);
 const due=payables.filter(x=>!x.paid);
 const cash=initialCash+sum(Object.keys(C).map(id=>C[id]),x=>x.finance.received)-sum(payables.filter(x=>x.paid),x=>x.cents);
 return {list,included,expected,cost,invoiced,received,outstanding,todoInvoices,unpaidInvoices,due,cash,
         projected:cash-sum(due,x=>x.cents)+Math.round(outstanding*scenario/100)};
}
function commissions(ctx){
 // Simulación de 1 €/m² ejecutado según ejemplo de política interna; no es nómina ni pago confirmado.
 const executed=ctx.jobs.filter(j=>j.stage==="Documentación"||j.stage==="Cobro");
 const rate=100; // céntimos por m²
 const all=executed.map(j=>({id:j.id,team:j.team,m2:j.m2,cents:Math.round(j.m2*rate)}));
 if(ctx.role==="com"||ctx.role==="jeq")return all.filter(x=>x.team==="A");
 if(ctx.role==="jcom"||ctx.role==="ceo")return all;
 return [];
}
function touchSync(ctx){if(ctx.rerender)ctx.rerender()}
function inlineStats(stats){return '<div class="ops-stats">'+stats.map(([k,v,sub])=>'<div class="ops-stat"><small>'+e(k)+'</small><strong>'+e(v)+'</strong>'+(sub?'<span>'+e(sub)+'</span>':"")+'</div>').join("")+'</div>'}
function header(label,title,desc){return '<header class="kn-guidehead"><button data-nav="inicio" aria-label="Volver">‹</button><div><div class="eyebrow">'+e(label)+'</div><h1>'+e(title)+'</h1></div></header><p class="ops-desc">'+e(desc)+'</p>'}
function jobBlock(ctx,j,kind){
 const d=docStatus(j),c=get(j.id),missing=docMissing(j.id);
 let action="";
 if(kind==="office"){
 if(d.code==="missing"&&j.stage==="Documentación")action='<button class="ops-action" data-ops="request" data-id="'+e(j.id)+'">Preparar subsanación al técnico →</button>';
 if(d.code==="review")action='<button class="ops-action" data-ops="approve" data-id="'+e(j.id)+'">Validar documentación completa →</button>';
 }
 if(kind==="invoice"&&c.reviewed&&c.finance.invoiced===0&&c.finance.expected)action='<button class="ops-action" data-ops="invoice" data-id="'+e(j.id)+'">Registrar factura de ejemplo →</button>';
 if(kind==="receivable"&&c.finance.invoiced>c.finance.received)action='<button class="ops-action" data-ops="charge" data-id="'+e(j.id)+'">Registrar cobro →</button>';
 return '<article class="ops-line"><div class="ops-line-head"><div><strong>'+e(j.id)+' · '+e(j.town)+'</strong><small>'+e(j.service)+' · '+e(j.name)+'</small></div><span class="ops-pill '+d.code+'">'+e(d.status)+'</span></div>'+
 (kind==="office"&&missing.length&&j.stage==="Documentación"?'<p class="ops-muted">Falta: '+e(missing.map(k=>labels[k]).join(", "))+'</p>':"")+
 (kind==="receivable"?'<p class="ops-muted">Emitido '+f(c.finance.invoiced)+' · Recibido '+f(c.finance.received)+' · Pendiente '+f(c.finance.invoiced-c.finance.received)+'</p>':"")+
 '<div class="ops-line-actions">'+action+'<button class="ops-secondary" data-ops="record" data-id="'+e(j.id)+'">Ver ficha central</button></div></article>';
}
function officeHTML(ctx){
 const a=officeAnalysis(ctx),next=a.action,missing=next?docMissing(next.id):[];
 let h=header("OFICINA · GUÍA AUTOMÁTICA","Mi trabajo de Oficina","KONSOR analiza los expedientes disponibles y prepara solo las gestiones necesarias. No hay una lista artificial de confirmaciones.");
 h+=inlineStats([["Recibidos",a.list.length],["Listos para validar",a.review.length],["Con requisitos pendientes",a.missing.length],["Esperando respuesta",a.waiting.length]]);
 h+='<div class="ops-feature"><span class="eyebrow">SIGUIENTE ACCIÓN RECOMENDADA</span><h2>'+(next?next.id+' · '+e(next.town):"No hay revisiones inmediatas")+'</h2><p>'+(next?((a.review.includes(next)?"Ya están presentes los documentos exigidos para esta fase. Falta la validación humana.":"La CRM ha detectado "+missing.length+" requisito(s) pendientes: "+missing.map(k=>labels[k]).join(", ")+".")):"Los expedientes restantes están esperando actuaciones de otras áreas o ya están revisados.")+'</p>'+
 (next&&a.review.includes(next)?'<button class="ops-primary" data-ops="approve" data-id="'+e(next.id)+'">Validar expediente →</button>':next&&next.stage==="Documentación"?'<button class="ops-primary" data-ops="request" data-id="'+e(next.id)+'">Preparar solicitud al técnico →</button>':"")+'</div>';
 h+='<div class="ops-heading"><strong>BANDEJA PRIORIZADA</strong><span>Calculada por estado de expediente</span></div>';
 const order=[...a.review,...a.missing,...a.waiting,...a.pending,...a.ready];
 h+='<div class="ops-list">'+order.map(j=>jobBlock(ctx,j,"office")).join("")+'</div>';
 h+='<div class="ops-note">La CRM de producción verificará los requisitos técnicos y CAE específicos de cada servicio en el servidor. No autorizará una obra o un CAE simplemente porque un empleado pulse un botón.</div>';
 return h;
}
function adminHTML(ctx){
 const a=financeAnalysis(ctx),expensesUnsorted=expenses.filter(x=>!x.classified);
 let h=header("ADMINISTRACIÓN · ASISTENTE FINANCIERO","Mi trabajo de Administración","No vuelvas a sumar papeles: KONSOR separa lo previsto, lo facturado, lo cobrado y lo que hay que pagar.");
 h+=inlineStats([["Ingresos previstos",f(a.expected),"No son cobros"],["Facturado",f(a.invoiced)],["Efectivamente cobrado",f(a.received)],["Pendiente de cobro",f(a.outstanding)]]);
 let next=a.unpaidInvoices[0]||a.todoInvoices[0]||null;
 h+='<div class="ops-feature"><span class="eyebrow">SIGUIENTE GESTIÓN PREPARADA</span><h2>'+ (next?(a.unpaidInvoices.includes(next)?"Cobro pendiente · ":"Factura pendiente · ")+e(next.id):"Sin cobros ni facturas que registrar") +'</h2><p>'+(next?(a.unpaidInvoices.includes(next)?"Factura emitida: "+f(get(next.id).finance.invoiced)+". Recibido: "+f(get(next.id).finance.received)+". No se presume cobrado hasta registrar el movimiento.":"Expediente revisado y pendiente de registrar factura."):"La bandeja no contiene movimientos pendientes en este escenario.")+'</p>'+
 (next?'<button class="ops-primary" data-ops="'+(a.unpaidInvoices.includes(next)?"charge":"invoice")+'" data-id="'+e(next.id)+'">'+(a.unpaidInvoices.includes(next)?"Registrar cobro":"Registrar factura")+' →</button>':"")+'</div>';
 h+='<div class="ops-heading"><strong>COBROS Y FACTURACIÓN</strong><span>Desde expedientes autorizados</span></div>';
 h+='<div class="ops-list">'+(a.unpaidInvoices.concat(a.todoInvoices).map(j=>jobBlock(ctx,j,a.unpaidInvoices.includes(j)?"receivable":"invoice")).join("")||'<div class="ops-empty">No hay facturas pendientes de este ámbito.</div>')+'</div>';
 h+='<div class="ops-heading"><strong>PAGOS QUE VENCEN</strong><span>Ejemplos · No se ejecutan transferencias</span></div><div class="ops-list">'+a.due.map(p=>'<article class="ops-line"><div class="ops-line-head"><div><strong>'+e(p.to)+'</strong><small>'+e(p.kind)+' · Vence '+e(p.due)+'</small></div><b>'+f(p.cents)+'</b></div><button class="ops-secondary" data-ops="pay" data-id="'+p.id+'">Registrar pago ya realizado →</button></article>').join("")+'</div>';
 h+='<div class="ops-heading"><strong>GASTOS Y TICKETS</strong><span>'+expensesUnsorted.length+' sin clasificar</span></div><div class="ops-list">'+expenses.map(x=>'<article class="ops-line"><div class="ops-line-head"><div><strong>'+e(x.name)+'</strong><small>'+e(x.category)+'</small></div><b>'+f(x.amount)+'</b></div>'+(x.classified?"":'<button class="ops-action" data-ops="expense" data-id="'+x.id+'">Clasificar el gasto →</button>')+'</article>').join("")+'</div>';
 h+='<div class="ops-note">La conciliación automática con bancos, tarjeta, VIA-T y facturación legal requiere integraciones y verificaciones adicionales. Los gastos reales no se sumarán dos veces a los costes de una obra.</div>';
 return h;
}
function ceoHTML(ctx){
 const a=financeAnalysis(ctx),docs=officeAnalysis(ctx),marg=a.expected-a.cost;
 const warnings=[];
 if(a.outstanding)warnings.push(["Cobros pendientes",f(a.outstanding)+" facturados y todavía no registrados como cobrados"]);
 if(a.due.length)warnings.push(["Pagos próximos",f(sum(a.due,p=>p.cents))+" pendientes de confirmar"]);
 if(docs.missing.length||docs.waiting.length)warnings.push(["Tramitación bloqueada",docs.missing.length+" expedientes con documentos pendientes y "+docs.waiting.length+" esperando respuesta"]);
 let h=header("DIRECCIÓN · SITUACIÓN GLOBAL","Centro de Dirección","De dónde entra el dinero, en qué se gasta, qué falta por cobrar y qué decisiones requieren atención. Cifras ficticias, con desglose.");
 h+=inlineStats([["Producción prevista",f(a.expected),"No es dinero disponible"],["Facturado",f(a.invoiced)],["Cobrado",f(a.received)],["Margen previsto",f(marg),"Sin impuestos ni estructura completa"]]);
 h+='<div class="ops-feature"><span class="eyebrow">TESORERÍA Y PREVISIÓN</span><h2>'+f(a.cash)+' · saldo de partida ajustado</h2><p>Saldo hipotético inicial: '+f(initialCash)+'. Cobros registrados en la demo menos pagos marcados como realizados. No es una cuenta bancaria.</p>'+
 '<div class="ops-scenario"><label>Supón que se cobra el <strong id="opsPct">'+scenario+' %</strong> de las facturas pendientes<input id="opsScenario" type="range" min="0" max="100" step="10" value="'+scenario+'"></label><div class="ops-scenario-result"><small>Después de pagos pendientes y cobros supuestos</small><strong id="opsForecast">'+f(a.projected)+'</strong></div></div></div>';
 const ch={};for(const j of a.included){const kind=get(j.id).channel;ch[kind]=(ch[kind]||0)+get(j.id).finance.expected}
 h+='<div class="ops-two"><section class="ops-panel"><div class="ops-heading"><strong>ORIGEN DE LOS INGRESOS PREVISTOS</strong></div>'+Object.entries(ch).map(([k,v])=>'<div class="ops-money-line"><span>'+e(k)+'</span><strong>'+f(v)+'</strong></div>').join("")+'<div class="ops-note">Previsiones comerciales ilustrativas, no reconocimiento legal ni certificación CAE.</div></section>';
 h+='<section class="ops-panel"><div class="ops-heading"><strong>A QUIÉN HAY QUE PAGAR</strong></div>'+a.due.map(p=>'<div class="ops-money-line"><span>'+e(p.to)+'</span><strong>'+f(p.cents)+'</strong></div>').join("")+'<div class="ops-money-line total"><span>Total pendiente</span><strong>'+f(sum(a.due,p=>p.cents))+'</strong></div></section></div>';
 h+='<div class="ops-heading"><strong>RIESGOS QUE REQUIEREN ATENCIÓN</strong><span>Generados por reglas, no por IA</span></div><div class="ops-list">'+warnings.map(x=>'<article class="ops-line"><strong>'+e(x[0])+'</strong><p class="ops-muted">'+e(x[1])+'</p></article>').join("")+'</div>';
 const commissionsAll=commissions(ctx);
 h+='<div class="ops-two"><section class="ops-panel"><div class="ops-heading"><strong>COMISIONES DEVENGADAS · EJEMPLO</strong></div><p class="ops-muted">Hipótesis: 1 €/m² ejecutado; requiere política contractual y validación de liquidación.</p>'+commissionsAll.map(x=>'<div class="ops-money-line"><span>'+e(x.id)+' · Equipo '+e(x.team)+' · '+x.m2+' m²</span><strong>'+f(x.cents)+'</strong></div>').join("")+'<div class="ops-money-line total"><span>Total calculado</span><strong>'+f(sum(commissionsAll,x=>x.cents))+'</strong></div></section>';
 h+='<section class="ops-panel"><div class="ops-heading"><strong>EFICACIA DE DEPARTAMENTOS</strong></div>'+
 [['Comercial',ctx.jobs.length+' expedientes'],['Técnicos',ctx.jobs.filter(j=>j.stage==="Documentación"||j.stage==="Cobro").length+' obras en fase posterior a ejecución'],['Oficina',docs.review.length+' para validar · '+docs.waiting.length+' en espera'],['Administración',a.unpaidInvoices.length+' facturas pendientes de cobro']].map(x=>'<div class="ops-money-line"><span>'+e(x[0])+'</span><strong>'+e(x[1])+'</strong></div>').join("")+'<p class="ops-muted">Un jefe puede revisar productividad, distribución de trabajo y formación; las decisiones sobre personal siempre requieren evaluación humana.</p></section></div>';
 h+='<div class="ops-heading"><strong>TRAZABILIDAD POR EXPEDIENTE</strong><span>Acceso de Dirección</span></div><div class="ops-list">'+a.included.map(j=>jobBlock(ctx,j,"record")).join("")+'</div>';
 return h;
}
function bossHTML(ctx){
 if(ctx.role==="ceo")return ceoHTML(ctx);
 let department=ctx.group,html="";
 if(department==="oficina"){
 const a=officeAnalysis(ctx);
 html=header("JEFATURA DE OFICINA","Cómo va tu planta","Capacidad, pendientes y bloqueos agrupados por responsable. No hace falta abrir cada expediente.");
 html+=inlineStats([["Expedientes visibles",a.list.length],["Para validar",a.review.length],["Incompletos",a.missing.length],["En espera",a.waiting.length]]);
 html+='<div class="ops-feature"><h2>'+a.missing.length+' expedientes requieren completar información</h2><p>La prioridad se calcula por el estado y documentación de cada expediente, no por confirmaciones manuales de rutina.</p><button class="ops-primary" data-ops="work">Abrir revisión automática →</button></div>';
 html+='<div class="ops-heading"><strong>CARGA POR RESPONSABLE</strong></div>';
 const groups={};for(const j of a.list){(groups[j.office]||(groups[j.office]=[])).push(j)}
 html+='<div class="ops-list">'+Object.entries(groups).map(([id,rs])=>'<div class="ops-line"><strong>Administrativo '+e(id)+'</strong><p class="ops-muted">'+rs.length+' expedientes · '+rs.filter(j=>docStatus(j).code==="missing").length+' incompletos · '+rs.filter(j=>docStatus(j).code==="waiting").length+' en espera</p></div>').join("")+'</div>';
 }else if(department==="administración"){
 const a=financeAnalysis(ctx);
 html=header("JEFATURA DE ADMINISTRACIÓN","Control financiero de la planta","Facturación, cobros, pagos a proveedores, gastos sin clasificar y flujo de tesorería.");
 html+=inlineStats([["Facturado",f(a.invoiced)],["Pendiente",f(a.outstanding)],["Pagos previstos",f(sum(a.due,x=>x.cents))],["Gastos sin clasificar",expenses.filter(x=>!x.classified).length]]);
 html+='<div class="ops-feature"><h2>'+a.unpaidInvoices.length+' factura(s) pendiente(s) de cobrar</h2><p>El sistema distingue los importes emitidos, los cobros registrados y los gastos por documentar.</p><button class="ops-primary" data-ops="work">Abrir conciliación guiada →</button></div>';
 }else if(department==="comercial"){
 const cs=commissions(ctx);
 html=header("DIRECCIÓN COMERCIAL","Rendimiento y comisiones","Cada comercial consulta sus propias cifras; las jefaturas únicamente las de su equipo o ámbito.");
 html+=inlineStats([["Expedientes visibles",ctx.visible.length],["m² ejecutados",sum(cs,x=>x.m2)],["Comisión hipotética",f(sum(cs,x=>x.cents))],["Comisión pagada","Sin registro"]]);
 html+='<div class="ops-feature"><h2>De los expedientes al resultado</h2><p>Separar captación, citas, ejecución, comisiones devengadas y efectivamente pagadas.</p><button class="ops-primary" data-ops="files">Consultar expedientes →</button></div>';
 html+='<div class="ops-list">'+cs.map(x=>'<div class="ops-line"><strong>'+e(x.id)+' · Equipo '+e(x.team)+'</strong><p class="ops-muted">'+x.m2+' m² ejecutados · '+f(x.cents)+' de comisión ilustrativa</p></div>').join("")+'</div>';
 }else if(department==="técnicos"){
 const total=ctx.jobs.filter(j=>j.stage==="Instalación"),done=ctx.jobs.filter(j=>j.stage==="Documentación"||j.stage==="Cobro");
 html=header("JEFATURA TÉCNICA","Instalaciones y cuadrillas","Carga de trabajo, material previsto, rutas y partes, con alertas por expedientes bloqueados.");
 html+=inlineStats([["Obras previstas",total.length],["Posteriores a ejecución",done.length],["Subsanaciones activas",Object.values(correction).filter(x=>!x.done).length],["Partes reales","No conectados"]]);
 html+='<div class="ops-feature"><h2>'+total.length+' instalaciones pendientes de ejecución</h2><p>El cálculo automático de materiales se realiza con las m² y ficha técnica del producto. Los trabajadores registran solo el consumo real y las evidencias.</p><button class="ops-primary" data-ops="work">Abrir planificación técnica →</button></div>';
 }
 html+='<div class="ops-note">Estos indicadores son simulaciones. Nunca recomendar despidos automáticamente usando solo métricas; las decisiones de personal requieren contexto y revisión humana.</div>';
 return html;
}
function next(ctx){
 if(ctx.group==="oficina"){const a=officeAnalysis(ctx),j=a.action;return j?{title:docStatus(j).code==="review"?"Valida el expediente "+j.id:"Falta documentación en "+j.id,detail:docStatus(j).code==="review"?"La documentación está disponible. Solo falta revisión autorizada.":"KONSOR ha detectado requisitos pendientes y puede preparar la solicitud al técnico."}:{title:"Bandeja de revisión organizada",detail:"No hay expedientes listos para revisión inmediata; consulta los que esperan instalación o respuesta técnica."}}
 if(ctx.group==="administración"){const a=financeAnalysis(ctx),j=a.unpaidInvoices[0]||a.todoInvoices[0];return j?{title:a.unpaidInvoices.includes(j)?"Cobro pendiente de "+j.id:"Factura pendiente de "+j.id,detail:a.unpaidInvoices.includes(j)?"La factura está emitida. Registra el cobro solo cuando exista justificante o conciliación.":"El expediente está validado y puede prepararse su facturación."}:{title:"No hay nuevos movimientos prioritarios",detail:"Revisa pagos, gastos y previsión de tesorería."}}
 if(ctx.role==="ceo"){const a=financeAnalysis(ctx);return {title:f(a.outstanding)+" pendientes de cobro",detail:"Revisa el origen del ingreso, los pagos próximos y el escenario de tesorería antes de decidir."}}
 return null;
}
function extraRecord(ctx,j,tab){
 const caseData=get(j.id),st=docStatus(j);
 if(tab==="documentos"&&(ctx.group==="oficina"||ctx.role==="ceo"||ctx.group==="técnicos")){
 return '<div class="ops-record"><div class="ops-heading"><strong>CONTROL DOCUMENTAL · MISMO EXPEDIENTE</strong></div>'+Object.keys(labels).map(k=>'<div class="ops-money-line"><span>'+e(labels[k])+'</span><span class="ops-pill '+(caseData.docs[k]?"ready":"missing")+'">'+(caseData.docs[k]?"Disponible (demo)":"Falta (demo)")+'</span></div>').join("")+'<p class="ops-muted">Estado: '+e(st.status)+'. Esta visualización y las evidencias son ficticias.</p></div>';
 }
 if(tab==="economía"&&(ctx.group==="administración"||ctx.role==="ceo")){
 return '<div class="ops-record"><div class="ops-heading"><strong>REGISTRO FINANCIERO DEL EXPEDIENTE</strong></div>'+
 [['Previsto',f(caseData.finance.expected)],['Coste estimado',f(caseData.finance.cost)],['Factura registrada',f(caseData.finance.invoiced)],['Cobro registrado',f(caseData.finance.received)],['Pendiente de cobro',f(caseData.finance.invoiced-caseData.finance.received)]].map(x=>'<div class="ops-money-line"><span>'+x[0]+'</span><b>'+x[1]+'</b></div>').join("")+'</div>';
 }
 return "";
}
function techInbox(ctx){
 const todo=Object.values(correction).filter(x=>x.crew==="C1"&&!x.done);
 if(!todo.length)return "";
 return '<section class="ops-tech-inbox"><div class="eyebrow">INCIDENCIAS RECIBIDAS DE OFICINA</div><h2>'+todo.length+' subsanación(es) pendientes</h2><p>Oficina solicita una evidencia vinculada a su expediente. No hace falta WhatsApp.</p>'+
 todo.map(x=>'<div class="ops-line"><strong>'+e(x.jobId)+' · '+e(labels[x.field])+'</strong><p class="ops-muted">Solicitud de '+e(x.requestedBy)+'. En producción el técnico adjuntaría la fotografía original directamente a la ficha.</p><button class="ops-action" data-ops="techFix" data-id="'+e(x.jobId)+'">Simular entrega de evidencia →</button></div>').join("")+'</section>';
}
function detailModal(ctx,html,title,after){
 ctx.modal("KONSOR · DEMOSTRACIÓN",title,html,after);
}
function action(ctx,kind,id){
 const j=ctx.jobs.find(x=>x.id===id),c=j&&get(j.id);
 if(kind==="files")return ctx.nav("expedientes");
 if(kind==="work")return ctx.nav("trabajo");
 if(kind==="record"){if(j&&ctx.canSee(j))ctx.openRecord(j.id);return}
 if(kind==="request"){
  if(!j||!allowedOffice(ctx,j)||j.stage!=="Documentación")return;
  const miss=docMissing(j.id);
  if(!miss.length)return ctx.toast("Ya no falta información: revisa el expediente");
  if(correction[j.id]&&!correction[j.id].done)return ctx.toast("Ya existe una solicitud pendiente para esta obra");
  const first=miss[0];
  detailModal(ctx,'<p class="ops-muted">KONSOR ha detectado esta ausencia en <b>'+e(j.id)+'</b>:</p><div class="ops-callout"><b>'+e(labels[first])+'</b><p>Responsable: cuadrilla '+e(j.crew)+'. El expediente y la descripción se incluyen automáticamente.</p></div><div class="ops-note">Esta solicitud solo creará una tarea ficticia dentro de la demostración. No enviará mensajes externos.</div><button class="ops-primary" id="opsConfirmRequest">Crear tarea de subsanación →</button>',"Subsanación preparada",()=>{
   const el=document.getElementById("opsConfirmRequest");if(!el)return;
   el.onclick=()=>{correction[j.id]={id:"S-"+j.id,jobId:j.id,field:first,crew:j.crew,requestedBy:ctx.role,done:false};ctx.closeModal();touchSync(ctx);ctx.toast("Tarea ficticia enviada a la bandeja de Técnicos")};
  });return;
 }
 if(kind==="techFix"){
  if(!j||ctx.group!=="técnicos"||j.crew!=="C1"||!correction[id]||correction[id].done)return;
  detailModal(ctx,'<p class="ops-muted">En la versión real se abrirá la cámara para añadir la fotografía. En esta demo solo se actualiza el indicador de evidencia ficticia.</p><button class="ops-primary" id="opsConfirmFix">Añadir evidencia ficticia →</button>',"Subir evidencia a "+j.id,()=>{
   const el=document.getElementById("opsConfirmFix");if(!el)return;el.onclick=()=>{const t=correction[id];C[id].docs[t.field]=true;t.done=true;ctx.closeModal();touchSync(ctx);ctx.toast("Evidencia ficticia recibida; Oficina puede revisar el expediente")};
  });return;
 }
 if(kind==="approve"){
  if(!j||!allowedOffice(ctx,j))return;
  if(docMissing(id).length||!c.eligibleReviewed||j.stage==="Instalación"||j.stage==="Viabilidad")return ctx.toast("Bloqueado: requisitos o viabilidad pendientes");
  detailModal(ctx,'<p class="ops-muted">Todos los campos definidos para la revisión documental de este ejemplo están disponibles. Confirma que has verificado el contenido, no solamente que existe un archivo.</p><div class="ops-note">No aprueba automáticamente un CAE ni autoriza un cobro.</div><button class="ops-primary" id="opsApproveNow">Confirmar revisión humana →</button>',"Validación documental",()=>{
   const el=document.getElementById("opsApproveNow");if(!el)return;el.onclick=()=>{c.reviewed=true;ctx.closeModal();touchSync(ctx);ctx.toast("Revisión de ejemplo completada y enviada al circuito administrativo")};
  });return;
 }
 if(kind==="invoice"){
  if(!j||!allowedFinance(ctx,j)||!c.reviewed||c.finance.invoiced)return ctx.toast("No se puede emitir: revisión pendiente o ya facturado");
  detailModal(ctx,'<p class="ops-muted">Importe previsto: <b>'+f(c.finance.expected)+'</b>. La factura real necesitará numeración, fiscalidad y emisión mediante un sistema autorizado.</p><button class="ops-primary" id="opsInvoiceNow">Registrar factura ficticia →</button>',"Preparar factura",()=>{
   const el=document.getElementById("opsInvoiceNow");if(!el)return;el.onclick=()=>{c.finance.invoiced=c.finance.expected;ctx.closeModal();touchSync(ctx);ctx.toast("Factura ficticia registrada; cobro aún pendiente")};
  });return;
 }
 if(kind==="charge"){
  if(!j||!allowedFinance(ctx,j)||c.finance.invoiced<=c.finance.received)return ctx.toast("Sin saldo facturado pendiente");
  const pending=c.finance.invoiced-c.finance.received;
  detailModal(ctx,'<p class="ops-muted">Factura: '+f(c.finance.invoiced)+' · Cobrado anteriormente: '+f(c.finance.received)+' · Pendiente: '+f(pending)+'.</p><label class="ops-input">Cobro recibido (€)<input id="opsAmount" inputmode="decimal" value="'+(pending/100).toFixed(2)+'" type="text"></label><div class="ops-note">Registra solo un pago efectivamente confirmado; no se consulta ningún banco en esta demo.</div><div id="opsAmountError"></div><button class="ops-primary" id="opsChargeNow">Registrar cobro ficticio →</button>',"Cobro del expediente",()=>{
   const el=document.getElementById("opsChargeNow");if(!el)return;el.onclick=()=>{const amount=money(document.getElementById("opsAmount").value);
    if(!amount||amount<1||amount>pending){document.getElementById("opsAmountError").innerHTML='<div class="ops-error">Importe inválido o superior al saldo pendiente.</div>';return}
    c.finance.received+=amount;ctx.closeModal();touchSync(ctx);ctx.toast("Cobro ficticio registrado. Tesorería recalculada.")};
  });return;
 }
 if(kind==="pay"){
  if(!["jadm","adm","ceo"].includes(ctx.role))return;
  const p=payables.find(x=>x.id===id);if(!p||p.paid)return;
  detailModal(ctx,'<div class="ops-callout"><b>'+e(p.to)+'</b><p>Concepto: '+e(p.kind)+' · Importe: '+f(p.cents)+' · Vencimiento: '+e(p.due)+'</p></div><div class="ops-note">No se ejecuta ninguna transferencia ni se verifica una cuenta bancaria.</div><button class="ops-primary" id="opsPayNow">Confirmar pago ficticio ya realizado →</button>',"Confirmación de pago",()=>{
   const el=document.getElementById("opsPayNow");if(!el)return;el.onclick=()=>{p.paid=true;ctx.closeModal();touchSync(ctx);ctx.toast("Pago simulado contabilizado. Tesorería recalculada.")};
  });return;
 }
 if(kind==="expense"){
  if(!["jadm","adm","ceo"].includes(ctx.role))return;
  const x=expenses.find(x=>x.id===id);if(!x||x.classified)return;
  detailModal(ctx,'<p class="ops-muted">Ticket por '+f(x.amount)+'. Comprueba el gasto antes de atribuirlo a combustible, peajes, material u otros conceptos.</p><label class="ops-input">Categoría<select id="opsExpenseKind"><option value="Combustible">Combustible</option><option value="Peajes">Peajes</option><option value="Material">Material</option><option value="Otros">Otros</option></select></label><button class="ops-primary" id="opsExpenseNow">Clasificar ticket ficticio →</button>',"Clasificar gasto",()=>{
   const el=document.getElementById("opsExpenseNow");if(!el)return;el.onclick=()=>{x.category=document.getElementById("opsExpenseKind").value;x.classified=true;ctx.closeModal();touchSync(ctx);ctx.toast("Gasto ficticio clasificado; pendiente de conciliación real")};
  });return;
 }
}
function mount(ctx){
 document.querySelectorAll("[data-ops]").forEach(btn=>btn.onclick=()=>action(ctx,btn.dataset.ops,btn.dataset.id));
 const slider=document.getElementById("opsScenario");
 if(slider)slider.oninput=()=>{scenario=Number(slider.value);const analysis=financeAnalysis(ctx);
  const pct=document.getElementById("opsPct"),out=document.getElementById("opsForecast");
  if(pct)pct.textContent=scenario+" %";if(out)out.textContent=f(analysis.projected);
 };
}
function tests(){
 return {cases:C,correction,payables,expenses,initialCash,scenario,docStatus,officeAnalysis,financeAnalysis,commissions,planMissing:docMissing,labels,
         simulateDocumentUpload(id,field){if(!C[id]||!labels[field])return false;C[id].docs[field]=true;return true}};
}
window.KonsorDemoOperaciones={officeHTML,adminHTML,ceoHTML,bossHTML,next,extraRecord,techInbox,mount,commissions,officeAnalysis,financeAnalysis,tests,action};
})();