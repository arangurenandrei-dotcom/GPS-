/* KONSOR — navegación única: flecha y gesto retroceden un nivel; X cierra.
   No reescribe pantallas, no usa history.back() y respeta los guardados.
   La geometría se define solo en navegacion-ios.css. */
(function(){
'use strict';
if(window.__konsorNavigationFinal)return;
window.__konsorNavigationFinal=true;

const surfaces='.modal-overlay.active,.cnx-modal.active,.koc-overlay.active,.kr-overlay.active,.kd-overlay.active,.km-overlay,.cn-territorio.active,.cn-oficina.active,#konsor-csv-wizard';
const headers='.modal-header,.cn-page-head,.cn-office-header,.cnx-head,.koc-header,.kr-head,.cn-call-head,.cnv-help-head,.kd-head,.km-head';
const headerClose=/^(cerrar(?:\s+(?:sección|ventana|dirección|asistente|guía))?|salir|x|×|✕|ahora no)$/i;
const headerBack=/^(‹|←|volver(?:\s+(?:a|al)\b.*)?)$/i;
let trail=[],topSeen=null,scheduled=false,gesture=null,locked=false;
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const isVisible=e=>!!e&&e.isConnected&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden'&&e.getClientRects().length>0;

function current(){
 const all=[...document.querySelectorAll(surfaces)].filter(isVisible);
 return all.sort((a,b)=>(parseInt(getComputedStyle(a).zIndex,10)||0)-(parseInt(getComputedStyle(b).zIndex,10)||0)||
  ((a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING)?-1:1)).at(-1)||null;
}
function rootHeader(e){return e?.querySelector(headers)||null;}
function buttonLabel(b){return clean(b.getAttribute?.('aria-label')||b.textContent);}
function ownBack(e){
 if(!e)return null;
 // Solo acciones de retroceso internas; la cabecera raíz no cuenta como paso.
 const within=[...e.querySelectorAll('button[data-konsor-back],button')]
   .filter(b=>isVisible(b)&&!b.closest('.cn-global-nav,.cn-consistent-header'));
 return within.find(b=>b.hasAttribute?.('data-konsor-back'))||
   within.find(b=>/^(?:‹\s*|←\s*)?volver(?:\s+.*)?$/i.test(clean(b.textContent))||
      /^(volver(?:\s+a.*)?|paso anterior)$/i.test(buttonLabel(b)))||null;
}
function nativeButton(e,kind){
 if(!e)return null;
 const header=rootHeader(e);
 if(!header)return e.querySelector(kind==='close'?'.cn-original-close-hidden':'.cn-nav-native-back');
 return header.querySelector(kind==='close'?'.cn-nav-native-close,.cn-original-close-hidden':'.cn-nav-native-back');
}
function close(e){
 if(!e)return;
 if(e.id==='idenaViewerModal'&&typeof window.closeIdenaModal==='function'){window.closeIdenaModal();return;}
 const native=nativeButton(e,'close')||
   e.querySelector('.modal-header button[onclick*="closeModal"],.cn-original-close-hidden');
 if(native){native.click();return;}
 if(e.id==='konsor-csv-wizard'||e.classList.contains('km-overlay')){e.remove();return;}
 e.classList.remove('active');
}
function scan(){
 scheduled=false;
 const all=[...document.querySelectorAll(surfaces)].filter(isVisible);
 all.forEach(mount);
 const top=current();
 if(!top){trail=[];topSeen=null;return;}
 if(top!==topSeen){
  trail=trail.filter(item=>item.isConnected);
  const i=trail.indexOf(top);
  if(i>=0)trail=trail.slice(0,i+1);
  else trail.push(top);
  topSeen=top;
 }
}
function schedule(){if(!scheduled){scheduled=true;queueMicrotask(scan);}}
function back(){
 if(locked)return;
 const el=current();if(!el)return;
 locked=true;
 try{
  const inside=ownBack(el);
  if(inside){if(!inside.disabled)inside.click();return;}
  // Si una subpantalla reemplazó a su propietaria, recuperar esa pantalla.
  const index=trail.lastIndexOf(el);
  const parent=trail.slice(0,Math.max(index,0)).reverse().find(candidate=>candidate.isConnected);
  if(parent){
   close(el);
   if(!isVisible(parent))parent.classList.add('active');
   trail=trail.slice(0,trail.indexOf(parent)+1);
   return;
  }
  // El módulo de Dirección tiene retorno propio a su planta.
  if(el.classList.contains('kd-overlay')){
   const native=nativeButton(el,'back');if(native&&!native.disabled){native.click();return;}
  }
  // Volver desde la lista de llamadas a Oficina, no saltar a Inicio.
  if(el.id==='konsorOfficeCallV2'){
   close(el);window.openCnOffice?.();return;
  }
  // Territorio vuelve al panel de Dirección cuando es su propietario.
  if(el.id==='cnTerritorio'){
   close(el);window.openKonsorDirection?.();return;
  }
  // No hay subnivel: cerrar la sección actual y mostrar la vista de origen.
  close(el);
  if(el.id==='cnOficina'||el.id==='konsorResultsV3')window.cnvShowHome?.();
 }finally{locked=false;queueMicrotask(scan);}
}
function closeTop(){
 if(locked)return;
 const el=current();if(!el)return;
 locked=true;
 try{close(el);}
 finally{locked=false;queueMicrotask(scan);}
}
window.konsorGoBack=back;
window.konsorCloseTop=closeTop;
function mount(el){
 const head=rootHeader(el);
 if(!head||head.classList.contains('cn-consistent-header'))return;
 head.classList.add('cn-consistent-header');
 // Conservar los controles originales fuera del flujo visual: siguen haciendo
 // cierre y limpieza de datos desde sus propios callbacks.
 const originalButtons=[...head.children].filter(x=>x.tagName==='BUTTON');
 for(const b of originalButtons){
  const label=buttonLabel(b);
  const backLike=b.classList.contains('kd-back')||b.classList.contains('km-back')||
    (headerBack.test(label)&&!headerClose.test(label));
  const closeLike=b.classList.contains('kd-close')||
    (b.classList.contains('close')&&b.closest('.km-head'))||
    headerClose.test(label)||b.matches('button[onclick*="closeModal"],button[onclick*="closeIdenaModal"]');
  if(backLike){b.classList.add('cn-nav-native-back');b.setAttribute('aria-hidden','true');b.tabIndex=-1;}
  if(closeLike){b.classList.add('cn-nav-native-close','cn-original-close-hidden');b.setAttribute('aria-hidden','true');b.tabIndex=-1;}
 }
 const title=document.createElement('div');title.className='cn-nav-title';
 for(const node of [...head.childNodes]){
  if(node.nodeType===1&&(node.classList.contains('cn-nav-native-back')||
    node.classList.contains('cn-nav-native-close')||
    node.classList.contains('cn-global-nav')))continue;
  title.append(node);
 }
 head.append(title);
 const nav=document.createElement('div');nav.className='cn-global-nav';
 function control(symbol,aria,fn,cls){
  const b=document.createElement('button');b.type='button';b.className=cls;
  b.textContent=symbol;b.setAttribute('aria-label',aria);
  b.onclick=e=>{e.preventDefault();e.stopPropagation();fn();};
  return b;
 }
 nav.append(control('‹','Volver un paso',back,'cn-global-back'));
 nav.append(control('×','Cerrar esta pantalla',closeTop,'cn-global-close'));
 head.append(nav);
}
function init(){
 scan();
 new MutationObserver(schedule).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','style'],childList:true});
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&current()){e.preventDefault();closeTop();}
  else if(e.altKey&&e.key==='ArrowLeft'&&current()){e.preventDefault();back();}
 });
 document.addEventListener('touchstart',e=>{
  gesture=null;
  const surface=current();
  if(!surface||e.touches.length!==1)return;
  const t=e.touches[0];
  if(t.clientX>44)return;
  if(e.target.closest('#map,.leaflet-container,input,textarea,select,[role=slider],.cnv-map-toolbar,[data-no-swipe],.swiper,.scroll-horizontal'))return;
  gesture={x:t.clientX,y:t.clientY,surface};
 },{passive:true});
 document.addEventListener('touchmove',e=>{
  if(!gesture)return;
  if(e.touches.length!==1||current()!==gesture.surface){gesture=null;return;}
  const t=e.touches[0],dx=t.clientX-gesture.x,dy=t.clientY-gesture.y;
  if(dx>22&&dx>Math.abs(dy)*1.45&&e.cancelable)e.preventDefault();
 },{passive:false});
 document.addEventListener('touchend',e=>{
  if(!gesture)return;
  const g=gesture;gesture=null;
  const t=e.changedTouches[0];if(!t||current()!==g.surface)return;
  const dx=t.clientX-g.x,dy=t.clientY-g.y;
  if(dx>72&&Math.abs(dy)<65&&dx>Math.abs(dy)*1.5){
   if(e.cancelable)e.preventDefault();
   // El gesto activa el mismo control de Volver que muestra la cabecera.
   const arrow=current()?.querySelector('.cn-global-nav .cn-global-back');
   if(arrow&&!arrow.disabled)arrow.click();
   else back();
  }
 },{passive:false});
 document.addEventListener('touchcancel',()=>gesture=null,{passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();