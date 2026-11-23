/* KONSOR · Centro real de mensajes entre plantas (Cloud Functions).
 * Sin almacenamiento local de supuestas tareas: el servidor confirma cada operación.
 * CEO solo ve incidencias críticas y escaladas; las demás plantas trabajan en sus bandejas.
 */
(function(w){
'use strict';
const PLANTS=['comercial','oficina','tecnicos','ceo'];
const names={comercial:'Comercial',oficina:'Oficina',tecnicos:'Técnicos',ceo:'CEO'};
const valid=()=>!!(w.auth?.currentUser?.uid&&w.KonsorBridge?.state?.().connected);
const E=(tag,cl,txt,p)=>{const n=document.createElement(tag);if(cl)n.className=cl;if(txt!==undefined)n.textContent=txt;p?.append(n);return n;};
const B=(txt,fn,cl)=>{const b=E('button',cl||'kpm-button',txt);b.type='button';b.onclick=fn;return b;};
const readable=t=>t?new Date(t).toLocaleString('es-ES',{dateStyle:'medium',timeStyle:'short'}):'Sin fecha límite';
const call=async(name,data)=>{
 const fn=w[name];if(typeof fn!=='function')throw Error('La función de mensajería todavía no está desplegada en Firebase.');
 const result=(await fn(data)).data;
 if(!result?.ok)throw Error('Firebase no confirmó la operación.');
 return result;
};
let shown=null;
function open(plant){
 if(!PLANTS.includes(plant))return;
 document.getElementById('konsorPlantMessages')?.remove();
 const overlay=E('div','kpm-overlay',undefined,document.body);overlay.id='konsorPlantMessages';
 const page=E('section','kpm-page',undefined,overlay);
 const head=E('header','kpm-header',undefined,page),copy=E('div','',undefined,head);
 E('small','','KONSOR · '+names[plant].toUpperCase(),copy);
 E('h2','','Mensajes entre plantas',copy);
 const close=B('Cerrar',()=>overlay.remove());head.append(close);
 const body=E('div','kpm-body',undefined,page);
 const status=E('p','kpm-status','',body);status.setAttribute('role','status');
 shown={overlay,plant};
 const report=(msg,error=false)=>{status.textContent=msg;status.className='kpm-status'+(error?' kpm-error':'');};
 const btn=(label,fn)=>{const b=B(label,async()=>{b.disabled=true;try{await fn();}catch(e){report(e.message||'Error de conexión.',true);}finally{b.disabled=false;}},'kpm-button');return b;};
 const formField=(parent,label,tag='input')=>{
  const wrap=E('label','kpm-label',undefined,parent);
  E('span','',label,wrap);const n=E(tag,'kpm-field',undefined,wrap);
  if(tag==='input')n.type='text';return n;
 };
 async function refresh(){
  if(!valid()){report('No hay una sesión sincronizada con Firebase.',true);return;}
  report('Consultando tareas del servidor…');
  const r=await call('listarMensajesPlantaKonsor',{plant});
  if(!overlay.isConnected)return;
  render(r.items||[]);report('');
 }
 function compose(container){
  const detail=E('section','kpm-card',undefined,container);
  E('h3','','Enviar una instrucción o solicitud',detail);
  const recipient=formField(detail,'Planta destinataria','select');
  PLANTS.filter(p=>p!==plant).forEach(p=>{const option=E('option','',names[p],recipient);option.value=p;});
  const title=formField(detail,'Asunto');
  title.maxLength=140;
  const content=formField(detail,'Qué se necesita','textarea');
  content.maxLength=2000;content.rows=4;
  const importance=formField(detail,'Prioridad','select');
  [['normal','Normal'],['important','Importante'],['critical','Crítica · Dirección']].forEach(([v,t])=>{
   const option=E('option','',t,importance);option.value=v;
  });
  const due=formField(detail,'Fecha límite (opcional)');due.type='datetime-local';
  recipient.onchange=()=>{
   importance.value=recipient.value==='ceo'?'critical':'normal';
   importance.disabled=recipient.value==='ceo';
  };
  const send=btn('Enviar a la planta',async()=>{
   const dueAt=due.value?new Date(due.value).getTime():null;
   if(!title.value.trim())throw Error('Indica el asunto.');
   const r=await call('crearMensajePlantaKonsor',{
    to:recipient.value,title:title.value.trim(),detail:content.value.trim(),
    priority:importance.value,dueAt
   });
   if(r.item){title.value='';content.value='';due.value='';}
   await refresh();
  });
  detail.append(send);
 }
 async function marginPanel(container){
  const card=E('section','kpm-card',undefined,container);
  E('h3','','Márgenes y plazos de control',card);
  E('p','kpm-help','Los porcentajes son umbrales de alerta, no modifican presupuestos ni precios de obras.',card);
  const defs=[['ackHours','Horas sin confirmar una tarea'],['criticalOverdueHours','Horas vencida antes de escalar'],['marginMinPct','Margen mínimo (%)'],['marginWarningPct','Avisar si margen inferior a (%)']];
  const input={};
  defs.forEach(([k,label])=>{input[k]=formField(card,label);input[k].type='number';input[k].min='0';input[k].step='1';});
  try{const r=await call('configurarMargenesPlantaKonsor',{});defs.forEach(([k])=>{input[k].value=r.values[k];});}
  catch(e){E('p','kpm-error',e.message,card);}
  card.append(btn('Guardar márgenes y plazos',async()=>{
   const values=Object.fromEntries(defs.map(([k])=>[k,Number(input[k].value)]));
   await call('configurarMargenesPlantaKonsor',{action:'save',values});
   report('Márgenes y plazos guardados en Firebase.');
  }));
 }
 function render(rows){
  body.querySelector('.kpm-results')?.remove();
  const section=E('section','kpm-results',undefined,body);
  const pending=rows.filter(x=>x.status!=='completed');
  const summary=E('div','kpm-summary',undefined,section);
  E('strong','',pending.length+' pendientes',summary);
  E('small','',rows.length+' movimientos registrados',summary);
  if(!rows.length)E('p','kpm-help','Sin mensajes entre plantas por ahora.',section);
  const cards=E('div','kpm-list',undefined,section);
  rows.forEach(item=>{
   const box=E('article','kpm-card',undefined,cards);
   E('strong','',item.title,box);
   E('small','',names[item.from]+' → '+names[item.to]+' · '+(item.status==='completed'?'Completada':item.status==='acknowledged'?'Recibida':'Pendiente'),box);
   if(item.detail)E('p','kpm-help',item.detail,box);
   E('small','',item.priority==='critical'?'CRÍTICO':item.priority==='important'?'IMPORTANTE':'NORMAL',box);
   E('small','','Límite: '+readable(item.dueAt),box);
   const actions=E('div','kpm-actions',undefined,box);
   // Ver una planta como CEO no concede su identidad ni permiso de confirmación.
   const owner=plant===item.to&&!(w.konsorDesigner?.permitted?.()&&plant!=='ceo');
   if(owner&&item.status==='pending')actions.append(btn('Confirmar recibido',async()=>{
    await call('actualizarMensajePlantaKonsor',{id:item.id,action:'ack'});await refresh();
   }));
   if(owner&&item.status!=='completed')actions.append(btn('Marcar completada',async()=>{
    await call('actualizarMensajePlantaKonsor',{id:item.id,action:'complete'});await refresh();
   }));
  });
 }
 const actions=E('div','kpm-actions',undefined,body);
 actions.append(btn('Actualizar bandeja',refresh));
 // Las vistas del fundador son inspección; el emisor real es CEO.
 if(plant==='ceo')compose(body);
 if(plant==='ceo')marginPanel(body);
 else{
  const info=E('p','kpm-help','Desde esta planta puedes consultar las tareas. Las instrucciones nuevas se emiten con el perfil autorizado.',body);
  if(!w.konsorDesigner?.permitted?.())compose(body);
  else info.textContent+=' Para emitir una instrucción como Dirección, abre la planta CEO.';
 }
 overlay.addEventListener('click',ev=>{if(ev.target===overlay)overlay.remove();});
 refresh().catch(e=>report(e.message,true));
}
w.KonsorPlantMessages=Object.freeze({open});
})(window);
