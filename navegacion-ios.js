/* KONSOR: navegación uniforme de una sola pantalla y gesto iOS. */
(function(){
"use strict";
if(window.__konsorNavigationFinal)return;window.__konsorNavigationFinal=true;
const selector=".modal-overlay.active,.cnx-modal.active,.koc-overlay.active,.kd-overlay.active,.cn-territorio.active,.cn-oficina.active,#konsor-csv-wizard";
const headers=".modal-header,.cn-page-head,.cn-office-header,.cnx-head,.koc-header,.kd-head";
let trail=[],topSeen=null,scheduled=false,gesture=null,locked=false;
const visible=e=>!!e&&e.isConnected&&getComputedStyle(e).display!=="none"&&getComputedStyle(e).visibility!=="hidden"&&e.getClientRects().length>0;
function current(){
 const all=[...document.querySelectorAll(selector)].filter(visible);
 return all.sort((a,b)=>(parseInt(getComputedStyle(a).zIndex,10)||0)-(parseInt(getComputedStyle(b).zIndex,10)||0)||((a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING)?-1:1)).at(-1)||null;
}
function originalBack(el){
 if(el.classList.contains("kd-overlay"))return el.querySelector(".kd-head>.kd-back");
 const buttons=[...el.querySelectorAll("button")].filter(b=>!b.closest(".cn-global-nav")&&visible(b));
 const patterns={cnTerritorio:/volver a pueblos/i,cnOficina:/volver a oficina/i,konsorOfficeCallV2:/volver a/i};
 if(patterns[el.id]){const b=buttons.find(x=>patterns[el.id].test(x.textContent||""));if(b)return b;}
 return buttons.find(b=>/^(?:‹\s*)?volver(?:\s+a|\s+al)?\b/i.test((b.textContent||"").trim()));
}
function close(el){
 if(!el)return;
 if(el.classList.contains("kd-overlay")){
  const b=el.querySelector(".kd-head>.kd-close");if(b){b.click();return;}
 }
 if(el.id==="idenaViewerModal"&&typeof window.closeIdenaModal==="function"){window.closeIdenaModal();return;}
 const old=el.querySelector('.modal-header button[onclick*="closeModal"]');
 if(old){old.click();return;}
 if(el.id==="konsor-csv-wizard"){el.remove();return;}
 el.classList.remove("active");
}
function back(){
 if(locked)return;const el=current();if(!el)return;locked=true;
 try{
  // Primero retrocede dentro de la pantalla actual: pueblo -> pueblos,
  // cliente -> llamadas, horario -> ficha, Oficina -> paso anterior.
  const inside=originalBack(el);
  if(inside&&!inside.disabled){inside.click();return;}
  // Cuando estamos en la raíz de una sección, volvemos a su propietario
  // inmediato; nunca saltamos directamente a Inicio desde una subpantalla.
  if(el.id==="cnTerritorio"){
   close(el);window.openKonsorDirection?.();return;
  }
  if(el.id==="konsorOfficeCallV2"){
   close(el);window.openCnOffice?.();return;
  }
  if(el.id==="cnOficina"){
   close(el);window.cnvShowHome?.();return;
  }
  const i=trail.lastIndexOf(el),parent=i>0?trail[i-1]:null;
  if(parent&&parent.isConnected){
   close(el);
   if(!visible(parent))parent.classList.add("active");
   trail=trail.slice(0,i);
   return;
  }
  // Sin pantalla anterior conocida no se cierra ni se navega a Inicio.
  // La X sigue siendo la acción explícita de cerrar.
 }finally{locked=false;queueMicrotask(scan);}
}
function closeTop(){if(locked)return;const el=current();if(!el)return;locked=true;try{close(el);}finally{locked=false;queueMicrotask(scan);}}
window.konsorGoBack=back;window.konsorCloseTop=closeTop;
function mount(el){
 if(el.classList.contains("kd-overlay")||el.querySelector(".cn-global-nav"))return;
 const header=el.querySelector(headers);if(!header)return;
 header.classList.add("cn-consistent-header");
 const row=document.createElement("div");row.className="cn-global-nav";
 const make=(label,aria,fn,cls)=>{const b=document.createElement("button");b.type="button";b.className=cls;b.textContent=label;b.setAttribute("aria-label",aria);b.onclick=e=>{e.preventDefault();e.stopPropagation();fn();};return b;};
 row.append(make("‹","Volver una pantalla",back,"cn-global-back"),make("×","Cerrar",closeTop,"cn-global-close"));header.append(row);
 // Una sola X de cierre: ocultar el botón viejo aunque use addEventListener.
 [...header.querySelectorAll("button")].filter(b=>!b.closest(".cn-global-nav")).forEach(b=>{
  const label=(b.getAttribute("aria-label")||b.textContent||"").trim();
  if(/^(cerrar(?: sección| ventana| dirección)?|x|×|✕)$/i.test(label)||
     b.matches('button[onclick*="closeModal"]'))b.classList.add("cn-original-close-hidden");
 });
}
function scan(){
 scheduled=false;const all=[...document.querySelectorAll(selector)].filter(visible);
 all.forEach(mount);
 const top=current();
 if(!top){trail=[];topSeen=null;return;}
 if(top!==topSeen){
  const i=trail.indexOf(top);if(i>=0)trail=trail.slice(0,i+1);else trail.push(top);
  topSeen=top;
 }
}
function schedule(){if(!scheduled){scheduled=true;queueMicrotask(scan);}}
function init(){
 if(!document.getElementById("konsor-unified-nav-style")){
  const st=document.createElement("style");st.id="konsor-unified-nav-style";
  st.textContent=".cn-consistent-header{position:relative!important;padding-left:57px!important;padding-right:57px!important;min-height:59px}.cn-global-nav{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:space-between;padding:0 10px;pointer-events:none}.cn-global-nav button{pointer-events:auto;display:flex;align-items:center;justify-content:center;flex:none;width:38px;height:38px;min-height:38px;padding:0;border:1px solid #e1e7ef;border-radius:50%;background:#eef2f7;color:#314660;font:400 26px/1 -apple-system,BlinkMacSystemFont,system-ui;box-shadow:none}.cn-global-nav button:active{background:#e1e9f2}.cn-consistent-header .cn-original-close-hidden{display:none!important}";
  document.head.append(st);
 }
 scan();new MutationObserver(schedule).observe(document.body,{subtree:true,attributes:true,attributeFilter:["class","style"],childList:true});
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&current()){e.preventDefault();closeTop();}else if(e.altKey&&e.key==="ArrowLeft"&&current()){e.preventDefault();back();}});
 document.addEventListener("touchstart",e=>{
  if(e.touches.length!==1||!current())return;const t=e.touches[0];if(t.clientX>35)return;
  if(e.target.closest("#map,.leaflet-container,input,textarea,select,[role=slider],.cnv-map-toolbar"))return;
  gesture={x:t.clientX,y:t.clientY};
 },{passive:true});
 document.addEventListener("touchmove",e=>{
  if(!gesture||e.touches.length!==1)return;const t=e.touches[0],dx=t.clientX-gesture.x,dy=t.clientY-gesture.y;
  if(dx>20&&dx>Math.abs(dy)*1.4&&e.cancelable)e.preventDefault();
 },{passive:false});
 document.addEventListener("touchend",e=>{
  if(!gesture)return;const g=gesture;gesture=null;const t=e.changedTouches[0];if(!t)return;
  const dx=t.clientX-g.x,dy=t.clientY-g.y;
  if(dx>75&&Math.abs(dy)<65&&dx>Math.abs(dy)*1.5){
   e.preventDefault();
   // El gesto pulsa el MISMO botón de volver que ve el usuario.
   const top=current();
   const arrow=top?.querySelector(".cn-global-nav .cn-global-back")||
     top?.querySelector(".kd-head > .kd-back");
   if(arrow&&!arrow.disabled)arrow.click();
   else back();
  }
 },{passive:false});
 document.addEventListener("touchcancel",()=>gesture=null,{passive:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();