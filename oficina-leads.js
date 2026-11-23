/* KONSOR · Alta directa de leads de Oficina, sobre las fichas V2 existentes.
 * Sin sector comercial, mapa ni captación ficticia. Se conserva una zona técnica
 * individual únicamente porque guardarTrabajoV2 exige zona para cada ficha.
 */
(function(w){
"use strict";
const E=(tag,cls,value,parent)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=String(value);parent?.append(el);return el;};
const text=v=>String(v??"").trim();
const norm=v=>text(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ");
const phone=v=>text(v).replace(/\D/g,"").replace(/^34(?=\d{9}$)/,"");
const date=()=>new Date().toLocaleDateString("sv-SE");
const permitted=()=>!!(w.konsorDesigner?.permitted?.()&&w.KonsorBridge?.state?.().connected&&typeof savedZones!=="undefined"&&Array.isArray(savedZones));
function duplicate(zones,lead){
 return zones.some(z=>(z.clients||[]).some(c=>norm(c.street)===norm(lead.street)&&norm(z.town||c.locality)===norm(lead.locality)&&phone(c.phone)===phone(lead.phone)));
}
function validate(data){
 const errors=[];
 if(!data.name)errors.push("Nombre y apellidos");
 if(!/^[6789]\d{8}$/.test(phone(data.phone)))errors.push("Teléfono español válido");
 if(!data.street)errors.push("Calle y número");
 if(!data.locality)errors.push("Municipio de la dirección");
 return errors;
}
function candidate(zones,data,owner,now,id,uid){
 const c={clientUid:uid,name:data.name,phone:phone(data.phone),street:data.street,locality:data.locality,
  email:data.email,observaciones:data.notes,origen:"oficina",officeLead:true,
  callStatus:"pendiente",obraStatus:"a_poner",captacionRespuesta:"",
  createdAt:now,updatedAt:now,statusChangedAt:now};
 const z={id,comercial:owner,town:data.locality,date:date(),dumpDate:date(),
  isSingleHouse:true,isOfficeLead:true,singlePoint:null,points:[],status:"completada",
  sectorName:"Ficha Oficina · "+data.street,stats:{si:0,no:0,ausente:0,papelito:0},
  clients:[c],_updatedAt:now};
 return [...zones,z];
}
async function create(data){
 if(!permitted())throw Error("Inicia sesión y recupera la conexión con Firebase.");
 const problems=validate(data);
 if(problems.length)throw Error("Completa: "+problems.join(", ")+".");
 const bridge=w.KonsorBridge,st=bridge.state();
 if(st.pending||st.failed||bridge.busy)throw Error("Hay otro guardado pendiente. Comprueba la sincronización.");
 const zones=savedZones;
 if(duplicate(zones,data))throw Error("Ya existe una ficha con ese teléfono y esa dirección. Búscala antes de crear otra.");
 const owner=typeof currentUserName==="string"?currentUserName:"";
 if(!owner)throw Error("No se ha identificado el responsable de la ficha.");
 const now=Date.now(),uid="f_"+crypto.randomUUID();
 let id=now;while(zones.some(z=>String(z.id)===String(id)))id++;
 const updated=candidate(zones,data,owner,now,id,uid);
 // Nunca se cambia savedZones hasta obtener confirmación real del servidor.
 await bridge.save("comercial_custom_zones",updated);
 savedZones=updated;
 try{w.cnvRefreshHome?.();w.refreshCnTerritory?.();}catch(_){}
 return {zoneId:id,clientUid:uid};
}
function open(section,onBack){
 section.replaceChildren();
 const head=E("div","kdp-internal-bar",undefined,section);
 const back=E("button","cnv-glass kdp-return","‹ Volver",head);back.type="button";back.onclick=onBack;
 E("span","cnv-eyebrow","OFICINA · CLIENTES",head);
 E("h1","kdp-internal-title","Nuevo cliente",section);
 E("p","kdp-explainer","Registra un contacto recibido por Oficina. No hace falta crear pueblo, sector ni marcar ninguna captación. Indica el municipio únicamente como parte de la dirección de la obra.",section);
 const form=E("form","kol-form",undefined,section);form.noValidate=true;
 function field(label,kind,placeholder,required=false){
  const wrap=E("label","kol-field",undefined,form);E("span","",label+(required?" *":""),wrap);
  const x=E(kind==="textarea"?"textarea":"input","kol-input",undefined,wrap);
  if(kind!=="textarea")x.type=kind;
  x.placeholder=placeholder;x.required=required;
  return x;
 }
 const name=field("Nombre y apellidos","text","Nombre del titular",true);name.autocomplete="name";
 const tel=field("Teléfono","tel","600 000 000",true);tel.autocomplete="tel";tel.inputMode="tel";
 const street=field("Calle y número","text","Calle Mayor, 12",true);street.autocomplete="street-address";
 const town=field("Municipio de la vivienda","text","Ej. Ayegui",true);town.autocomplete="address-level2";
 const email=field("Correo (opcional)","email","correo@ejemplo.com");
 const notes=field("Observaciones (opcional)","textarea","Cómo llegó el lead, mejor horario para llamar…");
 const feedback=E("p","kol-feedback",undefined,form);feedback.setAttribute("role","status");feedback.setAttribute("aria-live","polite");
 const save=E("button","cnv-home-primary kol-submit","Guardar cliente y gestionar cita",form);save.type="submit";
 form.onsubmit=async ev=>{
  ev.preventDefault();if(save.disabled)return;
  feedback.textContent="";save.disabled=true;
  try{
   const data={name:text(name.value),phone:text(tel.value),street:text(street.value),
    locality:text(town.value),email:text(email.value),notes:text(notes.value)};
   if(data.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))throw Error("Revisa el correo electrónico.");
   const result=await create(data);
   feedback.textContent="Guardado confirmado en Firebase.";
   if(typeof w.konsorOpenExistingClientInOffice!=="function")throw Error("Cliente guardado. Abre «Citas y llamadas» para continuar.");
   const launched=w.konsorOpenExistingClientInOffice(result.zoneId,result.clientUid);
   if(!launched)throw Error("Cliente guardado. Abre «Citas y llamadas» para continuar.");
   const agenda=document.getElementById("konsorOfficeCallV2");if(agenda)agenda.style.zIndex="20090";
  }catch(err){feedback.textContent=err.message||"No se ha confirmado el guardado.";save.disabled=false;}
 };
}
w.KonsorOfficeLeads=Object.freeze({open,create,validate,duplicate,candidate});
})(window);
