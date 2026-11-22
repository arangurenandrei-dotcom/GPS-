/* KONSOR CRM laboratorio 05. Datos ficticios, en memoria. NO envía emails, no paga ni firma.
   La CRM organiza y coordina; bancos, gestoría y plataformas legales son servicios externos. */
(function(){
'use strict';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const euro=c=>(Number(c)/100).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
const money=s=>{let a=String(s||'').replace(/[^\d,.]/g,'').trim();if(!a)return null;let n=Number(a.includes(',')?a.replace(/\./g,'').replace(',','.'):/^\d{1,3}(\.\d{3})+$/.test(a)?a.replace(/\./g,''):a);return Number.isFinite(n)&&n>=0?Math.round(n*100):null};
const sum=(arr,fn)=>arr.reduce((n,x)=>n+fn(x),0);
const names={titular:'Identidad o datos del titular',antes:'Fotografía antes de la obra',despues:'Fotografía después de la obra',mediciones:'Medidas realizadas',parte:'Parte técnico'};
const docs={
 'K-0021':{titular:true,antes:true,despues:false,mediciones:true,parte:true,techDone:true},
 'K-0022':{titular:true,antes:false,despues:false,mediciones:false,parte:false,techDone:false},
 'K-0023':{titular:false,antes:false,despues:false,mediciones:false,parte:false,techDone:false},
 'K-0024':{titular:true,antes:true,despues:true,mediciones:true,parte:true,techDone:true},
 'K-0025':{titular:true,antes:false,despues:false,mediciones:false,parte:false,techDone:false},
 'K-0026':{titular:true,antes:false,despues:false,mediciones:false,parte:false,techDone:false}
};
const office={};
const corrections={};
const section={oficina:'pending',administración:'payments',dirección:'overview'};
const officePhone='[Teléfono de Oficina por configurar]';
function emailSubject(j){return 'KONSOR · Documentos para firma · Expediente '+j.id}
function emailBody(j){
 return 'Estimado/a '+j.name+':\n\nLe enviamos la documentación relativa a su expediente '+j.id+
 '. Para continuar con la tramitación, revise los documentos adjuntos, fírmelos donde se indique y devuélvalos respondiendo a este mismo correo.\n\nSi tiene cualquier duda o necesita ayuda con la firma, puede contactar con nuestra oficina en el '+officePhone+
 '.\n\nMuchas gracias.\nOficina KONSOR';
}
function sectionTabs(group,items){
 const selected=section[group];
 return '<div class="ops-segments" role="tablist" aria-label="Apartados">'+items.map(([key,label])=>'<button type="button" data-ops-view="'+E(group)+':'+E(key)+'" class="'+(key===selected?'active':'')+'" aria-selected="'+(key===selected?'true':'false')+'">'+E(label)+'</button>').join('')+'</div>';
}
let count=0;
const signedRemindDays=3;
const salaryPeriod='Noviembre 2026';
const monthPay='Diciembre 2026';
let simulatedPayDay=1;
const salaried=[
 {id:'ceo',name:'Dirección general',fee:280000,type:'fixed'},
 {id:'jcom',name:'Jefatura Comercial',fee:240000,type:'fixed'},
 {id:'jeq',name:'Jefe de equipo A',fee:210000,type:'fixed'},
 {id:'com',name:'Comercial 01',fee:0,type:'commission'},
 {id:'jtec',name:'Jefatura Técnica',fee:240000,type:'fixed'},
 {id:'tec',name:'Técnico 01',fee:190000,type:'fixed'},
 {id:'jofi',name:'Jefatura Oficina',fee:210000,type:'fixed'},
 {id:'ofi',name:'Oficina 01',fee:160000,type:'fixed'},
 {id:'jadm',name:'Jefatura Administración',fee:210000,type:'fixed'},
 {id:'adm',name:'Administración 01',fee:175000,type:'fixed'}
];
const receipt={}; // report: unknown, no, yes - reported by worker only; NOT bank-confirmed.
const spend=[
 {id:'F01',kind:'Combustible',name:'Tarjeta empresa · Vehículo 01',cents:8420,km:180,liters100:6.5,eurLiter:1.57,source:'Tarjeta corporativa (simulada)',kindExpense:'fuel'},
 {id:'F02',kind:'Combustible',name:'Tarjeta empresa · Vehículo 02',cents:1975,km:195,liters100:6.7,eurLiter:1.57,source:'Tarjeta corporativa (simulada)',kindExpense:'fuel'},
 {id:'V01',kind:'Peajes VIA-T',name:'VIA-T · Vehículo 01',cents:2420,source:'VIA-T empresa (simulado)',kindExpense:'toll'},
 {id:'C01',kind:'Comidas autorizadas',name:'Comida de trabajo',cents:3600,source:'Tarjeta corporativa (simulada)',kindExpense:'meal'},
 {id:'M01',kind:'Otros gastos',name:'Material de oficina',cents:2840,source:'Tarjeta corporativa (simulada)',kindExpense:'other'}
];
const expenseChecked={};
let expenseTolerance=30; // % above estimated. Only possible when km and consumption source are trusted.
let context=null;
const assoc=(id)=>office[id]||(office[id]={reviewed:false,platform:'notstarted',filename:'',docReady:false,sent:false,email:'',daysPassed:0,signature:'waiting',contactAttempts:0});
const missing=id=>Object.keys(names).filter(k=>!docs[id]?.[k]);
const have=({role})=>role==='ceo';
const canOffice=(ctx,j)=>ctx.role==='ceo'||ctx.role==='jofi'||ctx.role==='ofi'&&j.office==='O1';
const canAdmin=(ctx,j)=>ctx.role==='ceo'||ctx.role==='jadm'||ctx.role==='adm'&&j.finance==='F1';
const isWorker=role=>salaried.some(x=>x.id===role);
const isSale=j=>/(?:buhardilla|desván)/i.test(j.service)&&Number.isFinite(Number(j.m2))&&j.m2>0;
function commissions(ctx){
 const jobRows=ctx.jobs.filter(isSale).map(j=>({id:j.id,team:j.team,owner:j.owner,m2:j.m2,cents:Math.round(Number(j.m2)*100),service:j.service}));
 if(ctx.role==='ceo'||ctx.role==='jcom')return jobRows;
 if(ctx.role==='jeq'||ctx.role==='com')return jobRows.filter(j=>j.owner==='com'&&j.team==='A');
 return [];
}
function amountFor(id,ctx){
 const person=salaried.find(x=>x.id===id);if(!person)return 0;
 if(person.type==='fixed')return person.fee;
 return sum(ctx.jobs.filter(j=>j.owner==='com'&&j.team==='A'&&isSale(j)),j=>Math.round(j.m2*100));
}
const paymentEntry=(id,ctx)=>({id,amount:amountFor(id,ctx),status:receipt[id]?.status||'unknown',note:receipt[id]?.note||'',source:receipt[id]?.day||null});
function salarySummary(ctx){
 const rows=salaried.map(x=>({...x,...paymentEntry(x.id,ctx)}));
 return {rows,expected:sum(rows,r=>r.amount),confirmed:sum(rows.filter(r=>r.status==='yes'),r=>r.amount),
      confirmedCount:rows.filter(r=>r.status==='yes').length,
      unpaid:rows.filter(r=>r.status==='no'),
      unconfirmed:rows.filter(r=>r.status==='unknown'),
      atRisk:rows.filter(r=>r.status!=='yes'&&simulatedPayDay>=5)};
}
function fuelEstimate(x){return x.kindExpense==='fuel'&&x.km>0&&x.liters100>0&&x.eurLiter>0?Math.round(x.km*x.liters100/100*x.eurLiter*100):null}
function anomalies(){
 return spend.filter(x=>{let est=fuelEstimate(x);return est!==null&&x.cents>est*(1+expenseTolerance/100)}).map(x=>({...x,estimate:fuelEstimate(x),excess:x.cents-fuelEstimate(x)}));
}
function spending(){return sum(spend,x=>x.cents)}
function economic(ctx){
 const priced=ctx.jobs.filter(j=>money(j.income)!==null&&money(j.cost)!==null);
 const revenue=sum(priced,j=>money(j.income)),jobCost=sum(priced,j=>money(j.cost));
 const salaries=salarySummary(ctx);
 // No double count: expense card movements are extra corporate expenses in this demo,
 // not yet included in rough cost of job.
 return {priced,revenue,jobCost,salary:salaries.expected,expense:spending(),commission:sum(ctx.jobs.filter(j=>isSale(j)),j=>Math.round(j.m2*100)),
   gross:revenue-jobCost, result:revenue-jobCost-salaries.expected-spending(),
   missingPrices:ctx.jobs.length-priced.length,
   categories:Object.entries(spend.reduce((acc,x)=>(acc[x.kind]=(acc[x.kind]||0)+x.cents,acc),{})),
   anomalies:anomalies()};
}
function status(j){
 const s=assoc(j.id),miss=missing(j.id),corr=corrections[j.id];
 if(j.stage==='Viabilidad')return {title:'Viabilidad externa pendiente',code:'hold'};
 if(j.stage==='Instalación'&&!docs[j.id].techDone)return {title:'Esperando a Técnicos',code:'hold'};
 if(miss.length)return {title:corr&&!corr.done?'Subsanación enviada':'Faltan '+miss.length+' evidencias',code:corr&&!corr.done?'waiting':'missing'};
 if(!s.reviewed)return {title:'Evidencias recibidas · Revisar',code:'review'};
 if(!s.sent)return {title:'Preparar envío al cliente',code:'send'};
 if(s.signature==='wrong')return {title:'Firma incorrecta · Llamar',code:'urgent'};
 if(s.signature==='good')return {title:'Documentación firmada recibida',code:'ready'};
 if(s.daysPassed>=signedRemindDays)return {title:'Sin firma · Llamar al cliente',code:'urgent'};
 return {title:'Esperando documentos firmados',code:'waiting'};
}
function officeAnalysis(ctx){
 const list=ctx.jobs.filter(j=>canOffice(ctx,j));
 return {list,missing:list.filter(j=>status(j).code==='missing'),waiting:list.filter(j=>status(j).code==='waiting'),
   review:list.filter(j=>status(j).code==='review'),send:list.filter(j=>status(j).code==='send'),
   urgent:list.filter(j=>status(j).code==='urgent'),done:list.filter(j=>status(j).code==='ready'),
   hold:list.filter(j=>status(j).code==='hold')};
}
function tiles(rows){return '<div class="ops-stats">'+rows.map(([label,value,sub])=>'<div class="ops-stat"><small>'+E(label)+'</small><strong>'+E(value)+'</strong>'+(sub?'<span>'+E(sub)+'</span>':'')+'</div>').join('')+'</div>'}
function header(kicker,title,desc){return '<div class="kn-guidehead"><button data-nav="inicio" aria-label="Volver">‹</button><div><span class="eyebrow">'+E(kicker)+'</span><h1>'+E(title)+'</h1></div></div><p class="ops-desc">'+E(desc)+'</p>'}
function heading(a,b){return '<div class="ops-heading"><strong>'+E(a)+'</strong><span>'+E(b||'')+'</span></div>'}
function block(text,button,id,kind){
 return '<article class="ops-feature"><span class="eyebrow">SIGUIENTE ACCIÓN RECOMENDADA</span><h2>'+E(text.title)+'</h2><p>'+E(text.desc)+'</p>'+(button?'<button class="ops-primary" data-ops="'+kind+'" data-id="'+E(id||'')+'">'+E(button)+' →</button>':'')+'</article>';
}
function card(text,sub,buttons,statusText){
 return '<article class="ops-line"><div class="ops-line-head"><div><strong>'+E(text)+'</strong><small>'+E(sub)+'</small></div>'+(statusText?'<span class="ops-pill">'+E(statusText)+'</span>':'')+'</div><div class="ops-line-actions">'+buttons.map(b=>'<button class="'+(b[0]==='Abrir ficha'?'ops-secondary':'ops-action')+'" data-ops="'+E(b[1])+'" data-id="'+E(b[2])+'">'+E(b[0])+'</button>').join('')+'</div></article>';
}
function officeHTML(ctx){
 const a=officeAnalysis(ctx);
 const pending=[...a.urgent,...a.missing,...a.review],sending=a.send,waiting=[...a.waiting,...a.hold],completed=a.done;
 const top=pending[0]||sending[0]||waiting[0],current=section.oficina;
 let html=header('OFICINA · TAREAS PRIORIZADAS','Mi trabajo','Evidencias verificadas, envíos preparados y llamadas por documentos firmados. KONSOR busca las excepciones y evita repetir datos.');
 html+=tiles([['Pendientes',pending.length],['Listos para enviar',sending.length],['En espera',waiting.length],['Resueltos',completed.length]]);
 if(top){
  const st=status(top);
  html+=block({title:top.id+' · '+st.title,desc:st.code==='missing'?'Faltan '+missing(top.id).map(k=>names[k]).join(', ')+'. KONSOR puede pedirlo al técnico.':st.code==='urgent'?'No se recibió una firma válida en plazo. Conviene llamar al cliente.':'La siguiente gestión está preparada desde la ficha del expediente.'},'Abrir siguiente gestión',top.id,'officeCase');
 }else html+=block({title:'Sin trabajos activos',desc:'No hay nuevas tareas prioritarias en esta demostración.'});
 html+=sectionTabs('oficina',[['pending','Por hacer · '+pending.length],['send','Enviar · '+sending.length],['waiting','En espera · '+waiting.length],['done','Finalizados · '+completed.length]]);
 const rows=current==='send'?sending:current==='waiting'?waiting:current==='done'?completed:pending;
 html+='<div class="ops-queue ops-list">'+(rows.length?rows.map(j=>card(j.id+' · '+j.town,j.service,[['Gestionar','officeCase',j.id],['Abrir ficha','record',j.id]],status(j).title)).join(''):'<div class="ops-empty">Nada pendiente en este apartado.</div>')+'</div>';
 html+='<details class="ops-explain"><summary>¿Cómo organiza KONSOR este trabajo?</summary><p>Si falta una medida o fotografía, la tarea se asigna a Técnicos. Oficina verifica la calidad, tramita con las plataformas externas y utiliza el correo de la ficha central para solicitar la devolución de documentos firmados. Los trámites exactos se configurarán al conocer el procedimiento de la empresa.</p></details>';
 return html;
}
function officeCaseHTML(ctx,j){
 const st=status(j),s=assoc(j.id),miss=missing(j.id);
 let html='<div class="ops-casehead"><strong>'+E(j.id)+' · '+E(j.town)+'</strong><p>'+E(j.service)+' · '+E(j.name)+'</p><span class="ops-pill">'+E(st.title)+'</span></div>';
 if(st.code==='missing'||st.code==='waiting'&&miss.length){
  html+='<div class="ops-note">No se puede preparar el envío: falta '+E(miss.map(k=>names[k]).join(', '))+'.</div>';
  if(st.code==='missing')html+='<button class="ops-primary" id="opAskTech">Pedir automáticamente a Técnicos →</button>';
  if(st.code==='waiting')html+='<div class="ops-note">Ya existe una subsanación en la bandeja técnica. No hace falta repetir la solicitud.</div>';
  return html;
 }
 if(st.code==='hold')return html+'<div class="ops-note">Esta actuación todavía depende de una etapa anterior. Se podrá continuar cuando esté verificada.</div>';
 if(!s.reviewed){
  html+='<div class="ops-note">KONSOR ha comprobado la presencia de evidencias. Oficina solo debe verificar que se ven bien y corresponden a la vivienda.</div><button class="ops-primary" id="opReview">Evidencias correctas · Continuar →</button><button class="ops-secondary" id="opBadPhoto">Hay una foto ilegible · Solicitar otra</button>';
  return html;
 }
 if(!s.sent){
  const addr=j.email||'';
  html+='<div class="ops-metadata"><b>Destinatario de la ficha:</b> '+E(addr||'SIN CORREO')+' <span>· '+E(j.name)+'</span></div>';
  html+='<div class="ops-file-check"><div>✓ Texto común de instrucciones y devolución generado automáticamente</div><div>✓ Asunto y nombre del cliente completados desde la ficha central</div><div>✓ Teléfono de Oficina: '+E(officePhone)+'</div></div>';
  html+='<label class="ops-input">Adjuntar PDF específico del expediente <input type="file" id="opDocument" accept=".pdf,application/pdf" multiple></label>';
  html+='<div id="opFileStatus" class="ops-note">PDF específico: '+(s.filename?E(s.filename):'pendiente de seleccionar')+'</div>';
  html+='<details class="ops-explain"><summary>Ver correo que recibirá el cliente</summary><p><b>Para:</b> '+E(addr)+'</p><p><b>Asunto:</b> '+E(emailSubject(j))+'</p><div class="ops-preview">'+E(emailBody(j))+'</div></details>';
  html+='<div class="ops-caseactions"><button class="ops-secondary" id="opExternal">Abrir plataforma legal</button><button class="ops-primary" id="opSend">Simular envío preparado →</button></div>';
  html+='<div id="opCaseError"></div>';
  html+='<div class="ops-note">No se realiza ningún envío real. Los PDF seleccionados no se guardan. El servicio de correo autorizado y los documentos legales seguirán siendo externos.</div>';
  return html;
 }
 if(st.code==='ready')return html+'<div class="ops-note">La devolución firmada consta como recibida y correcta en la simulación. El siguiente trámite se realizará en la plataforma especializada correspondiente.</div>';
 html+='<div class="ops-note"><b>Correo de destino:</b> '+E(j.email)+' · PDF: '+E(s.filename)+'. Días simulados desde el envío: '+s.daysPassed+'.</div>';
 if(st.code==='urgent')html+='<div class="ops-alert">Llamada necesaria: '+(s.signature==='wrong'?'firma incorrecta':'no han regresado los documentos firmados')+'.</div>';
 html+='<div class="ops-caseactions"><button class="ops-secondary" id="opAdvance">Simular 4 días sin respuesta</button><button class="ops-secondary" id="opSigGood">Recibidos correctos</button><button class="ops-secondary" id="opSigWrong">Firma incorrecta</button><button class="ops-secondary" id="opCalled">Llamada registrada</button></div>';
 return html;
}
function officeOpen(ctx,id){
 const j=ctx.jobs.find(j=>j.id===id&&canOffice(ctx,j));if(!j)return;
 const s=assoc(id),st=status(j);
 ctx.modal('OFICINA · EXPEDIENTE',j.id,officeCaseHTML(ctx,j),()=>{
  const get=id=>document.getElementById(id);
  if(get('opAskTech'))get('opAskTech').onclick=()=>{const miss=missing(j.id);if(!miss.length)return;corrections[j.id]={field:miss[0],jobId:id,crew:j.crew,done:false};ctx.closeModal();ctx.rerender();ctx.toast('Tarea ficticia creada en Técnicos, vinculada al expediente')};
  if(get('opReview'))get('opReview').onclick=()=>{if(missing(j.id).length||!docs[j.id].techDone)return ctx.toast('Bloqueo: faltan evidencias o instalación');s.reviewed=true;ctx.closeModal();ctx.rerender();ctx.toast('Revisión completada. Preparar documentos para firma.')};
  if(get('opBadPhoto'))get('opBadPhoto').onclick=()=>{docs[j.id].despues=false;corrections[j.id]={field:'despues',jobId:id,crew:j.crew,done:false};s.reviewed=false;ctx.closeModal();ctx.rerender();ctx.toast('Nueva foto solicitada al técnico por falta de legibilidad (demo)')};
  if(get('opExternal'))get('opExternal').onclick=()=>ctx.toast('En producción se configurará la URL legal utilizada por Oficina.');
  if(get('opDocument'))get('opDocument').onchange=function(){
   const files=Array.from(this.files||[]);
   const valid=files.length>0&&files.every(file=>/\.pdf$/i.test(file.name)&&(!file.size||file.size<=10*1024*1024));
   s.fileNames=valid?files.map(file=>file.name):[];
   s.filename=s.fileNames.join(', ');
   get('opFileStatus').textContent=valid?files.length+' PDF seleccionados: '+s.filename+' (sin cargar ni guardar)':'Selecciona uno o más PDF válidos de hasta 10 MB cada uno';
 };
 if(get('opSend'))get('opSend').onclick=()=>{
   const email=j.email||'';
   const valid=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
   if(!valid||!s.fileNames?.length){get('opCaseError').innerHTML='<div class="ops-error">Bloqueado: falta un correo válido en la ficha central o no se ha seleccionado ningún PDF. Actualiza la ficha si el destinatario es incorrecto.</div>';return}
   if(missing(j.id).length||!s.reviewed)return ctx.toast('Documentación pendiente de revisión');
   s.email=email;s.sent=true;s.daysPassed=0;s.signature='waiting';ctx.closeModal();ctx.rerender();ctx.toast('Envío SIMULADO al email de la ficha. No se ha enviado correo ni almacenado ningún archivo.');
 };
  if(get('opAdvance'))get('opAdvance').onclick=()=>{s.daysPassed+=4;officeOpen(ctx,id);ctx.rerender()};
  if(get('opSigGood'))get('opSigGood').onclick=()=>{s.signature='good';ctx.closeModal();ctx.rerender();ctx.toast('Documento firmado correcto según registro simulado')};
  if(get('opSigWrong'))get('opSigWrong').onclick=()=>{s.signature='wrong';ctx.closeModal();ctx.rerender();ctx.toast('Generada alerta para llamar por firma incorrecta')};
  if(get('opCalled'))get('opCalled').onclick=()=>{s.contactAttempts++;ctx.closeModal();ctx.rerender();ctx.toast('Llamada anotada; seguirá pendiente hasta recibir documentos correctos')};
 });
}
function techInbox(ctx){
 const open=Object.values(corrections).filter(t=>!t.done&&t.crew==='C1');
 if(!open.length)return '';
 return '<section class="ops-tech-inbox"><div class="eyebrow">SOLICITUDES DE OFICINA</div><h2>'+open.length+' incidencia(s) de documentación</h2><p>Estas tareas aparecen automáticamente vinculadas a la vivienda.</p>'+open.map(t=>card(t.jobId+' · '+names[t.field],'Aportar evidencia o medida que falta',[['Aportar evidencia ficticia','fix',t.jobId]],'Pendiente')).join('')+'</section>';
}
function techCompleted(id,details){
 if(!docs[id])return false;
 if(!details||!Number.isFinite(Number(details.m2))||Number(details.m2)<=0||!details.before||!details.after)return false;
 docs[id].techDone=true;docs[id].antes=true;docs[id].despues=true;docs[id].mediciones=true;docs[id].parte=true;return true;
}
function payStatus(x){return x==='yes'?'Recibido según trabajador':x==='no'?'No recibido':'Sin confirmar'}
function workerHTML(ctx){
 const line=salaried.find(x=>x.id===ctx.role),p=paymentEntry(ctx.role,ctx);
 if(!line)return '<div class="ops-note">No existe ficha de colaborador para este perfil.</div>';
 let html=header('MI REMUNERACIÓN · AUTÓNOMOS','Seguimiento de mi pago','KONSOR calcula cuánto corresponde, pero no realiza pagos ni emite facturas fiscales.');
 html+=tiles([[line.type==='commission'?'Comisión: 1 € / m²':'Importe mensual fijo',euro(p.amount)],['Periodo',salaryPeriod],['Estado',payStatus(p.status)]]);
 if(line.type==='commission'){
  const rows=commissions(ctx);
  html+=heading('DESGLOSE DE COMISIONES','1 €/m² de buhardilla o desván');
  html+='<div class="ops-list">'+rows.map(x=>card(x.id+' · '+x.m2+' m²',x.service+' · Equipo '+x.team,[],euro(x.cents))).join('')+'</div>';
  html+='<div class="ops-note">El ejemplo calcula exactamente 1 € por cada m² registrado en viviendas de buhardilla/desván asignadas al comercial. No incluye otros servicios. La condición de devengo se configurará con el acuerdo real, sin cálculos fiscales.</div>';
 }
 html+='<div class="ops-feature"><div class="eyebrow">CONFIRMACIÓN DE RECEPCIÓN</div><h2>¿Has recibido tu pago?</h2><p>Pago de '+E(salaryPeriod)+' previsto entre el día 1 y el 5 de '+E(monthPay)+'. Tu respuesta es un aviso a Administración, no una verificación bancaria.</p><div class="ops-caseactions"><button class="ops-primary" data-ops="payYes" data-id="'+E(ctx.role)+'">Sí, recibido</button><button class="ops-secondary" data-ops="payNo" data-id="'+E(ctx.role)+'">Todavía no</button></div><div class="ops-note">Respuesta actual: '+E(payStatus(p.status))+'</div></div>';
 return html;
}
function financeHTML(ctx){
 const pay=salarySummary(ctx),an=anomalies();
 const payRows=pay.rows.filter(x=>['jadm','adm'].includes(ctx.role)||ctx.role==='ceo'||x.id===ctx.role);
 let html=header('ADMINISTRACIÓN · SEGUIMIENTO','Pagos y gastos de empresa','La gestoría o el responsable externo ejecuta los pagos. KONSOR calcula las remuneraciones, pregunta si se han recibido y detecta gastos excepcionales.');
 html+=tiles([['Total colaboradores',pay.rows.length],['A confirmar',pay.unconfirmed.length],['Han indicado no cobrado',pay.unpaid.length],['Gastos corporativos',euro(spending())]]);
 html+='<div class="ops-feature"><div class="eyebrow">SIMULAR FECHA DE PAGO</div><h2>Día '+simulatedPayDay+' · '+monthPay+'</h2><p>Los pagos están previstos del 1 al 5. El día 5 KONSOR crea alertas para Dirección si alguien dice que no ha cobrado o no ha confirmado.</p><div class="ops-caseactions">'+[1,3,5,6].map(n=>'<button class="ops-secondary" data-ops="payday" data-id="'+n+'">Día '+n+'</button>').join('')+'</div></div>';
 if(pay.atRisk.length&&simulatedPayDay>=5)html+='<div class="ops-error"><b>Revisar con responsable de pagos:</b> '+pay.atRisk.length+' colaboradores todavía sin confirmación positiva en el día '+simulatedPayDay+'.</div>';
 html+=heading('PAGOS A COLABORADORES','Sin nóminas ni transferencias');
 html+='<div class="ops-list">'+payRows.map(x=>card(x.name,x.type==='commission'?'Comisión de buhardilla · 1 €/m²':'Honorario fijo mensual',
 [['Ver cálculo','paymentDetail',x.id]],euro(x.amount)+' · '+payStatus(x.status))).join('')+'</div>';
 html+=heading('TARJETAS, VIA-T Y COMIDAS','Gasto de empresa: no se resta al trabajador');
 html+='<div class="ops-list">'+spend.map(x=>{
  const est=fuelEstimate(x),suspect=an.some(t=>t.id===x.id),note=est!==null?' · Consumo esperado '+euro(est)+' (distancia/consumo ficticios)':'';
  return card(x.name,x.kind+' · '+x.source+note,[['Revisar registro','expense',x.id]],euro(x.cents)+(suspect?' · Revisar exceso':''));}).join('')+'</div>';
 if(an.length)html+='<div class="ops-error">Posibles desviaciones en combustible: '+an.map(x=>x.name+' '+euro(x.cents)+' frente a '+euro(x.estimate)).join('; ')+'. Verificar kilómetros reales, repostajes y uso autorizado antes de concluir que hay un gasto indebido.</div>';
 html+='<div class="ops-note">El control de tarjetas, consumo y VIA-T requerirá importaciones de proveedores y distancias reales o confirmadas. No existe conexión bancaria, fiscal ni con la gestoría en esta demo.</div>';
 return html;
}
function paymentDetail(ctx,id){
 const x=salaried.find(x=>x.id===id);if(!x||!['ceo','jadm','adm',id].includes(ctx.role))return;
 const p=paymentEntry(id,ctx);
 ctx.modal('ADMINISTRACIÓN · COLABORADOR',x.name,'<div class="ops-callout"><b>Importe estimado: '+euro(p.amount)+'</b><p>'+(x.type==='fixed'?'Honorario fijo configurado':'1 € por m² de buhardilla/desván asociado al comercial')+'</p></div><div class="ops-note">Periodo: '+salaryPeriod+' · Respuesta del trabajador: '+payStatus(p.status)+'. Día de aviso: '+simulatedPayDay+'.</div><div class="ops-note">Si no hay confirmación positiva a fecha 5, se avisa a Dirección y al responsable externo de pagos. No se ejecutan operaciones bancarias desde KONSOR.</div>',()=>{});
}
function ceoHTML(ctx){
 const econ=economic(ctx),pay=salarySummary(ctx),an=anomalies(),officeStatus=officeAnalysis(ctx);
 let html=header('DIRECCIÓN GENERAL · CONTROL','Situación de KONSOR','Solo información para decidir: ingresos, costes, pagos a trabajadores, gastos corporativos y posibles desviaciones. Sin sustituir al contable.');
 html+=tiles([['Ingresos previstos registrados',euro(econ.revenue)],['Costes directos estimados',euro(econ.jobCost)],['Honorarios/Comisiones previstos',euro(econ.salary)],['Gastos de tarjetas y VIA-T',euro(econ.expense)]]);
 html+='<div class="ops-note"><b>Seguimiento de pagos:</b> día '+simulatedPayDay+' de '+monthPay+'. <button class="ops-secondary" data-ops="payday" data-id="1">Simular día 1</button> <button class="ops-secondary" data-ops="payday" data-id="5">Simular día 5</button></div>';
 html+='<div class="ops-feature"><div class="eyebrow">RESULTADO PROVISIONAL · ESCENARIO DE DEMO</div><h2>'+euro(econ.result)+'</h2><p>Ingresos previstos − costes directos estimados − remuneraciones configuradas − gastos corporativos ilustrativos. No equivale a beneficio neto contable ni a saldo bancario.</p><div class="ops-note">'+econ.missingPrices+' expedientes sin precio/coste cerrado: excluidos del cálculo. El resultado no permite afirmar rentabilidad real de la empresa.</div></div>';
 html+=heading('DE DÓNDE VIENEN LOS INGRESOS','Expedientes con precio registrado');
 html+='<div class="ops-list">'+econ.priced.map(j=>card(j.id+' · '+j.town,j.service,[['Abrir ficha','record',j.id]],euro(money(j.income)))).join('')+'</div>';
 html+=heading('PAGOS A CADA TRABAJADOR','Previsto del 1 al 5 de '+monthPay);
 html+='<div class="ops-list">'+pay.rows.map(x=>card(x.name,x.type==='fixed'?'Importe fijo':'Comisión 1 €/m²',[['Ver detalle','paymentDetail',x.id]],euro(x.amount)+' · '+payStatus(x.status))).join('')+'</div>';
 if(simulatedPayDay>=5&&pay.atRisk.length)html+='<div class="ops-error"><b>Alerta a Dirección:</b> '+pay.atRisk.length+' trabajadores sin confirmar recepción el día '+simulatedPayDay+'. Contacta con la gestoría o el responsable de pagos.</div>';
 html+=heading('EN QUÉ SE GASTA EL DINERO','Tarjetas, combustible, peajes, comidas');
 html+='<div class="ops-list">'+econ.categories.map(([name,amount])=>card(name,'Total clasificado',[['Consultar movimientos','expensesOpen',name]],euro(amount))).join('')+'</div>';
 html+=heading('INCIDENCIAS QUE REQUIEREN ACTUACIÓN','Desviaciones, no acusaciones');
 html+='<div class="ops-list">'+(an.length?an.map(x=>card(x.name,'Estimado '+euro(x.estimate)+' · Registrado '+euro(x.cents),[['Ver control','expense',x.id]],'Verificar '+euro(x.excess))):[card('Sin anomalías detectadas','Los datos son un ejemplo y no provienen de tarjetas reales.',[],'')]).join('')+'</div>';
 html+='<div class="ops-note">No mostrar ranking de comerciales al CEO como pantalla central: el responsable de Comercial controla productividad y el CEO ve coste, pagos, ingresos y riesgos. En esta demo los ingresos y costes abarcan solo algunos expedientes, mientras los honorarios representan un periodo completo: la comparación no es un P&L empresarial validado.</div>';
 return html;
}
function bossHTML(ctx){
 if(ctx.role==='ceo')return ceoHTML(ctx);
 if(ctx.group==='oficina'){
  let a=officeAnalysis(ctx);
  return header('JEFATURA DE OFICINA','Seguimiento de la planta','Expedientes para revisión, envíos y llamadas pendientes sin revisar manualmente todos los casos.')+
  tiles([['Expedientes',a.list.length],['Evidencias faltantes',a.missing.length],['Llamadas pendientes',a.urgent.length],['Firmas correctas',a.done.length]])+
  block({title:'Hay '+(a.missing.length+a.urgent.length)+' incidencias que requieren atención',desc:'KONSOR las ha detectado y las asigna al circuito correspondiente.'},'Abrir trabajo organizado','','work');
 }
 if(ctx.group==='administración')return financeHTML(ctx);
 if(ctx.group==='comercial'){
 const rows=commissions(ctx);
 return header('JEFATURA COMERCIAL','Rendimiento de mi equipo','La jefatura controla trabajo, resultados, incidencias y seguimiento. La comisión es siempre 1 € por m² de buhardilla.')+
 tiles([['Metros computables',sum(rows,r=>r.m2)+' m²'],['Comisiones del ámbito',euro(sum(rows,r=>r.cents))],['Operaciones computables',rows.length],['Alertas de gestión','Revisar']])+
 '<div class="ops-list">'+rows.map(r=>card(r.id+' · Equipo '+r.team,r.m2+' m² de buhardilla/desván',[['Ver ficha','record',r.id]],euro(r.cents))).join('')+'</div>'+
 '<div class="ops-note">El análisis de desempeño, la formación o las decisiones de personal requieren contexto y evaluación humana.</div>';
 }
 if(ctx.group==='técnicos'){
 const planned=ctx.jobs.filter(j=>j.stage==='Instalación').length;
 const s=Object.values(corrections).filter(x=>!x.done).length;
 return header('JEFATURA TÉCNICA','Coordinación de instalaciones','Planificar cuadrillas, metros aproximados, materiales y evidencias necesarias. Los técnicos no necesitan precios de sacos.')+
 tiles([['Obras para instalar',planned],['Subsanaciones de Oficina',s],['Cuadrillas ficticias',3],['Partes pendientes','Revisar']])+
 block({title:'Prepara el trabajo del día',desc:'Calcula metros y sacos por orden, confirma disponibilidad y comprueba que los partes quedan completos.'},'Abrir guía técnica','','work');
 }
 return workerHTML(ctx);
}
function next(ctx){
 if(ctx.role==='ceo'){const p=salarySummary(ctx),e=economic(ctx);return {title:'Control económico: '+euro(e.revenue)+' previstos',detail:simulatedPayDay>=5&&p.atRisk.length?'Hay '+p.atRisk.length+' pagos sin confirmar. Revisa las incidencias y contacta con el responsable.':'Revisa honorarios, gastos de tarjetas, peajes y previsiones.'}}
 if(ctx.group==='oficina'){
  const a=officeAnalysis(ctx),row=a.urgent[0]||a.missing[0]||a.review[0]||a.send[0];
  return row?{title:row.id+' · '+status(row).title,detail:'KONSOR ha organizado la siguiente gestión documental y el seguimiento del cliente.'}:{title:'Oficina al día por ahora',detail:'Las tareas restantes están esperando otros procesos.'};
 }
 if(ctx.group==='administración'){const a=anomalies();return {title:a.length?a.length+' posible(s) exceso(s) de combustible':'Pagos y gastos organizados',detail:'El sistema prepara remuneraciones y señala los pagos sin confirmar y movimientos anómalos.'}}
 return null;
}
function activityTasks(ctx){
 let out=[];
 if(ctx.group==='oficina')for(const j of officeAnalysis(ctx).urgent)out.push({id:'O-'+j.id,title:j.id+' · '+status(j).title,text:'Contactar al cliente para obtener documentos firmados correctos',destination:'trabajo'});
 if(ctx.group==='técnicos')for(const t of Object.values(corrections).filter(t=>!t.done&&t.crew==='C1'))out.push({id:'T-'+t.jobId,title:'Solicitud de Oficina · '+t.jobId,text:names[t.field]+' pendiente de aportar',destination:'trabajo'});
 if(isWorker(ctx.role)&&simulatedPayDay>=1){
  const p=paymentEntry(ctx.role,ctx);
  if(p.status!=='yes')out.push({id:'P-'+ctx.role,title:'Confirma tu remuneración de '+salaryPeriod,text:'¿Has recibido el pago? Indica Sí o Todavía no para informar a Administración.',destination:'remuneracion'});
 }
 if(['adm','jadm','ceo'].includes(ctx.role)&&simulatedPayDay>=5){
  const p=salarySummary(ctx);
  if(p.atRisk.length)out.push({id:'ESC',title:'Pagos pendientes a fecha 5',text:p.atRisk.length+' trabajadores sin confirmación de cobro. Avisar a gestoría o responsable externo.',destination:ctx.role==='ceo'?'trabajo':'trabajo'});
 }
 if(['adm','jadm'].includes(ctx.role))for(const x of anomalies())if(!expenseChecked[x.id])out.push({id:'G-'+x.id,title:'Revisar gasto de combustible · '+x.name,text:'Estimado '+euro(x.estimate)+' frente a '+euro(x.cents)+'. Comprobar rutas y justificantes.',destination:'trabajo'});
 return out;
}
function extraRecord(ctx,j,tab){
 if(tab==='documentos'&&['oficina','técnicos','dirección'].includes(ctx.group))
  return '<div class="ops-record">'+heading('EVIDENCIAS COMPARTIDAS','Mismo expediente')+Object.entries(names).map(([k,label])=>'<div class="ops-money-line"><span>'+E(label)+'</span><b>'+(docs[j.id][k]?'Registrada (demo)':'Pendiente')+'</b></div>').join('')+'</div>';
 if(tab==='economía'&&['administración','dirección'].includes(ctx.group))
  return '<div class="ops-record">'+heading('COSTES E INGRESOS PREVISTOS','Datos orientativos')+'<div class="ops-money-line"><span>Ingreso previsto</span><b>'+E(j.income)+'</b></div><div class="ops-money-line"><span>Coste directo estimado</span><b>'+E(j.cost)+'</b></div></div>';
 return '';
}
function modal(ctx,title,html,callback){ctx.modal('KONSOR · DEMOSTRACIÓN',title,html,callback)}
function action(ctx,kind,id){
 const j=ctx.jobs.find(x=>x.id===id); const get=x=>document.getElementById(x);
 if(kind==='work')return ctx.nav('trabajo');
 if(kind==='record'&&j&&ctx.canSee(j))return ctx.openRecord(id);
 if(kind==='officeCase'&&j&&canOffice(ctx,j))return officeOpen(ctx,id);
 if(kind==='fix'){
  const t=corrections[id];if(!t||t.done||ctx.group!=='técnicos'||t.crew!=='C1')return;
  modal(ctx,'Subsanar '+id,'<p class="ops-muted">Falta: '+E(names[t.field])+'. En producción se adjuntaría una foto o documento real al expediente, y Oficina recibiría una alerta.</p><button class="ops-primary" id="opFixNow">Simular evidencia recibida →</button>',()=>{
   const b=get('opFixNow');if(b)b.onclick=()=>{docs[id][t.field]=true;t.done=true;ctx.closeModal();ctx.rerender();ctx.toast('Oficina ya puede revisar la evidencia ficticia')};
  });return;
 }
 if(kind==='payYes'||kind==='payNo'){
  if(id!==ctx.role)return;receipt[id]={status:kind==='payYes'?'yes':'no',day:simulatedPayDay};ctx.rerender();ctx.toast('Respuesta registrada únicamente en esta simulación');return;
 }
 if(kind==='payday'&&['adm','jadm','ceo'].includes(ctx.role)){const val=Number(id);if([1,3,5,6].includes(val)){simulatedPayDay=val;ctx.rerender();ctx.toast('Simulación cambiada al día '+val)}return}
 if(kind==='paymentDetail'&&['adm','jadm','ceo'].includes(ctx.role))return paymentDetail(ctx,id);
 if(kind==='expense'||kind==='expensesOpen'){
  if(!['adm','jadm','ceo'].includes(ctx.role))return;
  const rows=kind==='expense'?spend.filter(x=>x.id===id):spend.filter(x=>x.kind===id);
  modal(ctx,'Gastos de empresa',rows.map(x=>{
   const est=fuelEstimate(x);
   return '<div class="ops-callout"><b>'+E(x.name)+' · '+euro(x.cents)+'</b><p>'+E(x.kind)+' · '+E(x.source)+(est!==null?' · Consumo estimado '+euro(est):'')+'</p></div>';
  }).join('')+'<div class="ops-note">Un exceso teórico no demuestra uso indebido: comprobar distancia real, repostajes, precio y vehículo.</div><button class="ops-primary" id="opExpenseAcknowledge">Marcar revisado (demo)</button>',()=>{
   const b=get('opExpenseAcknowledge');if(b)b.onclick=()=>{rows.forEach(x=>expenseChecked[x.id]=true);ctx.closeModal();ctx.rerender()};
  });return;
 }
}
function mount(ctx){
 context=ctx;
 document.querySelectorAll('[data-ops]').forEach(b=>b.onclick=()=>action(ctx,b.dataset.ops,b.dataset.id));
}
function tests(){return {docs,office,corrections,receipt,spend,salaried,get day(){return simulatedPayDay},get expenses(){return anomalies()},salarySummary,economic,officeAnalysis,commissions,missing,paymentEntry,status,officeOpen,action,techCompleted}};
window.KonsorDemoOperaciones={officeHTML,adminHTML:financeHTML,ceoHTML,bossHTML,workerHTML,next,extraRecord,techInbox,activityTasks,mount,commissions,officeAnalysis,financeAnalysis:(ctx)=>({expenses:spending(),remunerations:salarySummary(ctx),estimated:economic(ctx)}),tests,action,techCompleted};
})();