/* KONSOR · navegación de retorno y cierre para modales heredados y modernos.
   No elimina motores de negocio ni altera datos. */
(function(){
"use strict";
if(window.__konsorNavigationFinal)return;
window.__konsorNavigationFinal=true;
const eligible='.modal-overlay.active,.cnx-modal.active,.koc-overlay.active';
const hidden=el=>getComputedStyle(el).display==='none';
function closeSurface(overlay){
 if(overlay.id==='idenaViewerModal'&&typeof window.closeIdenaModal==='function'){
  window.closeIdenaModal();return;
 }
 if(overlay.id==='konsorOfficeCallV2'){
  overlay.classList.remove('active');return;
 }
 const old=overlay.querySelector('.modal-header button[onclick*="closeModal"]');
 if(old){old.click();return;}
 overlay.classList.remove('active');
}
function backSurface(overlay){
 if(overlay.id==='cnTerritorio'){
  const back=[...overlay.querySelectorAll('.cn-page-body button')].find(b=>/volver a pueblos/i.test(b.textContent));
  if(back){back.click();return;}
  closeSurface(overlay);
  window.openKonsorDirection?.();return;
 }
 if(overlay.id==='cnOficina'){
  const back=[...overlay.querySelectorAll('.cn-office-body button')].find(b=>/volver a oficina/i.test(b.textContent));
  if(back){back.click();return;}
  closeSurface(overlay);window.cnvShowHome?.();return;
 }
 if(overlay.id==='konsorOfficeCallV2'){
  const back=[...overlay.querySelectorAll('.koc-body button')].find(b=>/volver a/i.test(b.textContent));
  if(back){back.click();return;}
  closeSurface(overlay);window.openCnOffice?.();return;
 }
 const inner=[...overlay.querySelectorAll('button')].find(b=>
  !b.classList.contains('cn-global-back')&&!b.classList.contains('cn-global-close')&&
  /^(?:‹\s*)?volver(?:\s+a|\s+al)?\b/i.test((b.textContent||'').trim()));
 if(inner){inner.click();return;}
 closeSurface(overlay);
 // Volver desde una ventana sin subpáginas a la app principal.
 if(!document.querySelector(eligible))window.cnvShowHome?.();
}
function mount(overlay){
 if(!overlay||overlay.classList.contains('kd-overlay'))return;
 if(overlay.querySelector('.cn-global-nav'))return;
 const header=overlay.querySelector('.modal-header,.cn-page-head,.cn-office-header,.cnx-head,.koc-header');
 if(!header)return;
 const row=document.createElement('div');row.className='cn-global-nav';
 const back=document.createElement('button');back.type='button';back.className='cn-global-back';
 back.textContent='‹';back.setAttribute('aria-label','Volver');
 back.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();backSurface(overlay);});
 const close=document.createElement('button');close.type='button';close.className='cn-global-close';
 close.textContent='×';close.setAttribute('aria-label','Cerrar sección');
 close.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();closeSurface(overlay);});
 row.append(back,close);
 header.append(row);
}
let scheduled=false;
function scan(){
 scheduled=false;
 document.querySelectorAll(eligible).forEach(el=>{if(!hidden(el))mount(el);});
}
function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(scan);}
function init(){
 scan();
 const observer=new MutationObserver(schedule);
 observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class'],childList:true});
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  const overlays=[...document.querySelectorAll(eligible)].filter(el=>!hidden(el));
  const overlay=overlays[overlays.length-1];if(!overlay)return;
  event.preventDefault();closeSurface(overlay);
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();