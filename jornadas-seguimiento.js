/* Jornadas y seguimiento — complemento para Control Comercial Navarra. */
(function () {
 'use strict';
 if(window.__jornadasSeguimientoV1)return;
 window.__jornadasSeguimientoV1=true;
 const previousFollow=window.renderFollowUpsModal;
 let includePast=false,journeyFilter='all',followScope='mine',followTown='',followSearch='',focusKey='';
 const states={pendiente:['🔴 Por llamar','#f87171'],ya_llamado:['🟡 No contesta','#fbbf24'],esperando_confirmacion:['🟣 Esperando','#c084fc'],citas:['✅ Confirmada','#34d399'],realizada:['🏗️ Realizada','#6ee7b7'],no_apto:['🚫 No apta','#fb923c']};
 const filters=[['all','Todos'],['pendiente','Por llamar'],['ya_llamado','No contesta'],['esperando_confirmacion','Esperando'],['citas','Confirmadas']];
 const n=(tag,text,parent,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;if(parent)parent.appendChild(e);return e;};
 const button=(parent,text,fn,cls)=>{const e=n('button',text,parent,cls||'js-btn');e.type='button';e.onclick=fn;return e;};
 const alias=name=>getDisplayAlias(name);
 const status=c=>c.obraStatus==='agendada'?'citas':c.obraStatus==='realizada'?'realizada':c.obraStatus==='no_apto'?'no_apto':c.callStatus||'pendiente';
 const allowed=z=>!isMikelTeamMember(z.comercial)&&(currentUserRole==='jefe'||z.comercial===currentUserName);
 const journeyDate=c=>c.obraDate||c.obraRealizadaDate||'';
 const date=ms=>new Date(ms).toLocaleString('es-ES',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
 function rows(scope){return savedZones.filter(z=>allowed(z)&&(scope==='team'||z.comercial===currentUserName)).flatMap(z=>(z.clients||[]).filter(isClientValidFilled).map(c=>({z,c,key:groupedKey(z,c),town:routeTown(z.town)})));}
 function badge(parent,c){const [text,color]=states[status(c)]||states.pendiente;const e=n('span',text,parent,'js-badge');e.style.color=color;e.style.borderColor=color;}
 function missing(c){
  const fields=[];for(const [key,label]of [['name','nombre'],['street','dirección'],['phone','teléfono'],['buildYear','año'],['m2','m²'],['accessType','acceso']])if(!String(c[key]??'').trim())fields.push(label);
  if(c.phone&&!phoneNumber(c.phone))fields.push('revisar teléfono');
  if(c.accessType==='Otro'&&!String(c.accessOther||'').trim())fields.push('detalle del acceso');
  if(c.buildYear&&(!/^\d{4}$/.test(String(c.buildYear))||Number(c.buildYear)>2006))fields.push('revisar año');
  if(!c.atticPhoto)fields.push('foto de acceso');
  if(c.type==='comunidad'&&countComunidadDocs(c.comunidadDocs)<COMUNIDAD_DOCS_SCHEMA.length)fields.push('documentos de comunidad');
  return fields;
 }
 function quality(parent,c){const fields=missing(c);n('p',fields.length?'⚠️ Falta/revisar: '+fields.join(', '):'✅ Captación completa · campos revisados',parent,'js-quality');const next=[];if(!String(c.email||'').trim())next.push('correo');if(!String(c.dni||'').trim())next.push('DNI/NIE');else if(!isValidDni(c.dni))next.push('revisar DNI/NIE');if(c.obraStatus==='agendada'&&!c.crmUploaded)next.push('confirmar CRM');if(next.length)n('small','Para cita: '+next.join(', '),parent);}
 function dueText(c){if(Number(c.nextContactAt)>0)return `⏰ ${c.waitType==='whatsapp'?'WhatsApp':'Llamar'}: ${date(c.nextContactAt)}${Date.now()>=Number(c.nextContactAt)?' · vencido':''}`;const ref=Number(c.createdAt);if(groupedPending(c)&&ref>0&&Date.now()-ref>=86400000)return `⏰ ${Math.floor((Date.now()-ref)/3600000)} h desde la captación`;return '';}
 function openSource(key){const f=groupedResolve(key);if(!f){alert('La ficha ha cambiado. Actualiza la vista.');return;}for(const id of ['followUpsModal','groupedAppointmentsModal'])document.getElementById(id)?.classList.remove('active');openDumpModal(savedZones.indexOf(f.z));}
 function phoneNumber(value){let p=String(value||'').replace(/[^\d+]/g,'');if(p.startsWith('00'))p='+'+p.slice(2);if(/^\d{9}$/.test(p))p='+34'+p;return /^\+\d{7,15}$/.test(p)?p:'';}
 function whatsapp(parent,z,c){const phone=phoneNumber(c.phone);if(!phone)return;
  const details=n('details',null,parent,'js-details');n('summary','💬 Mensajes de WhatsApp',details);
  const types=[['no','No contesta'],['info','En trámite']];if(c.obraStatus==='agendada'&&c.obraDate&&c.obraTime)types.push(['cita','Recordar cita']);if(c.obraStatus==='realizada')types.push(['post','Post-obra']);
  const select=n('select',null,details,'js-input');select.setAttribute('aria-label','Tipo de mensaje');types.forEach(([v,label])=>{const o=n('option',label,select);o.value=v;});
  const text=n('textarea',null,details,'js-input');text.rows=4;text.setAttribute('aria-label','Mensaje editable');
  const link=n('a','Abrir WhatsApp',details,'js-btn js-green');link.target='_blank';link.rel='noopener noreferrer';
  const update=()=>link.href='https://wa.me/'+phone.replace('+','')+'?text='+encodeURIComponent(text.value);
  const fill=()=>{const first=String(c.name||'').trim().split(' ')[0];const hello=`Hola ${first}, soy ${alias(z.comercial)} de Konsor Energía.`;
   const messages={no:`${hello}\n\nHe intentado contactar contigo sobre la vivienda de ${c.street||''}, ${z.town||''}. ¿Qué hora te viene bien para que hablemos?`,info:`${hello}\n\nSeguimos revisando la información de tu vivienda de ${c.street||''}, ${z.town||''}. Si tienes alguna duda o información pendiente, puedes escribirme por aquí.`,cita:`${hello}\n\nTe recuerdo la cita confirmada para el ${formatDate(c.obraDate)} de ${obraSlotLabel(c.obraTime)} en ${c.street||''}, ${z.town||''}. Si necesitas cambiar algo, avísame.`,post:`${hello}\n\nGracias por confiar en nosotros para la obra de ${c.street||''}, ${z.town||''}. ¿Qué tal ha ido todo? Si conoces a alguien interesado, puedes pasarle mi contacto.`};text.value=messages[select.value];update();};select.onchange=fill;text.oninput=update;fill();n('small','Revisa y envía tú el mensaje. Abrir WhatsApp no cambia el estado de llamada.',details);
 }
 function fieldsEditor(parent,key,c){const details=n('details',null,parent,'js-details');n('summary','📝 Datos y notas',details);for(const [field,label]of [['email','Correo electrónico'],['dni','DNI / NIE'],['callNotes','Notas de llamada']]){
   const l=n('label',label,details);const input=n(field==='callNotes'?'textarea':'input',null,l,'js-input');if(field!=='callNotes')input.type=field==='email'?'email':'text';input.value=(groupedEdits.get(key)||{})[field]??c[field]??'';input.oninput=()=>{groupedEdits.set(key,{...(groupedEdits.get(key)||{}),[field]:input.value});};
  }button(details,'💾 Guardar datos',()=>saveNotes(key));button(details,'📂 Abrir ficha',()=>openSource(key));
 }
 function editsFor(key,c){const edit={...(groupedEdits.get(key)||{})};for(const k of Object.keys(edit))edit[k]=String(edit[k]).trim();if(edit.dni){edit.dni=edit.dni.toUpperCase();if(!isValidDni(edit.dni))throw Error('Revisa el DNI/NIE antes de guardar.');}if(edit.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(edit.email))throw Error('Revisa el correo electrónico.');return {...c,...edit};}
 async function saveNotes(key){const f=groupedResolve(key);if(!f||!allowed(f.z))return;try{const draft=editsFor(key,f.c);Object.assign(f.c,draft);f.z._updatedAt=Date.now();if(!await saveAndSync('comercial_custom_zones',savedZones))return;groupedEdits.delete(key);logActivity('llamada',`📝 Datos de llamada actualizados: ${f.c.name||'Cliente'} · ${f.z.town||''}`,f.z.comercial);refresh();}catch(e){alert(e.message);}}
 function refresh(){const root=document.getElementById('groupedAppointmentsBody');const scroll=root?.scrollTop||0;if(document.getElementById('groupedAppointmentsModal')?.classList.contains('active')){renderJourneys();if(root)root.scrollTop=scroll;}if(document.getElementById('followUpsModal')?.classList.contains('active'))renderFollow();}
 function statusDialog(key,next){const f=groupedResolve(key);if(!f||!allowed(f.z)||!groupedPending(f.c))return;
  let modal=document.getElementById('journeyCallDialog');if(!modal){modal=n('div',null,document.body,'modal-overlay');modal.id='journeyCallDialog';modal.style.zIndex='10070';}modal.replaceChildren();const card=n('div',null,modal,'modal-card');const head=n('div',null,card,'modal-header');n('span',states[next][0],head);button(head,'✕',()=>modal.classList.remove('active'));
  const content=n('div',null,card,'modal-scrollable-content');n('p',f.c.name||'Cliente',content);
  const reasonLabel=n('label','Motivo / resultado de la llamada',content);const reason=n('textarea',null,reasonLabel,'js-input');reason.value=f.c.waitReason||'';
  const methodLabel=n('label','Próximo contacto',content);const method=n('select',null,methodLabel,'js-input');for(const [v,text]of [['llamar','Llamar'],['whatsapp','WhatsApp']]){const o=n('option',text,method);o.value=v;}method.value=f.c.waitType||'llamar';
  const timeLabel=n('label','Cuándo volver a contactar',content);const time=n('input',null,timeLabel,'js-input');time.type='datetime-local';let t=new Date(Date.now()+48*3600000);time.value=getLocalDateISO(t)+'T'+String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0');
  button(content,'Guardar resultado',async()=>{
   const current=groupedResolve(key);if(!current||!allowed(current.z)||!groupedPending(current.c)){alert('La ficha ha cambiado. Actualiza la jornada.');return;}
   if(next==='esperando_confirmacion'&&reason.value.trim().length<3){alert('Escribe el motivo de la espera.');return;}
   const at=new Date(time.value).getTime();if(!Number.isFinite(at)||at<=Date.now()){alert('Elige una fecha futura de contacto.');return;}
   try{const draft=editsFor(key,current.c);const now=Date.now();Object.assign(current.c,draft,{callStatus:next,waitReason:reason.value.trim(),waitType:method.value,nextContactAt:at,statusChangedAt:now,callLog:[...(current.c.callLog||[]),{t:now,s:next,r:reason.value.trim()}].slice(-20)});current.z._updatedAt=now;if(!await saveAndSync('comercial_custom_zones',savedZones))return;groupedEdits.delete(key);logActivity('llamada',`${states[next][0]}: ${current.c.name||'Cliente'} · ${current.z.town||''} · próximo contacto ${date(at)}`,current.z.comercial);modal.classList.remove('active');refresh();}catch(e){alert(e.message);}
  },'js-btn js-green');modal.classList.add('active');
 }
 function workCard(cell,z,c,proposal){
  badge(cell,c);n('h4',c.name||'Cliente',cell);n('p',`${c.street||'Sin dirección'}\n${z.town||'Sin pueblo'}\n${alias(z.comercial)}`,cell,'js-address');
  if(focusKey===groupedKey(z,c)){cell.classList.add('js-focused');cell.dataset.focused='true';}
  const matches=journeyFilter==='all'||status(c)===journeyFilter;
  if(!matches){cell.classList.add('js-muted');n('small','No coincide con el filtro',cell);return;}
  quality(cell,c);const due=dueText(c);if(due)n('p',due,cell,'js-due');if(c.waitReason)n('p','Espera: '+c.waitReason,cell,'js-note');
  const actions=n('div',null,cell,'js-actions');const phone=phoneNumber(c.phone);if(phone){const a=n('a','📞 Llamar',actions,'js-btn js-blue');a.href='tel:'+phone;}else button(actions,'Completar teléfono',()=>openSource(groupedKey(z,c)));
  if(groupedPending(c)){button(actions,'🟡 No contesta',()=>statusDialog(groupedKey(z,c),'ya_llamado'));button(actions,'🟣 Esperando',()=>statusDialog(groupedKey(z,c),'esperando_confirmacion'));}
  whatsapp(cell,z,c);fieldsEditor(cell,groupedKey(z,c),c);
  if(proposal&&groupedPending(c)){
   button(cell,'↔️ Cambiar día / hora',()=>moveGroupedProposal(proposal));const available=routeSlotPlan(proposal.date,proposal.time,z,c);if(!available.ok)n('p',available.reason,cell,'js-due');
   const b=button(cell,'✅ Cliente acepta · reservar',()=>{try{editsFor(proposal.key,c);confirmGroupedAppointment(proposal);}catch(e){alert(e.message);}},'js-btn js-green');b.disabled=!available.ok;
  }
 }
 function renderJourneys(){
  const root=document.getElementById('groupedAppointmentsBody');if(!root)return;root.classList.add('js-view');root.replaceChildren();
  n('p','Trabaja las llamadas por jornadas. Las horas propuestas solo se reservan cuando el cliente acepta.',root,'js-intro');
  if(currentUserRole==='jefe'){const select=n('select',null,root,'js-input');for(const [v,label]of [['mine','Mis fichas'],['team','Mi equipo, yo incluido']]){const o=n('option',label,select);o.value=v;}select.value=groupedScope;select.onchange=()=>{if(groupedEdits.size&&!confirm('Hay datos de llamada sin guardar. ¿Cambiar de ámbito y descartarlos?')){select.value=groupedScope;return;}groupedScope=select.value;groupedPlan=null;groupedEdits.clear();focusKey='';renderJourneys();};}
  const tools=n('div',null,root,'js-actions');button(tools,groupedPlan?'🧩 Regenerar propuestas':'🧩 Organizar fichas pendientes',()=>{if(groupedEdits.size&&!confirm('Hay datos de llamada sin guardar. ¿Regenerar y descartarlos?'))return;generateGroupedAppointments();});button(tools,'↻ Actualizar',renderJourneys);
  const archive=n('label',null,root);const check=n('input',null,archive);check.type='checkbox';check.checked=includePast;n('span',' Incluir jornadas pasadas',archive);check.onchange=()=>{includePast=check.checked;renderJourneys();};
  const scope=currentUserRole==='jefe'?groupedScope:'mine';const allRows=rows(scope);const actual=allRows.filter(r=>['agendada','realizada'].includes(r.c.obraStatus)&&journeyDate(r.c)&&(includePast||journeyDate(r.c)>=getTodayISO()));
  const fresh=p=>{const f=groupedResolve(p.key);return f?{...p,...f,town:routeTown(f.z.town)}:null;};
  const inScope=p=>p&&allowed(p.z)&&(scope==='team'||p.z.comercial===currentUserName)&&groupedPending(p.c);
  const proposals=(groupedPlan?.proposals||[]).map(fresh).filter(inScope);
  const unplaced=(groupedPlan?.unplaced||[]).map(fresh).filter(inScope);const towns=new Map();for(const row of [...proposals,...actual,...unplaced])towns.set(routeTown(row.z.town),row.z.town||'Sin pueblo');
  if(!groupedPlan)n('p','Pulsa Organizar para distribuir las fichas pendientes. Las citas ya confirmadas aparecen a continuación.',root,'js-intro');
  if(!towns.size){n('p','No hay jornadas para mostrar en este ámbito.',root);return;}
  if(!towns.has(groupedTown))groupedTown=[...towns.keys()][0];
  const tabs=n('div',null,root,'js-town-tabs');for(const [key,label]of towns){const count=[...proposals,...actual].filter(r=>routeTown(r.z.town)===key).length;const b=button(tabs,`${label} (${count})`,()=>{groupedTown=key;focusKey='';renderJourneys();});b.classList.toggle('js-active',key===groupedTown);}
  const filterbar=n('div',null,root,'js-filters');for(const [value,label]of filters){const b=button(filterbar,label,()=>{journeyFilter=value;renderJourneys();});b.classList.toggle('js-active',journeyFilter===value);b.setAttribute('aria-pressed',String(journeyFilter===value));}
  n('small','Se conservan las cuatro franjas. Las fichas ajenas al filtro se muestran resumidas.',root);
  const dates=[...new Set([...proposals.filter(p=>routeTown(p.z.town)===groupedTown).map(p=>p.date),...actual.filter(r=>r.town===groupedTown).map(r=>journeyDate(r.c))])].sort();
  dates.forEach((day,index)=>{
   n('h3',`Grupo ${index+1} · ${citaDateLong(day)}`,root);
   const confirmed=[...routeRecords(day),...actual.filter(r=>!r.c.obraDate&&journeyDate(r.c)===day).map(r=>({...r,slot:-1}))],proposed=proposals.filter(p=>p.date===day);
   n('p',`${confirmed.length} confirmada(s) · ${proposed.length} propuesta(s). Los huecos de otros pueblos muestran la jornada compartida.`,root,'js-intro');
   const grid=n('div',null,root,'js-grid');
   OBRA_SLOTS.forEach((slot,slotIndex)=>{
    const cell=n('article',null,grid,'js-card');n('strong',slot.start+'–'+slot.end,cell,'js-slot');
    const occupied=confirmed.filter(r=>r.slot===slotIndex);
    if(occupied.length){for(const r of occupied){if(!allowed(r.z)||(scope!=='team'&&r.z.comercial!==currentUserName)){n('h4','🔒 Franja ocupada',cell);n('p',r.z.town||'',cell);}else workCard(cell,r.z,r.c,null);}return;}
    const p=proposed.find(p=>p.time===slot.start);const found=p?groupedResolve(p.key):null;if(found)workCard(cell,found.z,found.c,p);else n('p','Hueco libre',cell,'js-intro');
   });
   for(const r of confirmed.filter(r=>r.slot<0&&allowed(r.z)&&(scope==='team'||r.z.comercial===currentUserName))){const warning=n('article',null,root,'js-card');n('strong','⚠️ Ficha sin una franja válida · revisar hora',warning);workCard(warning,r.z,r.c,null);}
  });
  const displaced=proposals.filter(p=>routeTown(p.z.town)===groupedTown&&routeRecords(p.date).some(r=>OBRA_SLOTS[r.slot]?.start===p.time));
  for(const p of displaced){const box=n('article',null,root,'js-card');n('h4','⚠️ Propuesta desplazada por otra reserva',box);workCard(box,p.z,p.c,p);}
  for(const p of unplaced.filter(p=>routeTown(p.z.town)===groupedTown)){const box=n('article',null,root,'js-card');n('h4','Ficha sin hueco propuesto',box);n('p',p.reason||'Revisa los datos y vuelve a organizar.',box);workCard(box,p.z,p.c,null);button(box,'Completar / revisar ficha',()=>openSource(p.key));}
  if(focusKey){const cell=root.querySelector('[data-focused="true"]');if(cell)requestAnimationFrame(()=>cell.scrollIntoView({block:'center',behavior:'smooth'}));}
 }
 function goToJourney(key){const f=groupedResolve(key);if(!f||!allowed(f.z))return;document.getElementById('followUpsModal')?.classList.remove('active');const oldScope=groupedScope;groupedScope=currentUserRole==='jefe'?followScope:'mine';if(oldScope!==groupedScope)groupedPlan=null;if(journeyDate(f.c)&&journeyDate(f.c)<getTodayISO())includePast=true;
  const previousKeys=new Set((groupedPlan?.proposals||[]).map(p=>p.key));
  if(groupedPending(f.c)&&(!groupedPlan||!previousKeys.has(key)||!groupedPlan.proposals.some(p=>p.key===key&&p.z.comercial===f.z.comercial))){groupedPlan=buildGroupedAppointments();}
  groupedTown=routeTown(f.z.town);journeyFilter='all';focusKey=key;openGroupedAppointments();
 }
 function renderFollow(){
  if(isMikelTeamMember(currentUserName)){previousFollow();return;}
  const modal=document.getElementById('followUpsModal'),root=document.getElementById('followUpsModalBody');if(!modal||!root)return;
  root.classList.add('js-view');root.replaceChildren();const title=modal.querySelector('.modal-header span');if(title)title.textContent='📋 Seguimiento de clientes';const old=modal.querySelector('.subtab-bar');if(old)old.style.display='none';
  n('p','Consulta estados, próximos contactos y datos que faltan. Trabaja las llamadas y reservas dentro de Jornadas.',root,'js-intro');
  const controls=n('div',null,root,'js-controls');if(currentUserRole==='jefe'){const select=n('select',null,controls,'js-input');for(const [v,label]of [['mine','Mis clientes'],['team','Mi equipo, yo incluido']]){const o=n('option',label,select);o.value=v;}select.value=followScope;select.onchange=()=>{followScope=select.value;followTown='';renderFollow();};}else followScope='mine';
  const data=rows(followScope),towns=new Map();for(const r of data)towns.set(r.town,r.z.town||'Sin pueblo');if(followTown&&!towns.has(followTown))followTown='';
  const select=n('select',null,controls,'js-input');let option=n('option','Todos los pueblos',select);option.value='';for(const [v,label]of towns){option=n('option',label,select);option.value=v;}select.value=followTown;select.setAttribute('aria-label','Pueblo');select.onchange=()=>{followTown=select.value;renderFollow();};
  const search=n('input',null,controls,'js-input');search.type='search';search.placeholder='Nombre, teléfono o calle';search.value=followSearch;
  const bar=n('div',null,root,'js-filters');const options=[...filters,['realizada','Realizadas'],['no_apto','No aptas']];for(const [value,label]of options){const b=button(bar,label,()=>{activeFollowUpFilter=value;renderFollow();});b.classList.toggle('js-active',activeFollowUpFilter===value);}
  const list=n('div',null,root);
  const draw=()=>{list.replaceChildren();const q=routeTown(followSearch);const visible=data.filter(r=>(!followTown||r.town===followTown)&&(activeFollowUpFilter==='all'||status(r.c)===activeFollowUpFilter)&&(!q||routeTown([r.c.name,r.c.phone,r.c.street,r.z.town].join(' ')).includes(q))).sort((a,b)=>(Number(a.c.nextContactAt)||Infinity)-(Number(b.c.nextContactAt)||Infinity));
   n('p',`${visible.length} ficha(s) · ${visible.filter(r=>!missing(r.c).length).length} con captación completa`,list,'js-intro');
   for(const {z,c,key}of visible){const card=n('article',null,list,'js-card');const head=n('div',null,card,'js-card-head');n('h4',c.name||'Cliente',head);badge(head,c);n('p',`${z.town||''} · ${c.street||''}\n${alias(z.comercial)}`,card,'js-address');quality(card,c);const due=dueText(c);if(due)n('p',due,card,'js-due');if(c.waitReason)n('p','Espera: '+c.waitReason,card,'js-note');if(['agendada','realizada'].includes(c.obraStatus))n('p',`📅 ${formatDate(journeyDate(c))} · ${obraSlotLabel(c.obraTime)}`,card);
    const actions=n('div',null,card,'js-actions');button(actions,'📂 Ver ficha',()=>openSource(key));if(groupedPending(c)||(['agendada','realizada'].includes(c.obraStatus)&&journeyDate(c)))button(actions,'🧩 Trabajar en Jornadas',()=>goToJourney(key),'js-btn js-blue');
   }
  };search.oninput=()=>{followSearch=search.value;draw();};draw();
 }
 const style=n('style',null,document.head);style.textContent=`
 .js-view{font-size:12px}.js-view .js-intro{color:#94a3b8;line-height:1.5;margin:8px 0}.js-view h3{color:#7dd3fc;font-size:14px;margin:18px 0 8px}.js-view h4{font-size:13px;margin:9px 0 5px}.js-card{background:#1e293b;border:1px solid #475569;border-radius:14px;padding:12px;min-width:0;overflow-wrap:anywhere;margin:8px 0}.js-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.js-card .js-address{white-space:pre-line;color:#cbd5e1;line-height:1.5;margin:7px 0}.js-card .js-slot{display:block;color:#fde047;font-size:14px;margin-bottom:9px}.js-card .js-badge{display:inline-block;padding:4px 7px;border:1px solid;border-radius:8px;font-size:10px;font-weight:800}.js-card .js-quality{color:#cbd5e1;font-size:11px;line-height:1.5;margin:8px 0}.js-card small{display:block;color:#94a3b8;font-size:10px;line-height:1.5}.js-actions,.js-filters,.js-town-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:9px 0}.js-town-tabs{flex-wrap:nowrap;overflow-x:auto}.js-town-tabs button{white-space:nowrap}.js-btn{display:inline-block;box-sizing:border-box;text-decoration:none;text-align:center;border:1px solid #475569;background:#0f172a;color:#f8fafc;border-radius:9px;font-size:11px;font-weight:800;padding:9px;cursor:pointer}.js-card>.js-btn{display:block;width:100%;margin-top:6px}.js-actions .js-btn{flex:1;min-width:70px}.js-filters button{font-size:10px;padding:7px}.js-active{background:#0369a1!important;border-color:#38bdf8!important}.js-blue{background:#2563eb}.js-green{background:#047857}.js-btn:disabled{opacity:.45;cursor:default}.js-input{box-sizing:border-box;width:100%;padding:9px;margin:6px 0;border:1px solid #475569;background:#0f172a;color:#fff;border-radius:8px;font-size:16px;min-width:0}.js-details{margin:10px 0;padding-top:8px;border-top:1px solid #334155}.js-details summary{cursor:pointer;color:#7dd3fc;font-size:11px}.js-details label{display:block;font-size:10px;color:#cbd5e1;margin-top:7px}.js-due{color:#fbbf24;font-size:11px;line-height:1.5}.js-note{color:#d8b4fe;font-size:11px;line-height:1.5}.js-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.js-muted{opacity:.45}.js-focused{outline:2px solid #38bdf8;outline-offset:2px}.js-controls{display:flex;flex-wrap:wrap;gap:6px}.js-controls>.js-input{flex:1;min-width:140px}#journeyCallDialog .modal-card{max-width:450px}#journeyCallDialog label{display:block;margin-top:12px;font-size:12px}#followUpsModal .modal-card{max-width:760px}
 `;
 window.renderGroupedAppointments=renderJourneys;
 window.renderFollowUpsModal=renderFollow;
 window.groupedSaveNotes=saveNotes;
 // Actualizar la cuadrícula al recibir datos, conservando las notas aún sin guardar.
 const cloudUpdate=window.applyCloudDataUpdate;
 if(typeof cloudUpdate==='function')window.applyCloudDataUpdate=function(key,data){const result=cloudUpdate.apply(this,arguments);if(key==='comercial_custom_zones'&&document.getElementById('groupedAppointmentsModal')?.classList.contains('active')&&!document.getElementById('journeyCallDialog')?.classList.contains('active')&&!document.querySelector('#groupedAppointmentsBody input:focus,#groupedAppointmentsBody textarea:focus'))renderJourneys();return result;};
})();
