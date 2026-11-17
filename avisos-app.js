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
 #avisosCenterV2{z-index:10080} #avisosCenterV2 .modal-card{max-width:560px}
 #avisosCenterV2 .av-tabs,#avisosCenterV2 .av-actions{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
 #avisosCenterV2 button,#avisosCenterV2 .av-wa{border:1px solid rgba(148,163,184,.35);border-radius:10px;padding:9px 11px;background:#1e293b;color:#f8fafc;font-size:12px;font-weight:700;cursor:pointer;text-decoration:none}
 #avisosCenterV2 button:disabled{opacity:.5} #avisosCenterV2 .av-tabs button{flex:1}
 #avisosCenterV2 .av-tabs .selected{background:var(--primary,#2563eb)}
 #avisosCenterV2 .av-card{background:rgba(148,163,184,.09);border:1px solid rgba(148,163,184,.25);border-radius:13px;padding:12px;margin:9px 0}
 #avisosCenterV2 .av-unread{border-left:4px solid #38bdf8} #avisosCenterV2 p{font-size:12px;line-height:1.5;margin:7px 0;white-space:pre-wrap;overflow-wrap:anywhere}
 #avisosCenterV2 small{color:#94a3b8;font-size:11px} #avisosCenterV2 h3{font-size:14px;margin:0}
 #avisosCenterV2 label{display:block;font-size:12px;margin:10px 0;line-height:1.5}
 #avisosCenterV2 input:not([type=checkbox]),#avisosCenterV2 select,#avisosCenterV2 textarea{display:block;width:100%;background:#0f172a;color:white;border:1px solid #475569;border-radius:9px;padding:10px;margin-top:5px;font-size:16px}
 #avisosCenterV2 input[type=checkbox]{margin-right:8px;width:17px;height:17px;vertical-align:middle}
 #avisosCenterV2 .av-status{font-size:12px;color:#fde047;white-space:pre-wrap}
 #avisosCenterV2 .av-wa{display:inline-block;background:#047857}
 `;document.head.appendChild(style);
 function report(e){console.error(e);if(status)status.textContent='No se pudo completar: '+(e.message||e);}
 function mount(){
  if(!bell){bell=button('🔔',()=>open());bell.className='btn-hud';bell.id='btnKonsorAvisos';bell.title='Avisos y recordatorios';bell.style.cssText='padding:6px 8px;flex-shrink:0';}
  const host=document.querySelector('.hud-utility-group');if(host&&!bell.isConnected)host.prepend(bell);
  if(modal)return;
  modal=node('div');modal.id='avisosCenterV2';modal.className='modal-overlay';
  const card=node('div',undefined,'modal-card'),head=node('div',undefined,'modal-header');head.append(node('span','🔔 Avisos y recordatorios'),button('✕',()=>modal.classList.remove('active')));
  const tabs=node('div',undefined,'av-tabs');
  [['inbox','Avisos'],['reminders','Recordatorios'],['preferences','Preferencias']].forEach(([id,label])=>{const b=button(label,()=>{tab=id;render();});b.dataset.tab=id;tabs.append(b);});
  status=node('div','', 'av-status');body=node('div',undefined,'modal-scrollable-content');card.append(head,tabs,status,body);modal.append(card);document.body.append(modal);
 }
 function badge(){if(bell){const n=notices.filter(n=>!n.readAt&&!n.resolvedAt).length;bell.textContent='🔔'+(n?' '+n:'');bell.setAttribute('aria-label',`${n} avisos sin leer`);}}
 function open(){if(!me)return;mount();modal.classList.add('active');render();}
 window.openNotificationsCenterV2=open;
 function render(){if(!body||!me)return;status.textContent='';body.replaceChildren();modal.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('selected',b.dataset.tab===tab));
  if(tab==='preferences')renderPreferences();else if(tab==='reminders')renderReminders();else renderInbox();
 }
 function renderInbox(){
  const toolbar=node('div',undefined,'av-actions');
  const filter=node('select');filter.setAttribute('aria-label','Filtrar categoría');filter.innerHTML='<option value="all">Todas las categorías</option>'+Object.entries(categories).map(([id,label])=>`<option value="${id}">${label}</option>`).join('');
  const only=node('input');only.type='checkbox';const lab=node('label');lab.append(only,document.createTextNode('Solo pendientes'));
  toolbar.append(filter,lab);body.append(toolbar);
  const list=node('div');body.append(list);
  const draw=()=>{list.replaceChildren();const items=notices.filter(n=>(filter.value==='all'||n.category===filter.value)&&(!only.checked||!n.resolvedAt));
   if(!items.length)list.append(node('p','No hay avisos para este filtro. Los nuevos irán apareciendo aquí.'));
   items.forEach(n=>{
    const card=node('article',undefined,'av-card'+(!n.readAt?' av-unread':''));card.append(node('h3',n.title),node('small',`${categories[n.category]||'Aviso'} · ${date(n.createdAt)}${n.resolvedAt?' · Atendido':''}`),node('p',n.body));
    const actions=node('div',undefined,'av-actions');
    actions.append(button('Leído',()=>api.call('gestionarAviso',{id:n.id,action:'read'})),button('Atendido',()=>api.call('gestionarAviso',{id:n.id,action:'resolve'})));
    const delay=node('select');delay.setAttribute('aria-label','Tiempo de aplazamiento');delay.innerHTML='<option value="60">En 1 hora</option><option value="120">En 2 horas</option><option value="1440">En 24 horas</option>';
    actions.append(delay,button('Recordármelo',()=>api.call('gestionarAviso',{id:n.id,action:'snooze',minutes:Number(delay.value)})));
    const context=n.context||{};
    if(context.reminderId)actions.append(button('Abrir recordatorios y encargos',()=>{tab='reminders';render();}));
    if(context.zoneId)actions.append(button('Abrir zona/ficha',()=>{
     const idx=typeof savedZones!=='undefined'?savedZones.findIndex(z=>String(z.id)===String(context.zoneId)):-1;
     if(idx<0){status.textContent='La zona ya no está disponible.';return;}modal.classList.remove('active');openDumpModal(idx);
    }));
    else if(context.taskId&&typeof window.openBossWorkMenu==='function')actions.append(button('Abrir plan de jefe',()=>{modal.classList.remove('active');window.openBossWorkMenu();}));
    else if(n.category==='followups'&&typeof window.openFollowUpsModal==='function')actions.append(button('Abrir llamadas',()=>{modal.classList.remove('active');window.openFollowUpsModal();}));
    const draft=me.key==='jefe'&&context.person&&context.person!==me.name?`Hola ${alias(context.person)}, revisamos esto: ${n.body}\n\nCuéntame cómo va y qué necesitas para dejarlo al día.`:`Recordatorio: ${n.title}\n\n${n.body}`;
    const details=node('details'),summary=node('summary','Mensaje de WhatsApp');details.append(summary);
    const text=node('textarea');text.value=draft;text.rows=4;text.setAttribute('aria-label','Mensaje preparado para WhatsApp');
    const wa=node('a','Abrir WhatsApp','av-wa');wa.target='_blank';wa.rel='noopener noreferrer';const update=()=>wa.href='https://wa.me/?text='+encodeURIComponent(text.value);text.oninput=update;update();
    details.append(text,wa,node('p','WhatsApp te deja elegir el destinatario. Revisa el texto antes de enviarlo.'));card.append(actions,details);list.append(card);
   });
  };filter.onchange=draw;only.onchange=draw;draw();
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
  form.append(node('p','Silenciar el móvil conserva los avisos en esta bandeja. Las horas se interpretan en Madrid.'));
  const time=(label,minutes)=>{const l=node('label',label),el=node('input');el.type='time';el.value=String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');l.append(el);form.append(l);return el;};
  const start=time('No molestar desde',preferences.quietStart??1320),end=time('Hasta',preferences.quietEnd??480);
  const controls={};Object.entries(categories).forEach(([k,label])=>{if(k==='management'&&me.key!=='jefe')return;controls[k]=check(label,preferences.categories?.[k]!==false);});
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
    unsub.push(fs.onSnapshot(fs.query(fs.collection(db,'notification_messages'),fs.where('to','==',me.name),fs.orderBy('createdAt','desc'),fs.limit(100)),snap=>{notices=snap.docs.map(d=>({...d.data(),id:d.id}));badge();if(modal.classList.contains('active')&&tab==='inbox'&&!body.querySelector('textarea:focus'))render();},report));
    const rem=me.key==='jefe'?fs.query(fs.collection(db,'app_reminders'),fs.orderBy('updatedAt','desc'),fs.limit(100)):fs.query(fs.collection(db,'app_reminders'),fs.where('to','==',me.name),fs.orderBy('updatedAt','desc'),fs.limit(100));
    unsub.push(fs.onSnapshot(rem,snap=>{reminders=snap.docs.map(d=>({...d.data(),id:d.id}));if(modal.classList.contains('active')&&tab==='reminders'&&!body.querySelector('form'))render();},report));
    unsub.push(fs.onSnapshot(fs.doc(db,'notification_preferences',me.key),snap=>{preferences=snap.data()||{};},report));
    if(new URLSearchParams(location.search).has('aviso'))open();
   },report);
  });
 }catch(e){console.error('No se pudo iniciar el centro de avisos',e);}
})();
