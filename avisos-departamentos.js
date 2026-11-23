/* KONSOR · Avisos operativos por departamento a partir de datos reales.
 * No suplanta el motor push ni cambia estados sin permisos de servidor.
 * Avisos derivados, sin datos ficticios ni notificaciones automáticas inventadas.
 */
(function(w){
"use strict";
const text=v=>String(v??"").trim();
const nowDay=()=>new Date().toLocaleDateString("sv-SE");
const dayPlus=(delta)=>{const d=new Date();d.setDate(d.getDate()+delta);return d.toLocaleDateString("sv-SE");};
const scheduled=c=>["agendada","agendada_historica"].includes(c?.obraStatus)&&/^\d{4}-\d{2}-\d{2}$/.test(String(c.obraDate||""));
function notices(zones,role,today=nowDay()){
 const items=[],seen=new Set();
 const tomorrow=new Date(today+"T12:00:00");tomorrow.setDate(tomorrow.getDate()+1);
 const next=tomorrow.toISOString().slice(0,10);
 const push=(key,label,detail,kind,client,zone)=>{
  if(seen.has(key))return;seen.add(key);
  items.push({key,label,detail,kind,clientUid:client?.clientUid||"",zoneId:String(zone?.id||"")});
 };
 for(const z of Array.isArray(zones)?zones:[]){
  if(!z||z.isHotMission||z.isNoAptoZone||String(z.comercial||"").startsWith("Mikel"))continue;
  for(const c of Array.isArray(z.clients)?z.clients:[]){
   if(!c||!(c.name||c.street||c.phone))continue;
   const base=text(c.clientUid)||String(z.id)+"|"+text(c.street),where=text(c.street)+" · "+text(z.town||c.locality);
   if(role==="oficina"||role==="ceo"){
    if(scheduled(c)&&!c.expedienteCerradoAt){
     if(!c.documentosVerificadosAt&&!c.documentosCompletosAt)
      push(base+":docs","Documentación pendiente",where+" · Obra "+c.obraDate+" "+text(c.obraTime),"task",c,z);
     if(c.obraDate===next||c.obraDate===today)
      push(base+":soon","Obra próxima",where+" · "+c.obraDate+" "+text(c.obraTime),"warning",c,z);
     if(!c.dni||!c.email)push(base+":identity","Datos del expediente incompletos",where+" · Revisar DNI y correo","task",c,z);
    }
    if(c.obraStatus==="realizada"&&!c.expedienteCerradoAt)
      push(base+":closing","Expediente pendiente de cierre",where,"task",c,z);
    if(["aplazada","no_realizada"].includes(c.obraStatus))
      push(base+":incident","Incidencia de instalación",where+" · Revisar reprogramación","warning",c,z);
   }
   if(role==="tecnicos"||role==="ceo"){
    if(scheduled(c)&&(c.obraDate===today||c.obraDate===next))
      push(base+":visit","Intervención próxima",where+" · "+c.obraDate+" "+text(c.obraTime)+" · Equipo "+(c.obraEquipoInstalacion||"pendiente"),"task",c,z);
    if(scheduled(c)&&!c.obraEquipoInstalacion)
      push(base+":team","Obra sin equipo asignado",where,"warning",c,z);
   }
  }
 }
 return items.slice(0,120);
}
function open(role){
 const existing=document.getElementById("konsorDepartmentNotices");existing?.remove();
 const overlay=document.createElement("div");overlay.className="kdn-overlay";overlay.id="konsorDepartmentNotices";
 const page=document.createElement("section");page.className="kdn-page";overlay.append(page);
 const add=(tag,cls,body,parent)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(body!==undefined)el.textContent=body;parent.append(el);return el;};
 const header=add("header","kdn-header",undefined,page);
 const copy=add("div","",undefined,header);add("small","","KONSOR · "+role.toUpperCase(),copy);
 add("h2","","Avisos y tareas",copy);
 const close=add("button","cnv-glass","Cerrar",header);close.type="button";close.onclick=()=>overlay.remove();
 const body=add("main","kdn-body",undefined,page);
 const connected=w.KonsorBridge?.state?.().connected&&Array.isArray(typeof savedZones==="undefined"?null:savedZones);
 if(!connected){add("p","kdp-empty","No se han podido consultar las fichas de Firebase. Reintenta al recuperar la conexión.",body);}
 else{
  const items=notices(savedZones,role);
  add("p","kdp-explainer","Alertas calculadas con las fichas sincronizadas. No equivalen a notificaciones push ni a tareas asignadas por servidor.",body);
  const counter=add("div","cnv-group-label",undefined,body);
  add("strong","","PENDIENTES DETECTADOS",counter);add("span","",String(items.length),counter);
  if(!items.length)add("p","kdp-empty","Sin incidencias detectadas en las fichas visibles.",body);
  for(const item of items){
   const card=add("article","kdp-record",undefined,body);
   add("strong","",item.label,card);add("small","",item.detail,card);
   if(role==="oficina"&&item.clientUid){
    const btn=add("button","cnv-glass kdn-action","Abrir ficha",card);
    btn.type="button";btn.onclick=()=>{
     if(w.konsorOpenExistingClientInOffice?.(item.zoneId,item.clientUid)){
      const agenda=document.getElementById("konsorOfficeCallV2");if(agenda)agenda.style.zIndex="20130";
      overlay.remove();
     }
    };
   }
  }
  if(role==="oficina"&&typeof w.konsorScheduleCallReminder==="function"){
   const remind=add("button","kdn-primary","Crear recordatorio personal",body);remind.type="button";
   remind.onclick=async()=>{
    const title=w.prompt?.("Título del recordatorio");
    if(!title?.trim())return;
    const when=w.prompt?.("Fecha y hora (AAAA-MM-DD HH:MM)");
    if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(when||"")){w.alert?.("Indica una fecha y hora válidas.");return;}
    const dueAt=new Date(when.replace(" ","T")).getTime();
    if(!Number.isFinite(dueAt)||dueAt<=Date.now()){w.alert?.("El recordatorio debe ser futuro.");return;}
    remind.disabled=true;
    try{await w.konsorScheduleCallReminder({title,body:"Recordatorio creado desde Oficina",dueAt});w.alert?.("Recordatorio guardado en el centro de avisos de la sesión.");}
    catch(e){w.alert?.(e.message||"No se pudo guardar el recordatorio.");}
    finally{remind.disabled=false;}
   };
  }
 }
 document.body.append(overlay);
 overlay.addEventListener("click",ev=>{if(ev.target===overlay)overlay.remove();});
}
w.KonsorDepartmentNotices=Object.freeze({notices,open,scheduled});
})(window);
