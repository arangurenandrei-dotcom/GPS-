/* Konsor Avisos v2: insertar este archivo con un script al final de index.html. */
(async function () {
 'use strict';
 if (window.__konsorAvisosV2) return;
 window.__konsorAvisosV2 = true;
 const names=['Andrei (Jefe)','Comercial 1','Comercial 2','Comercial 3','Comercial 4','Comercial 5'];
 const keys=['jefe','comercial1','comercial2','comercial3','comercial4','comercial5'];
 const categories={activity:'Actividad del equipo',zones:'Zonas e instrucciones',followups:'Llamadas y seguimiento',quality:'Fichas incompletas',daily:'Jornada y rutina',motivation:'Liga y evolución',management:'Dirección del equipo',reminders:'Recordatorios',appointments:'Citas y obras'};
 let api, me=null, notices=[],reminders=[],preferences={},tab='inbox',unsub=[],profileStop=null,bell,body,modal,status;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const alias=n=>typeof getDisplayAlias==='function'?getDisplayAlias(n):n;
 const date=ms=>new Date(ms).toLocaleString('es-ES',{timeZone:'Europe/Madrid',dateStyle:'short',timeStyle:'short'});
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
 const button=(text,fn)=>{const el=node('button',text);el.type='button';el.onclick=async()=>{el.disabled=true;try{await fn();}catch(e){report(e);}finally{el.disabled=false;}};return el;};
 const pendingKey='konsor_avisos_eventos_v2';
 let pending=[];try{pending=JSON.parse(localStorage.getItem(pendingKey)||'[]');if(!Array.isArray(pending))pending=[];}catch(e){}
 function savePending(){try{localStorage.setItem(pendingKey,JSON.stringify(pending));}catch(e){console.warn('No se pudo conservar la actividad pendiente',e);}}
 let flushing=false;
 async function flush(){if(flushing||!api||!me||!navigator.onLine)return;flushing=true;try{
  for(const item of pending.slice()){
   if(item.key!==me.key)continue;
   try{await api.call('registrarActividadAvisos',item.event);pending=pending.filter(x=>x!==item);savePending();}
   catch(e){console.warn('Actividad pendiente de sincronización',e.code||e.message);break;}
  }
 }finally{flushing=false;}}
 // Conservar la actividad original y añadir un registro individual para el servidor.
 if(typeof window.logActivity==='function'){
  const original=window.logActivity;
  window.logActivity=async function(type,text,owner){
   const event=await original.apply(this,arguments);
   if (!event)return;
   if(!['ficha','hoja','llamada','cita','obra','cancelada','jornada'].includes(type))return;
   const key=sessionStorage.getItem('auth_user_key');if(!keys.includes(key))return;
   const last=event;
   if(!last||last.type!==type||last.text!==text)return;
   pending.push({key,event:{id:String(last.id),type,text,owner:last.owner,t:last.t}});savePending();flush();
  };
 }
 function wrapShift(fn,reopen){const original=window[fn];if(typeof original!=='function')return;
  window[fn]=async function(){
   const before=typeof getTodayShift==='function'?getTodayShift(currentUserName)?.status:null;
   const result=await original.apply(this,arguments);
   if(result!==true)return result;
   const shift=getTodayShift(currentUserName),after=shift?.status;
   if(after&&after!==before){

    const label=reopen?'Reabre la jornada':after==='working'?(before==='lunch'?'Reanuda la jornada':'Empieza la jornada'):after==='lunch'?'Pausa para comer':'Cierra la jornada';
    window.logActivity('jornada',label,currentUserName);
   }
   return result;
  };
 }
 wrapShift('handleShiftAction',false);wrapShift('reopenTodayShift',true);
 window.addEventListener('online',flush);setInterval(flush,60000);
 const style=node('style');style.textContent=`
 #avisosCenterV2{z-index:10250!important;position:fixed;inset:0;background:rgba(27,37,54,.30)!important;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);align-items:center;justify-content:center;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}
 #avisosCenterV2.active{display:flex!important}
 #avisosCenterV2 .modal-card{max-width:600px!important;width:min(100%,600px);height:min(100%,900px);max-height:100%;display:flex;flex-direction:column;border:1px solid #e3eaf3!important;border-radius:26px!important;background:#f7f9fc!important;color:#263449!important;box-shadow:0 30px 80px rgba(15,23,42,.22)!important;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif!important}
 #avisosCenterV2 .modal-header{padding:20px!important;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e6eaf1!important;background:rgba(255,255,255,.85)!important;color:#263449!important}
 #avisosCenterV2 .modal-header span{font-size:21px!important;font-weight:760!important;color:#263449!important}
 #avisosCenterV2 .modal-scrollable-content{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:15px!important;color:#263449!important}
 #avisosCenterV2 .av-tabs{display:flex;gap:5px;margin:12px 16px 4px;padding:4px;background:#e9eef5;border-radius:15px}
 #avisosCenterV2 .av-tabs button{flex:1;border:0!important;background:transparent!important;color:#65748a!important;min-height:41px}
 #avisosCenterV2 .av-tabs button.selected{background:#fff!important;color:#263449!important;box-shadow:0 2px 8px rgba(20,30,60,.1)!important}
 #avisosCenterV2 button,#avisosCenterV2 .av-wa{appearance:none;border:1px solid #dce4ee!important;border-radius:13px!important;padding:10px 13px!important;background:#fff!important;color:#28394f!important;font-size:13px!important;font-weight:680!important;line-height:1.3;min-height:41px;cursor:pointer;text-decoration:none;box-shadow:none!important}
 #avisosCenterV2 button.av-primary,#avisosCenterV2 .av-primary{background:#2864e9!important;border-color:#2864e9!important;color:#fff!important}
 #avisosCenterV2 button.av-subtle{background:#eef2f7!important;border-color:transparent!important}
 #avisosCenterV2 button.av-danger{color:#b42318!important;background:#fff1f1!important;border-color:#ffd7d7!important}
 #avisosCenterV2 button:disabled{opacity:.5}
 #avisosCenterV2 .av-card{background:#fff!important;border:1px solid #e4eaf2!important;border-radius:20px!important;padding:16px!important;margin:10px 0!important;display:flex;flex-direction:column;gap:8px;touch-action:pan-y;transition:transform .16s,opacity .16s;min-width:0;box-shadow:none!important}
 #avisosCenterV2 .av-unread{border-left:4px solid #6e9af5!important}
 #avisosCenterV2 .av-card.av-task{border-left:4px solid #5c7fae!important}
 #avisosCenterV2 .av-card.av-swiped{transform:translateX(-65px);opacity:.35}
 #avisosCenterV2 .av-card-header{display:flex;gap:10px;align-items:flex-start;justify-content:space-between}
 #avisosCenterV2 .av-card-icon{width:35px;height:35px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:#eef3fb;color:#49668b;font-size:17px}
 #avisosCenterV2 .av-card-text{flex:1;min-width:0}
 #avisosCenterV2 p{font-size:13px!important;line-height:1.55!important;margin:2px 0!important;white-space:pre-wrap;overflow-wrap:anywhere;color:#697b90!important}
 #avisosCenterV2 .av-card .av-copy{font-size:14px!important;color:#314158!important;line-height:1.48}
 #avisosCenterV2 small{color:#8996a8!important;font-size:11px!important}
 #avisosCenterV2 h3{font-size:16px!important;line-height:1.3!important;font-weight:740!important;margin:0!important;color:#263449!important}
 #avisosCenterV2 .av-actions{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0}
 #avisosCenterV2 .av-actions button{flex:1;min-width:110px}
 #avisosCenterV2 .av-status{font-size:12px;color:#9b4c18;white-space:pre-wrap;margin:3px 16px}
 #avisosCenterV2 label{display:block;font-size:13px;color:#4e5f76;margin:10px 0}
 #avisosCenterV2 input:not([type=checkbox]),#avisosCenterV2 select,#avisosCenterV2 textarea{display:block;width:100%;background:#fff!important;color:#263449!important;border:1px solid #dce4ef!important;border-radius:13px!important;padding:11px!important;margin-top:6px;font-size:16px!important;min-height:43px;box-sizing:border-box}
 #avisosCenterV2 input[type=checkbox]{margin-right:8px;width:18px;height:18px;vertical-align:middle}
 #avisosCenterV2 .av-hint{font-size:12px!important;color:#8b97a9!important}
 #avisosCenterV2 .av-section{font-size:12px;font-weight:740;letter-spacing:.02em;color:#7c8ca1;margin:18px 2px 8px}
 #avisosCenterV2 .av-counter{font-size:11px;font-weight:700;color:#2864e9;border-radius:99px;background:#e8f0ff;padding:5px 9px;white-space:nowrap}
 #avisosCenterV2 .av-empty{padding:30px 16px;text-align:center;color:#7e8b9f}
 #avisosCenterV2 .av-wa{display:inline-block;background:#edf9f2!important;border-color:#c5ecd6!important;color:#107546!important}
 #avisosCenterV2 .av-task-state{font-size:11px;font-weight:700;color:#55718e}
 #avisosCenterV2 details summary{font-size:12px;color:#50647d;cursor:pointer;padding:6px 0}
 #btnKonsorAvisos{font-size:17px!important;border-radius:12px!important}
 @media(max-width:680px){#avisosCenterV2 .modal-card{height:100%;max-height:100%;width:100%;border-radius:0!important}#avisosCenterV2 .modal-scrollable-content{padding:15px!important}#avisosCenterV2 .modal-header{padding:18px!important}}
 `;document.head.appendChild(style);
 function report(e){console.error(e);if(status)status.textContent='No se pudo completar: '+(e.message||e);}
 function mount(){
  if(!bell){bell=button('🔔',()=>open());bell.className='btn-hud';bell.id='btnKonsorAvisos';bell.title='Avisos y recordatorios';bell.style.cssText='padding:6px 8px;flex-shrink:0';}
  const host=document.querySelector('.hud-utility-group');if(host&&!bell.isConnected)host.prepend(bell);
  if(modal)return;
  modal=node('div');modal.id='avisosCenterV2';modal.className='modal-overlay';
  const card=node('div',undefined,'modal-card'),head=node('div',undefined,'modal-header');head.append(node('span','Centro de actividad'),button('✕',()=>modal.classList.remove('active')));
  const tabs=node('div',undefined,'av-tabs');
  [['inbox','Avisos'],['tasks','Tareas'],['preferences','Ajustes']].forEach(([id,label])=>{const b=button(label,()=>{tab=id;render();});b.dataset.tab=id;tabs.append(b);});
  status=node('div','', 'av-status');body=node('div',undefined,'modal-scrollable-content');card.append(head,tabs,status,body);modal.append(card);document.body.append(modal);
 }
 function badge(){if(bell){const n=notices.filter(n=>!n.resolvedAt&&((isTask(n)&&!(n.context?.reminderId&&reminders.some(r=>r.id===n.context.reminderId)))||(!isTask(n)&&!n.readAt))).length+reminders.filter(r=>r.assignment&&r.to===me?.name&&r.enabled&&!r.completedAt&&!r.confirmedAt).length;bell.textContent='🔔'+(n?' '+n:'');bell.setAttribute('aria-label',`${n} avisos o tareas pendientes`);}}
 function open(target){if(!me)return;mount();if(['inbox','tasks','preferences'].includes(target))tab=target;modal.classList.add('active');render();}
 window.openNotificationsCenterV2=open;
 function render(){if(!body||!me)return;status.textContent='';body.replaceChildren();modal.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('selected',b.dataset.tab===tab));
  if(tab==='preferences')renderPreferences();else if(tab==='tasks')renderTasks();else renderInbox();
 }

 const isTask=n=>!!(n&&(n.context?.reminderId||n.context?.zoneId&&['zones','followups','quality'].includes(n.category)||['followups','quality'].includes(n.category)||n.category==='zones'&&/asignad|encargo|instruccion|visita|sector/i.test(n.title||'')));
 const human=n=>{
  const title=String(n.title||"").replace(/^\s*[🏠📋📅✅⚠️🔔]+\s*/u,"").trim();
  const body=String(n.body||"").replace(/^\s*[🏠📋📅✅⚠️🔔]+\s*/u,"").trim();
  if(n.category==='motivation'&&/liga/i.test(title))return{title:"Tu posición en la Liga",body,icon:"🏆"};
  if(n.category==='motivation'&&/actividad|quincena|mes|semana/i.test(title))return{title:"Resumen de tu rendimiento",body,icon:"🏆"};
  if(n.category==='daily'&&/10:00|todav[ií]a no has iniciado/i.test(title+' '+body))return{title:"Revisa el fichaje de entrada",body,icon:"🕘"};
  if(n.category==='daily'&&/comida|pausa/i.test(title+' '+body))return{title:"Comprueba tu pausa de comida",body,icon:"🕘"};
  if(n.category==='quality')return{title:"Hay fichas por completar",body:body||"Abre las fichas incompletas y revisa los datos.",icon:"📋"};
  if(n.category==='zones')return{title:/asignad/i.test(title)?"Nueva zona de trabajo":title||"Zona de trabajo",body,icon:"📍"};
  if(n.category==='daily')return{title:title||"Tu jornada",body,icon:"🕘"};
  if(n.category==='activity')return{title:title||"Actividad registrada",body,icon:"✓"};
  if(n.category==='appointments')return{title:title||"Obra o cita",body,icon:"📅"};
  if(n.category==='followups')return{title:title||"Llamada pendiente",body,icon:"📞"};
  return{title:title||"Actualización de KONSOR",body,icon:isTask(n)?"📌":"•"};
 };
 const resolveNotice=async n=>{await api.call('gestionarAviso',{id:n.id,action:'resolve'});};
 function taskAction(card,n){
  const context=n.context||{};
  const actions=node('div',undefined,'av-actions');
  if(context.zoneId){
   const idx=typeof savedZones!=='undefined'?savedZones.findIndex(z=>String(z.id)===String(context.zoneId)):-1;
   if(idx>=0){
    const b=button('Abrir zona',()=>{modal.classList.remove('active');openDumpModal(idx);});
    b.className='av-primary';actions.append(b);
   }else actions.append(node('p','La zona ya no está disponible en las fichas actuales.'));
  }
  if(context.reminderId){
   const b=button('Ver encargo y responder',()=>{tab='tasks';render();const el=body.querySelector('[data-reminder-id="'+String(context.reminderId).replace(/"/g,'')+'"]');if(el)el.scrollIntoView({behavior:'smooth',block:'center'});});
   b.className='av-primary';actions.append(b);
  }
  if(n.category==='followups'&&!context.zoneId){
   const b=button('Abrir llamadas',()=>{modal.classList.remove('active');if(typeof window.openCnOffice==='function')window.openCnOffice();});b.className='av-primary';actions.append(b);
  }
  if(n.category==='zones'&&!context.reminderId){
   actions.append(button('He revisado esta zona',()=>resolveNotice(n)));
  }
  if(n.category==='quality'&&!context.zoneId){
   const b=button('Ver fichas',()=>{modal.classList.remove('active');window.openCnClients?.();});b.className='av-primary';actions.append(b);
  }
  if(context.taskId&&me.key==='jefe'){
   const b=button('Abrir planificación',()=>{modal.classList.remove('active');window.openBossWorkMenu?.();});b.className='av-primary';actions.append(b);
  }
  if(['quality','followups'].includes(n.category)&&!context.reminderId){const finished=button('Ya está solucionado',()=>resolveNotice(n));actions.append(finished);}
  if(n.category!=='zones')actions.append(button('Marcar como leído',()=>api.call('gestionarAviso',{id:n.id,action:'read'})));
  card.append(actions);
 }
 function noticeCard(n,task=false){
  const card=node('article',undefined,'av-card'+(!n.readAt?' av-unread':'')+(task?' av-task':''));
  const h=node('div',undefined,'av-card-header'),symbol=node('div',undefined,'av-card-icon'),content=node('div',undefined,'av-card-text');
  const display=human(n);symbol.textContent=display.icon;
  content.append(node('h3',display.title),node('small',(categories[n.category]||'KONSOR')+' · '+date(n.createdAt)));
  h.append(symbol,content);card.append(h);
  const fullBody=display.body||'Sin detalles adicionales.';
  const compact=fullBody.length>210?fullBody.slice(0,207).replace(/\s+\S*$/,'').trim()+'…':fullBody;
  card.append(node('p',compact,'av-copy'));
  if(fullBody.length>210){const more=node('details'),summary=node('summary','Leer detalles completos');more.append(summary,node('p',fullBody,'av-copy'));card.append(more);}
  if(task){taskAction(card,n);}
  else{
   const actions=node('div',undefined,'av-actions');
   const done=button('Entendido · Descartar',()=>resolveNotice(n));done.className='av-subtle';actions.append(done);
   if(n.category==='motivation'){const view=button('Ver resultados',()=>{modal.classList.remove('active');window.openCnResults?.();});actions.prepend(view);}
   card.append(actions);
   card.append(node('small','Desliza hacia la izquierda para descartarlo.','av-hint'));
   let startX=null,startY=null;
   card.addEventListener('touchstart',e=>{if(e.touches.length===1){startX=e.touches[0].clientX;startY=e.touches[0].clientY;}},{passive:true});
   card.addEventListener('touchend',e=>{
    if(startX===null||!e.changedTouches.length)return;
    const dx=e.changedTouches[0].clientX-startX,dy=e.changedTouches[0].clientY-startY;
    startX=null;startY=null;
    if(dx< -75&&Math.abs(dx)>Math.abs(dy)*1.3){card.classList.add('av-swiped');resolveNotice(n).catch(report);}
   },{passive:true});
  }
  return card;
 }
 function renderInbox(){
  const info=notices.filter(n=>!n.resolvedAt&&!isTask(n));
  const head=node('div',undefined,'av-card');
  head.append(node('h3','Avisos para ti'),node('p','Información y recordatorios. No necesitas responder: descártalos cuando los hayas visto.'));
  body.append(head);
  const toolbar=node('div',undefined,'av-actions');
  toolbar.append(node('small',info.length+' avisos activos'));
  if(info.length){
   const clear=button('Descartar los leídos',async()=>{
    const rows=info.filter(n=>n.readAt);
    if(!rows.length){status.textContent='Todavía no hay avisos marcados como leídos.';return;}
    for(const n of rows)await resolveNotice(n);
    status.textContent=rows.length+' avisos leídos descartados.';
   });clear.className='av-subtle';toolbar.append(clear);
  }
  body.append(toolbar);
  if(!info.length)body.append(node('div','No tienes avisos informativos pendientes.','av-empty'));
  info.forEach(n=>body.append(noticeCard(n,false)));
 }
 function renderTasks(){
  const attention=notices.filter(n=>!n.resolvedAt&&isTask(n)&&!(n.context?.reminderId&&reminders.some(r=>r.id===n.context.reminderId)));
  const active=reminders.filter(r=>r.enabled&&!r.completedAt&&r.assignment);
  const head=node('div',undefined,'av-card');
  head.append(node('h3','Pendiente de hacer'),node('p','Zonas, encargos y gestiones que necesitan una acción. Se mantienen aquí hasta que estén resueltas.'));
  body.append(head);
  const assigned=active.filter(r=>r.to===me.name),supervised=me.key==='jefe'?active.filter(r=>r.to!==me.name):[];
  if(assigned.length)body.append(node('div','Encargos asignados ('+assigned.length+')','av-section'));
  assigned.forEach(r=>body.append(reminderTask(r)));
  if(supervised.length){body.append(node('div','Encargos del equipo ('+supervised.length+')','av-section'));supervised.forEach(r=>body.append(reminderTask(r)));}
  if(attention.length){body.append(node('div','Otras tareas y zonas ('+attention.length+')','av-section'));attention.forEach(n=>body.append(noticeCard(n,true)));}
  if(!active.length&&!attention.length)body.append(node('div','No tienes tareas pendientes.','av-empty'));
  const add=node('div',undefined,'av-actions');
  if(me.key==='jefe'){
   const assign=button('Asignar tarea al comercial',()=>editReminder({assignment:true}));assign.className='av-primary';add.append(assign);
  }
  add.append(button('Crear recordatorio',()=>editReminder()));
  body.append(add);
  const extra=node('details'),summary=node('summary','Ver todos los recordatorios');extra.append(summary);
  const region=node('div');extra.append(region);body.append(extra);
  reminders.filter(r=>!r.assignment||!r.enabled||r.completedAt).forEach(r=>region.append(reminderTask(r)));
 }
 function reminderTask(r){
  const card=node('article',undefined,'av-card av-task');card.dataset.reminderId=r.id;
  const title=node('h3',r.title),meta=node('small',(r.to===me.name?'Para ti':'Para '+alias(r.to))+' · '+date(r.dueAt));
  card.append(title,meta,node('p',r.body||'Sin instrucciones adicionales.','av-copy'));
  const state=r.completedAt?'Completado':r.confirmedAt?'Recibido, pendiente de realizar':r.assignment?'Por confirmar':'Recordatorio';
  card.append(node('div',state,'av-task-state'));
  const actions=node('div',undefined,'av-actions');
  if(r.assignment&&r.to===me.name&&r.enabled){
   if(!r.confirmedAt){const accept=button('He recibido la tarea',()=>api.call('actualizarEncargo',{id:r.id,action:'confirm'}));accept.className='av-primary';actions.append(accept);}
   const finish=button('Trabajo realizado',()=>api.call('actualizarEncargo',{id:r.id,action:'complete'}));if(r.confirmedAt)finish.className='av-primary';actions.append(finish);
  }
  if(me.key==='jefe'||r.creatorUid===me.uid){
   actions.append(button('Editar',()=>editReminder(r)));
   actions.append(button('Desactivar',()=>api.call('guardarRecordatorio',{...r,to:keys[names.indexOf(r.to)],enabled:false})));
  }
  card.append(actions);return card;
 }
 function renderReminders(){
  body.append(node('p',me.key==='jefe'?'Crea recordatorios para ti o para cualquier miembro de tu equipo.':'Crea recordatorios personales. Aquí también verás los que te asigne Andrei.'));
  body.append(button('＋ Crear recordatorio',()=>editReminder()));
  if(me.key==='jefe')body.append(button('Asignar visita o encargo',()=>editReminder({assignment:true})));
  reminders.forEach(r=>{const card=node('article',undefined,'av-card');card.append(node('h3',r.title),node('p',r.body||''),node('small',`${alias(r.to)} · ${date(r.dueAt)} · ${r.repeat==='daily'?'Diario':r.repeat==='weekly'?'Semanal':'Una vez'} · ${r.enabled?'Activo':'Desactivado'}`));
   if(r.assignment){
    card.append(node('p',r.completedAt?'Completado':r.confirmedAt?'Confirmado':r.enabled?'Pendiente de confirmar':'Desactivado'));
    if(r.to===me.name&&r.enabled){if(!r.confirmedAt)card.append(button('Confirmar recibido',()=>api.call('actualizarEncargo',{id:r.id,action:'confirm'})));
    card.append(button('Marcar completado',()=>api.call('actualizarEncargo',{id:r.id,action:'complete'})));}
   }
   if(me.key==='jefe'||r.creatorUid===me.uid){const actions=node('div',undefined,'av-actions');actions.append(button('Editar',()=>editReminder(r)),button('Desactivar',()=>api.call('guardarRecordatorio',{...r,to:keys[names.indexOf(r.to)],enabled:false})));card.append(actions);}body.append(card);
  });
 }
 function editReminder(r={}){
  body.replaceChildren();const form=node('form');
  function input(label,type,value){const l=node('label',label),el=node('input');el.type=type;el.value=value||'';l.append(el);form.append(l);return el;}
  const title=input(r.assignment?'Visita o tarea':'Título','text',r.title);title.required=true;title.maxLength=120;
  const l=node('label',r.assignment?'Lugar, objetivo e instrucciones':'Mensaje'),text=node('textarea');text.value=r.body||'';text.rows=4;text.maxLength=1500;l.append(text);form.append(l);
  const recipient=node('select');const allowed=me.key==='jefe'?keys:[me.key];recipient.innerHTML=allowed.map(k=>`<option value="${k}">${esc(alias(names[keys.indexOf(k)]))}</option>`).join('');recipient.value=keys[names.indexOf(r.to)]||me.key;
  const rl=node('label','Para');rl.append(recipient);form.append(rl);
  const due=r.dueAt&&r.dueAt>Date.now()?r.dueAt:Date.now()+3600000;
  const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(due)).replace(' ','T');
  const when=input('Fecha y hora (Madrid)','datetime-local',parts);when.required=true;
  const repeat=node('select');repeat.innerHTML='<option value="none">Una vez</option><option value="daily">Cada día</option><option value="weekly">Cada semana</option>';repeat.value=r.repeat||'none';const re=node('label','Repetir');re.append(repeat);if(!r.assignment)form.append(re);
  const save=button(r.assignment?'Asignar encargo':'Guardar recordatorio',async()=>{
   if(!form.reportValidity())return;
   // Interpretar la hora elegida como Madrid incluso en otro huso horario.
   const [day,time]=when.value.split('T');const [hh,mm]=time.split(':').map(Number);let dueAt=Date.parse(day+'T00:00Z')+(hh*60+mm)*60000;
   for(let i=0;i<4;i++){const p=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',dateStyle:'short',timeStyle:'short',hourCycle:'h23'}).format(new Date(dueAt));const [d,t]=p.split(' ');const [h,m]=t.split(':').map(Number);const delta=(Date.parse(day+'T00:00Z')-Date.parse(d+'T00:00Z'))/86400000*1440+hh*60+mm-h*60-m;if(!delta)break;dueAt+=delta*60000;}
   const check=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(dueAt)).replace(' ','T');if(check!==when.value)throw Error('Esa hora no existe por el cambio de hora. Elige otra.');
   await api.call('guardarRecordatorio',{...(r.id?{id:r.id}:{}),assignment:!!r.assignment,title:title.value,body:text.value,to:recipient.value,dueAt,repeat:repeat.value,enabled:true});render();
  });form.append(save,button('Volver',render));form.onsubmit=e=>e.preventDefault();body.append(form);
 }
 function renderPreferences(){
  const form=node('form');const check=(label,value)=>{const l=node('label'),el=node('input');el.type='checkbox';el.checked=value;l.append(el,document.createTextNode(label));form.append(l);return el;};
  const enabled=check('Recibir avisos en el móvil',preferences.enabled!==false);
  form.append(node('p','Puedes silenciar las notificaciones del móvil sin perder las tareas de la app. Los avisos informativos se pueden descartar; los encargos conservan su estado. Horario de Madrid.'));
  const time=(label,minutes)=>{const l=node('label',label),el=node('input');el.type='time';el.value=String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');l.append(el);form.append(l);return el;};
  const start=time('No molestar desde',preferences.quietStart??1320),end=time('Hasta',preferences.quietEnd??480);
  const groups=[
   ['Avisos informativos',['daily','motivation','activity']],
   ['Gestiones y tareas',['zones','followups','quality','reminders','appointments']],
   ['Dirección',['management']]
  ];
  const controls={};
  groups.forEach(([heading,keysGroup])=>{
   if(heading==='Dirección'&&me.key!=='jefe')return;
   form.append(node('h3',heading,'av-section'));
   keysGroup.forEach(k=>{controls[k]=check(categories[k],preferences.categories?.[k]!==false);});
  });
  form.append(button('Guardar preferencias',async()=>{const mins=s=>{const [h,m]=s.split(':').map(Number);return h*60+m;};if(!start.value||!end.value)throw Error('Completa las horas.');await api.call('guardarPreferenciasAvisos',{enabled:enabled.checked,quietStart:mins(start.value),quietEnd:mins(end.value),categories:Object.fromEntries(Object.entries(controls).map(([k,v])=>[k,v.checked]))});status.textContent='Preferencias guardadas.';}));
  form.append(button('Activar permisos de este móvil',async()=>{if(typeof window.requestMobileNotifications==='function')await window.requestMobileNotifications();else throw Error('No se encuentra el botón de activación de avisos.');}));
  form.append(node('p','Los controles automáticos se ejecutan cada 5 minutos. No recibir un aviso no demuestra que alguien no haya trabajado: el sistema usa los datos registrados.'));
  form.onsubmit=e=>e.preventDefault();body.append(form);
 }
 try{
  const source=[...document.scripts].map(s=>s.textContent).join('\n');const version=(source.match(/firebasejs\/(\d+\.\d+\.\d+)\/firebase-app\.js/)||[])[1]||'13.3.0';const base='https://www.gstatic.com/firebasejs/'+version+'/';
  const [appMod,authMod,fs,functions]=await Promise.all(['firebase-app.js','firebase-auth.js','firebase-firestore.js','firebase-functions.js'].map(f=>import(base+f)));
  let app;for(let i=0;i<60;i++){app=appMod.getApps()[0];if(app)break;await new Promise(r=>setTimeout(r,1000));}if(!app)throw Error('Firebase no ha terminado de cargar.');
  const db=fs.getFirestore(app),auth=authMod.getAuth(app),fn=functions.getFunctions(app,'europe-west1');
  api={call:async(name,data)=>(await functions.httpsCallable(fn,name)(data)).data};
  function stop(){unsub.forEach(f=>f());unsub=[];me=null;notices=[];reminders=[];preferences={};if(bell)bell.remove();if(modal)modal.classList.remove('active');}
  authMod.onAuthStateChanged(auth,user=>{
   if(profileStop)profileStop();stop();if(!user)return;
   profileStop=fs.onSnapshot(fs.doc(db,'usuarios',user.uid),snapshot=>{
    const profile=snapshot.data();if(!profile||profile.estado!=='aprobado'||!keys.includes(profile.userKey)){stop();return;}
    if(me?.key===profile.userKey)return;stop();me={uid:user.uid,key:profile.userKey,name:names[keys.indexOf(profile.userKey)]};mount();flush();
    unsub.push(fs.onSnapshot(fs.query(fs.collection(db,'notification_messages'),fs.where('to','==',me.name),fs.orderBy('createdAt','desc'),fs.limit(100)),snap=>{notices=snap.docs.map(d=>({...d.data(),id:d.id}));badge();if(modal.classList.contains('active')&&['inbox','tasks'].includes(tab)&&!body.querySelector('form'))render();},report));
    const rem=me.key==='jefe'?fs.query(fs.collection(db,'app_reminders'),fs.orderBy('updatedAt','desc'),fs.limit(100)):fs.query(fs.collection(db,'app_reminders'),fs.where('to','==',me.name),fs.orderBy('updatedAt','desc'),fs.limit(100));
    unsub.push(fs.onSnapshot(rem,snap=>{reminders=snap.docs.map(d=>({...d.data(),id:d.id}));if(modal.classList.contains('active')&&tab==='tasks'&&!body.querySelector('form'))render();},report));
    unsub.push(fs.onSnapshot(fs.doc(db,'notification_preferences',me.key),snap=>{preferences=snap.data()||{};},report));
    if(new URLSearchParams(location.search).has('aviso'))open();
   },report);
  });
 }catch(e){console.error('No se pudo iniciar el centro de avisos',e);}
})();
