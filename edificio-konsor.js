/* KONSOR · Edificio operativo V1.
   UI de departamentos: no concede permisos de Firebase ni simula agentes IA.
   Todos los accesos críticos siguen sujetos a las reglas del servidor. */
(function(){
'use strict';
if(window.KonsorEdificio && window.KonsorEdificio.version==='1.0.0')return;

const ROOT_ID='keEdificio';
const GEMINI_URL='https://share.gemini.google/S2jfiuk0c3m2';
const FLOORS=[
 {id:'direccion',n:'05',name:'Dirección',icon:'⌘',tag:'CEO · jefes de equipo',desc:'Objetivos, planificación, rendimiento y decisiones.'},
 {id:'administracion',n:'04',name:'Administración',icon:'▤',tag:'Gestión económica',desc:'Facturación, comisiones, gastos y control financiero.'},
 {id:'oficina',n:'03',name:'Oficina',icon:'▦',tag:'Operaciones y expedientes',desc:'Volcado, llamadas, documentación y seguimiento.'},
 {id:'tecnicos',n:'02',name:'Técnicos',icon:'⌁',tag:'Ejecución de trabajos',desc:'Revisión técnica, obras, mediciones y evidencias.'},
 {id:'comercial',n:'01',name:'Comercial',icon:'◎',tag:'Captación y territorio',desc:'Sectores, clientes, actividad y resultados.'}
];
const ACCESS={
 ceo:['direccion','administracion','oficina','tecnicos','comercial'],
 jefe:['direccion','oficina','tecnicos','comercial'],
 administracion:['administracion'],
 oficina:['oficina'],
 tecnico:['tecnicos','oficina'],
 comercial:['comercial','oficina']
};
let activeFloor=null,lastFocus=null,touchStart=null;
const el=(tag,cls,txt,parent)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(txt!==undefined&&txt!==null)node.textContent=String(txt);
 if(parent)parent.appendChild(node);
 return node;
};
function addButton(parent,label,click,cls){
 const b=el('button','ke-button '+(cls||''),label,parent);b.type='button';b.addEventListener('click',click);return b;
}
function getIdentity(){
 const name=typeof currentUserName==='string'?currentUserName:'';
 const raw=typeof currentUserRole==='string'?currentUserRole.toLowerCase():'';
 const chief=raw==='jefe';
 // Compatibilidad con la cuenta existente. No representa un permiso seguro
 // hasta que Firebase emita y valide un rol CEO propio.
 const ceo=chief && name==='Andrei (Jefe)';
 const role=ceo?'ceo':chief?'jefe':Object.prototype.hasOwnProperty.call(ACCESS,raw)?raw:'comercial';
 return {name,role,chief,ceo};
}
function loggedIn(){
 const user=getIdentity();
 const app=document.getElementById('appContainer');
 return Boolean(user.name && app && getComputedStyle(app).display!=='none');
}
function hasAccess(floor){
 return ACCESS[getIdentity().role]?.includes(floor)===true;
}
function visibleZones(){
 const source=typeof savedZones!=='undefined'&&Array.isArray(savedZones)?savedZones:[];
 const user=getIdentity();
 const active=source.filter(z=>z&&!z.isNoAptoZone&&!z.isHotMission&&!z.isSingleHouse);
 if(user.ceo)return active;
 if(user.chief){
  const mikel=user.name.startsWith('Mikel');
  return active.filter(z=>String(z.comercial||'').startsWith('Mikel')===mikel);
 }
 return active.filter(z=>z.comercial===user.name);
}
function metrics(){
 const zones=visibleZones();
 const clients=zones.flatMap(z=>Array.isArray(z.clients)?z.clients:[]).filter(c=>c&&(c.name||c.phone||c.street));
 return {
  zones:zones.length,
  clients:clients.length,
  open:zones.filter(z=>z.status!=='completada'&&z.precheck?.sectorStatus!=='no_apto').length,
  dump:zones.filter(z=>z.streetCompletedAt&&!z.dumpDate&&z.status!=='completada').length,
  booked:clients.filter(c=>c.obraStatus==='agendada').length
 };
}
function root(){
 let r=document.getElementById(ROOT_ID);
 if(r)return r;
 r=el('div','ke-overlay',undefined,document.body);
 r.id=ROOT_ID;r.hidden=true;r.setAttribute('role','dialog');r.setAttribute('aria-modal','true');
 r.setAttribute('aria-label','Edificio KONSOR');
 const panel=el('div','ke-panel',undefined,r);
 const header=el('header','ke-header',undefined,panel);
 const back=addButton(header,'‹',goBack,'ke-icon ke-back');
 back.setAttribute('aria-label','Volver al edificio');
 const heading=el('div','ke-heading',undefined,header);
 el('span','ke-overline','KONSOR · ORGANIZACIÓN',heading);
 el('strong','ke-page-title','Edificio KONSOR',heading);
 const closeButton=addButton(header,'×',close,'ke-icon ke-close');
 closeButton.setAttribute('aria-label','Cerrar edificio');
 el('main','ke-body',undefined,panel);
 r.addEventListener('touchstart',function(e){
  touchStart=null;
  if(e.touches.length!==1||e.touches[0].clientX>42)return;
  if(e.target.closest('input,textarea,select,[data-no-swipe]'))return;
  touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY};
 },{passive:true});
 r.addEventListener('touchend',function(e){
  if(!touchStart)return;
  const t=touchStart;touchStart=null;
  const p=e.changedTouches[0];
  if(!p)return;
  const dx=p.clientX-t.x,dy=p.clientY-t.y;
  if(dx>75&&Math.abs(dy)<65&&dx>Math.abs(dy)*1.5)goBack();
 },{passive:true});
 return r;
}
function close(){
 const r=document.getElementById(ROOT_ID);
 if(!r||r.hidden)return;
 r.hidden=true;activeFloor=null;
 if(lastFocus&&lastFocus.isConnected&&typeof lastFocus.focus==='function')lastFocus.focus({preventScroll:true});
}
function goBack(){if(activeFloor){activeFloor=null;render();}else close();}
function open(){
 if(!loggedIn()){alert('Inicia sesión en KONSOR para acceder al edificio.');return;}
 lastFocus=document.activeElement;
 activeFloor=null;
 const r=root();r.hidden=false;render();
 r.querySelector('.ke-close')?.focus({preventScroll:true});
}
function findAction(){
 for(const fn of arguments)if(typeof fn==='function')return fn;
 return null;
}
function launch(fn){
 const action=fn;
 if(!action){alert('Este módulo todavía no está disponible en KONSOR.');return;}
 close();
 try{action();}
 catch(err){alert('No se ha podido abrir el módulo: '+(err?.message||err));}
}
const actions={
 day:()=>findAction(window.konsorMotor?.openDay?.bind(window.konsorMotor),window.openCnDay),
 map:()=>findAction(window.cnvShowMap,window.openCnTerritory),
 office:()=>findAction(window.konsorMotor?.openOffice?.bind(window.konsorMotor),window.openCnOffice),
 clients:()=>findAction(window.openCnClients),
 results:()=>findAction(window.openCnResults),
 teamResults:()=>findAction(window.openKonsorTeamResults,window.openCnResults),
 director:()=>findAction(window.openKonsorDirection,window.konsorPlanificador?.open?.bind(window.konsorPlanificador)),
 planning:()=>findAction(window.konsorPlanificador?.open?.bind(window.konsorPlanificador),window.openKonsorDirectorPlan),
 notifications:()=>findAction(window.openNotificationsCenterV2),
 gemini:()=>()=>window.open(GEMINI_URL,'_blank','noopener,noreferrer')
};
function run(name){
 const fn=actions[name]?.();
 launch(fn);
}
function stat(parent,label,value,note){
 const node=el('div','ke-stat',undefined,parent);
 el('strong','ke-stat-value',value,node);
 el('span','ke-stat-label',label,node);
 if(note)el('small','ke-stat-note',note,node);
}
function eyebrow(parent,text){el('div','ke-kicker',text,parent);}
function sectionHeading(parent,title,detail){
 const head=el('div','ke-section-head',undefined,parent);
 el('h3','',title,head);
 if(detail)el('p','',detail,head);
}
function message(parent,title,detail,cls){
 const box=el('div','ke-notice '+(cls||''),undefined,parent);
 el('strong','',title,box);el('p','',detail,box);
}
function workflow(parent){
 sectionHeading(parent,'Circuito de trabajo','Cada departamento trabaja sobre la información que se ha registrado en KONSOR.');
 const pipeline=el('div','ke-pipeline',undefined,parent);
 ['Captación','Revisión técnica','Oficina','Administración','Dirección'].forEach((item,i)=>{
  const step=el('span','ke-pipeline-step',item,pipeline);
  if(i<4)step.setAttribute('aria-label',item+'; paso '+(i+1));
 });
}
function renderLobby(parent){
 const hero=el('section','ke-hero',undefined,parent);
 eyebrow(hero,'CENTRO OPERATIVO');
 el('h1','','Edificio KONSOR',hero);
 el('p','','Cinco departamentos en un mismo espacio. Selecciona una planta para consultar su trabajo y abrir sus herramientas.',hero);
 const id=getIdentity();const label=id.ceo?'CEO · Dirección':id.chief?'Jefe de equipo':id.role==='tecnico'?'Técnico':id.role==='administracion'?'Administración':id.role==='oficina'?'Oficina':'Comercial';
 const rolePill=el('div','ke-role',undefined,hero);
 el('span','ke-role-dot','●',rolePill);
 el('span','',label+' · '+id.name,rolePill);
 if(id.ceo){
  const m=metrics(),summary=el('div','ke-metrics',undefined,parent);
  stat(summary,'Sectores visibles',m.zones);
  stat(summary,'Fichas registradas',m.clients);
  stat(summary,'Volcados pendientes',m.dump);
 }
 sectionHeading(parent,'Plantas','Las cerraduras representan el acceso disponible en esta versión.');
 const floorList=el('div','ke-floor-list',undefined,parent);
 FLOORS.forEach(f=>{
  const allowed=hasAccess(f.id);
  const btn=addButton(floorList,'',()=>{if(!allowed)return;activeFloor=f.id;render();},'ke-floor'+(allowed?'':' ke-locked'));
  btn.disabled=!allowed;
  btn.setAttribute('aria-label',f.name+(allowed?'':' · sin acceso'));
  el('div','ke-floor-number',f.n,btn);
  const info=el('div','ke-floor-main',undefined,btn);
  el('strong','',f.name,info);el('span','',f.tag,info);el('small','',f.desc,info);
  el('span','ke-floor-chevron',allowed?'›':'🔒',btn);
 });
 workflow(parent);
 message(parent,'Automatizaciones reales','Los asistentes autónomos y los traspasos automáticos entre departamentos todavía no están conectados. Esta versión ofrece el edificio, datos existentes y accesos funcionales.','ke-neutral');
}
function action(parent,name,desc,actionKey){
 const button=addButton(parent,'',()=>run(actionKey),'ke-action');
 const text=el('div','',undefined,button);
 el('strong','',name,text);el('small','',desc,text);
 el('span','ke-action-arrow','↗',button);
 if(!actions[actionKey]?.()){button.disabled=true;button.classList.add('ke-disabled');}
}
function renderDepartment(parent,id){
 const f=FLOORS.find(x=>x.id===id);
 if(!f||!hasAccess(id)){activeFloor=null;render();return;}
 const hero=el('section','ke-dept-hero',undefined,parent);
 eyebrow(hero,'PLANTA '+f.n+' · '+f.tag.toUpperCase());
 el('h1','',f.name,hero);el('p','',f.desc,hero);
 const m=metrics();
 const cards=el('div','ke-metrics',undefined,parent);
 if(id==='comercial'){
  stat(cards,'Sectores visibles',m.zones);stat(cards,'Por finalizar',m.open);stat(cards,'Fichas',m.clients);
 }else if(id==='tecnicos'){
  stat(cards,'Obras agendadas',m.booked,'En las fichas cargadas');
  stat(cards,'Fichas vinculadas',m.clients);
 }else if(id==='oficina'){
  stat(cards,'Pendiente volcar',m.dump);stat(cards,'Fichas visibles',m.clients);
 }else if(id==='direccion'){
  stat(cards,'Sectores visibles',m.zones);stat(cards,'Fichas',m.clients);stat(cards,'Volcados pendientes',m.dump);
 }else{
  message(parent,'Datos económicos por conectar','Los importes, pagos y comisiones requieren datos de facturación y permisos específicos. No mostramos cifras inventadas.','ke-neutral');
 }
 sectionHeading(parent,'Herramientas conectadas','Accesos a las funciones que ya existen en KONSOR.');
 const links=el('div','ke-actions',undefined,parent);
 if(id==='comercial'){
  action(links,'Mi jornada','Trabajo en calle y actividad diaria','day');
  action(links,'Mapa y territorio','GPS, sectores y Catastro','map');
  action(links,'Fichas de clientes','Captación y seguimiento','clients');
  action(links,'Resultados','Progreso y estadísticas','results');
 }else if(id==='tecnicos'){
  action(links,'Consultar fichas y obras','Datos y seguimiento disponibles','clients');
  message(parent,'Módulo técnico en preparación','Faltan las órdenes de trabajo para técnicos, materiales, rutas, fotografías y cierre de intervención. No se crean tareas ficticias.','ke-neutral');
 }else if(id==='oficina'){
  action(links,'Abrir Oficina','Volcado, llamadas y citas','office');
  action(links,'Fichas de clientes','Revisión y seguimiento','clients');
  action(links,'Asistente de fotos Gemini','Abre el enlace que has compartido','gemini');
  message(parent,'Importación asistida','El enlace de Gemini no guarda automáticamente los datos en Firebase: hay que revisar e importar los resultados.','ke-neutral');
 }else if(id==='administracion'){
  action(links,'Consultar resultados','Indicadores disponibles en KONSOR','results');
  message(parent,'Administración por integrar','Se necesitan registros propios de ingresos, gastos, pagos, facturas y comisiones. Esta pantalla no sustituye una contabilidad.','ke-neutral');
 }else if(id==='direccion'){
  if(getIdentity().ceo)action(links,'Panel de dirección','Supervisión, territorio y equipos','director');
  else action(links,'Planificación del equipo','Acceso según permisos actuales','planning');
  action(links,'Resultados del equipo','Análisis y rendimiento','teamResults');
  action(links,'Avisos','Actividad y comunicaciones','notifications');
  if(getIdentity().ceo){
   message(parent,'Permisos CEO pendientes','Actualmente el acceso de CEO es una presentación para la cuenta de jefe principal. Falta crear un rol CEO validado en Firebase antes de incorporar datos sensibles.','ke-neutral');
  }
 }
 const foot=el('div','ke-dept-footer',undefined,parent);
 addButton(foot,'‹ Volver a las plantas',goBack,'ke-return');
}
function render(){
 const r=root(),body=r.querySelector('.ke-body');
 if(!body)return;
 const title=r.querySelector('.ke-page-title');
 if(title)title.textContent=activeFloor?FLOORS.find(f=>f.id===activeFloor)?.name||'Edificio KONSOR':'Edificio KONSOR';
 const back=r.querySelector('.ke-back');
 if(back)back.setAttribute('aria-label',activeFloor?'Volver a las plantas':'Cerrar edificio');
 body.replaceChildren();
 if(!loggedIn()){close();return;}
 if(activeFloor)renderDepartment(body,activeFloor);else renderLobby(body);
 body.scrollTop=0;
}
document.addEventListener('keydown',function(e){
 const r=document.getElementById(ROOT_ID);
 if(!r||r.hidden)return;
 if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}
 else if(e.altKey&&e.key==='ArrowLeft'){e.preventDefault();e.stopImmediatePropagation();goBack();}
},true);
window.abrirEdificioKonsor=open;
window.KonsorEdificio={
 version:'1.0.0',
 open,close,
 state:()=>({floor:activeFloor,role:getIdentity().role}),
 // Solo indicadores de la sesión. Autorización real: reglas de Firebase.
 metrics:()=>loggedIn()?metrics():null
};
})();