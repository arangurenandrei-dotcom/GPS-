/* Cola de llamadas guiadas, alimentada por las fichas sincronizadas. */
(function(){
"use strict";
let cursor=0;
const el=(tag,cls,txt,parent)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);if(parent)parent.append(n);return n;};
const btn=(txt,fn,cls)=>{const b=el("button","cn-call-button "+(cls||""),txt);b.type="button";b.onclick=fn;return b;};
function queue(){
 if(!Array.isArray(savedZones))return [];
 const rows=[],mine=typeof currentUserName!=="undefined"?currentUserName:"";
 const team=typeof isMikelTeamMember==="function"&&isMikelTeamMember(mine);
 savedZones.forEach((z,zi)=>{
  if(!z||z.isNoAptoZone||z.isHotMission||z.comercial!==mine||typeof isMikelTeamMember!=="function"||isMikelTeamMember(z.comercial)!==team)return;
  (z.clients||[]).forEach((c,ci)=>{
   if(!c||c.obraStatus==="no_apto"||["agendada","realizada"].includes(c.obraStatus))return;
   if(c.callStatus&&c.callStatus!=="pendiente")return;
   if(!(c.name||c.phone||c.street))return;
   rows.push({z,zi,c,ci,date:z.dumpDate||z.date||""});
  });
 });
 return rows.sort((a,b)=>a.date.localeCompare(b.date)||a.zi-b.zi||a.ci-b.ci);
}
function root(){
 let overlay=document.getElementById("cnCallQueue");
 if(overlay)return overlay;
 overlay=el("div","modal-overlay cn-call-overlay",undefined,document.body);
 overlay.id="cnCallQueue";overlay.style.zIndex="10139";
 const page=el("div","cn-call-page",undefined,overlay);
 const header=el("header","cn-call-head",undefined,page);
 const left=el("div","",undefined,header);
 el("span","cn-call-kicker","OFICINA · SEGUIMIENTO",left);
 el("h2","","Llamadas guiadas",left);
 header.append(btn("Cerrar",()=>overlay.classList.remove("active"),"outline"));
 el("div","cn-call-body",undefined,page);
 overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.classList.remove("active");});
 return overlay;
}
async function setResult(item,status){
 const fn=typeof updateClientCallStatus==="function"?updateClientCallStatus:null;
 if(!fn)return alert("No está disponible el seguimiento de llamadas.");
 const latest=savedZones[item.zi];
 if(!latest||latest.id!==item.z.id||latest.clients?.[item.ci]?.clientUid!==item.c.clientUid){
  alert("Esta ficha ha cambiado mientras trabajabas. Actualizamos la cola antes de continuar.");
  cursor=0;render();return;
 }
 const result=await fn(item.zi,item.ci,status);
 if(result===true){cursor=0;render();}
}
function render(){
 const overlay=root(),body=overlay.querySelector(".cn-call-body");body.replaceChildren();
 const items=queue();
 if(cursor>=items.length)cursor=0;
 const top=el("div","cn-call-progress",undefined,body);
 el("strong","",items.length?"Contacto "+(cursor+1)+" de "+items.length:"Sin llamadas pendientes",top);
 el("span","","Organizados por el sector más antiguo",top);
 if(!items.length){
  const empty=el("section","cn-call-card",undefined,body);
  el("h3","","Todo revisado",empty);
  el("p","","No quedan contactos con estado «pendiente» en tus fichas. Las citas y recordatorios siguen disponibles en Seguimiento.",empty);
  empty.append(btn("Abrir seguimiento",()=>{overlay.classList.remove("active");openFollowUpsModal();},"primary"));
  return;
 }
 const item=items[cursor],z=item.z,c=item.c;
 const card=el("section","cn-call-card",undefined,body);
 el("span","cn-call-kicker",(z.town||"Pueblo")+" · "+(z.sectorName||"Sector"),card);
 el("h3","",c.name||"Contacto sin nombre",card);
 el("p","",c.street||"Dirección sin especificar",card);
 el("p","",c.phone?"Teléfono: "+c.phone:"Esta ficha no tiene teléfono.",card);
 if(c.phone){
  const tel=el("a","cn-call-dial","Llamar al cliente",card);
  tel.href="tel:"+String(c.phone).replace(/[^\d+]/g,"");
 }
 const buttons=el("div","cn-call-choices",undefined,card);
 buttons.append(btn("Ya llamado",()=>setResult(item,"ya_llamado"),"primary"));
 buttons.append(btn("Falta por agendar / seguimiento",()=>setResult(item,"esperando_confirmacion"),"outline"));
 buttons.append(btn("Organizar cita",()=>{overlay.classList.remove("active");openGroupedAppointments();},"outline"));
 const nav=el("div","cn-call-nav",undefined,body);
 nav.append(btn("Anterior",()=>{cursor=Math.max(0,cursor-1);render();},"subtle"));
 nav.append(btn("Saltar sin cambios",()=>{cursor=(cursor+1)%items.length;render();},"subtle"));
 const note=el("section","cn-call-note",undefined,body);
 el("p","","Marcar una llamada guarda su estado mediante el sistema original. Saltar no modifica la ficha. Las esperas siguen generando el seguimiento correspondiente.",note);
}
window.openCnCallQueue=function(){cursor=0;const modal=root();render();modal.classList.add("active");};
})();