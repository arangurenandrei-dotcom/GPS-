/* Comercial Navarra — Dirección territorial iOS.
 * Vistas derivadas de sectores existentes. Sin cambios en datos ni reglas de acceso.
 */
(function(){
"use strict";
let filtro="haciendo", textoBusqueda="", puebloAbierto=null;
const $=(tag,cls,text)=>{
 const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;
};
const btn=(label,fn,kind="")=>{const n=$("button","cn-btn "+kind,label);n.type="button";n.addEventListener("click",fn);return n;};
const norm=t=>String(t||"").trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ");
const nval=n=>Math.max(0,Number(n)||0);
function currentTeam(z){
 try {return typeof isMikelTeamMember==="function"&&isMikelTeamMember(z.comercial)===isMikelTeamMember(currentUserName);}
 catch(e){return false;}
}
function pueblos(){
 const grouped=new Map();
 // Un pueblo existe desde que se dibuja y guarda, aunque todavía no tenga sectores.
 const outlines=typeof perimetrosPueblos!=="undefined"&&Array.isArray(perimetrosPueblos)?perimetrosPueblos:[];
 outlines.forEach(p=>{if(!p?.nombre)return;const k=norm(p.nombre);grouped.set(k,{key:k,nombre:p.nombre,perimetro:p,sectores:[]});});
 if(Array.isArray(savedZones))savedZones.forEach((z,idx)=>{
  if(!z||!currentTeam(z)||z.isSingleHouse||z.isNoAptoZone||z.isHotMission||z.isLegacyPortfolio||!String(z.town||"").trim())return;
  const k=norm(z.parentTown||z.town);
  if(!grouped.has(k))grouped.set(k,{key:k,nombre:z.town,perimetro:null,sectores:[]});
  grouped.get(k).sectores.push({z,idx});
 });
 return [...grouped.values()].map(p=>{
  const total=p.sectores.length;
  const terminados=p.sectores.filter(({z})=>z.status==="completada"&&z.precheck?.sectorStatus!=="no_apto").length;
  const descartados=p.sectores.filter(({z})=>z.precheck?.sectorStatus==="no_apto").length;
  const cerrados=terminados+descartados;
  const haciendo=p.sectores.filter(({z})=>z.status==="en_proceso"&&z.precheck?.sectorStatus!=="no_apto").length;
  const si=p.sectores.reduce((sum,{z})=>sum+nval(z.stats?.si),0);
  const no=p.sectores.reduce((sum,{z})=>sum+nval(z.stats?.no),0);
  const ausente=p.sectores.reduce((sum,{z})=>sum+nval(z.stats?.ausente),0);
  const papelito=p.sectores.reduce((sum,{z})=>sum+nval(z.stats?.papelito),0);
  const comerciales=[...new Set(p.sectores.map(({z})=>z.comercial).filter(Boolean))];
  const fechas=p.sectores.map(({z})=>z.date).filter(Boolean).sort();
  // El estado del pueblo depende SOLO de la captación de sus sectores.
  // Ni las llamadas ni una marca manual histórica fuerzan "Terminado".
  const estado=total>0&&cerrados===total?"terminados":(haciendo>0||cerrados>0)?"haciendo":"pendientes";
  return {...p,total,terminados,descartados,cerrados,haciendo,si,no,ausente,papelito,
   visitadas:si+no+ausente+papelito,
   aceptacion:si+no>0?Math.round(100*si/(si+no)):null,
   avance:total?Math.round(100*cerrados/total):0,comerciales,fechas,estado};
 }).sort((a,b)=>(a.fechas[0]||"9999").localeCompare(b.fechas[0]||"9999")||a.nombre.localeCompare(b.nombre,"es"));
}
function add(parent,...nodes){parent.append(...nodes);return parent;}
function el(tag,cls,text,parent){const o=$(tag,cls,text);if(parent)parent.append(o);return o;}
function stat(root,label,value){const c=el("div","cn-kpi",undefined,root);el("strong","",value,c);el("span","",label,c);}
function progress(root,percent){const bar=el("div","cn-progress",undefined,root);const fill=el("div","cn-progress-fill",undefined,bar);fill.style.width=Math.min(100,Math.max(0,percent))+"%";}
function modal(){
 let root=document.getElementById("cnTerritorio");
 if(!root){
  root=$("div","modal-overlay cn-territorio");
  root.id="cnTerritorio";
  root.style.zIndex="10135";
  root.innerHTML='<div class="cn-page" role="dialog" aria-modal="true" aria-label="Dirección territorial"><div class="cn-page-head"><div><span class="cn-eyebrow">DIRECCIÓN TERRITORIAL</span><h2>Pueblos</h2></div><button type="button" class="cn-close" aria-label="Cerrar">Cerrar</button></div><div class="cn-page-body"></div></div>';
  root.querySelector(".cn-close").onclick=()=>root.classList.remove("active");
  root.addEventListener("click",e=>{if(e.target===root)root.classList.remove("active");});
  document.body.appendChild(root);
 }
 return root;
}

/* Selector de municipios de Navarra: búsqueda, desambiguación y perímetro oficial. */
let townSearchToken=0;
function municipioPoints(feature){
 const g=feature.geometry||{};
 const rings=g.type==="Polygon"?[g.coordinates?.[0]]:g.type==="MultiPolygon"?(g.coordinates||[]).map(p=>p[0]):[];
 const valid=rings.filter(r=>Array.isArray(r)&&r.length>=4);
 if(!valid.length)throw Error("Este municipio no tiene un perímetro utilizable.");
 const ring=valid.sort((a,b)=>b.length-a.length)[0];
 const unique=ring.slice(0,-1);
 // Mantener un número de vértices controlado para los documentos sincronizados.
 const step=Math.max(1,Math.ceil(unique.length/90));
 const coords=unique.filter((_,i)=>i%step===0).map(p=>[Number(p[1]),Number(p[0])]);
 if(coords.length<3||coords.some(p=>p.some(n=>!Number.isFinite(n))))throw Error("El polígono del municipio es inválido.");
 return coords;
}
function openTownCreator(){
 const existing=document.getElementById("cnTownCreator");
 if(existing)existing.remove();
 const overlay=el("div","modal-overlay cn-territorio",undefined,document.body);
 overlay.id="cnTownCreator";overlay.classList.add("active");overlay.style.zIndex="10620";
 const page=el("section","cn-page",undefined,overlay);
 page.setAttribute("role","dialog");page.setAttribute("aria-modal","true");
 const head=el("header","cn-page-head",undefined,page);
 const title=el("div","",undefined,head);
 el("span","cn-eyebrow","KONSOR · TERRITORIO",title);
 el("h2","","Añadir pueblo",title);
 const close=()=>overlay.remove();
 head.append(btn("Cerrar",close));
 const content=el("div","cn-page-body",undefined,page);
 notice(content,"Busca el municipio de Navarra. Selecciona el resultado correcto y se guardará su perímetro automáticamente, sin tener que dibujarlo.");
 const input=el("input","cn-search",undefined,content);
 input.type="search";input.placeholder="Nombre del pueblo (ej. Zizur Mayor)";
 input.setAttribute("aria-label","Buscar municipio");
 const state=el("p","cn-hint","Escribe el pueblo y pulsa Buscar.",content);
 const list=el("div","cn-town-list",undefined,content);
 const manual=el("div","cn-actions",undefined,content);
 manual.append(btn("Delimitar manualmente en el mapa",()=>{
   close();document.getElementById("cnTerritorio")?.classList.remove("active");
   window.cnvShowMap?.();if(typeof iniciarDibujoPueblo==="function")iniciarDibujoPueblo();
 }));
 let features=[];
 function candidates(){
  const token=norm(input.value);
  list.replaceChildren();
  if(!token){state.textContent="Escribe un nombre y pulsa Buscar.";return;}
  const matches=features.filter(f=>norm(f.properties?.nombre||"").includes(token)||norm(f.properties?.displayName||"").includes(token)).slice(0,12);
  state.textContent=matches.length?matches.length+" resultado(s). Selecciona el municipio correcto.":"No hay coincidencias. Prueba otra forma del nombre.";
  matches.forEach(f=>{
   const row=el("section","cn-town",undefined,list);
   el("strong","cn-town-name",f.properties.nombre,row);
   el("p","cn-detail",f.properties.displayName||"Navarra · España",row);
   const action=btn("Seleccionar y crear pueblo",async()=>{
    if(action.disabled)return;
    action.disabled=true;
    state.textContent="Guardando perímetro en Firebase…";
    try{
     if(typeof window.guardarPerimetroPueblo!=="function"||typeof window.leerPerimetrosPueblo!=="function")
       throw Error("El servicio territorial no está disponible.");
     const nombre=String(f.properties.nombre||"").trim();
     const old=(typeof perimetrosPueblos!=="undefined"?perimetrosPueblos:[]).find(p=>norm(p.nombre)===norm(nombre));
     if(old&&!confirm("Ya existe "+nombre+". ¿Actualizar su perímetro?")){action.disabled=false;state.textContent="Operación cancelada.";return;}
     const points=municipioPoints(f);
     await window.guardarPerimetroPueblo({nombre,points,rev:old?.rev||0});
     if(typeof cargarPerimetrosPueblos==="function")await cargarPerimetrosPueblos();
     if(typeof actualizarAgrupacionTerritorial==="function"&&typeof map!=="undefined"&&map)actualizarAgrupacionTerritorial();
     if(typeof map!=="undefined"&&map){map.fitBounds(L.latLngBounds(points),{padding:[25,25]});}
     close();document.getElementById("cnTerritorio")?.classList.remove("active");
     alert(nombre+" guardado. Su perímetro ya está disponible en el mapa.");
    }catch(e){state.textContent="No se ha podido guardar: "+(e.message||e);action.disabled=false;}
   },"primary");
   row.append(action);
  });
 }
 async function buscar(){
  const query=input.value.trim();
  if(query.length<2){state.textContent="Introduce al menos dos letras.";return;}
  const request=++townSearchToken;
  state.textContent="Buscando localidades y límites…";list.replaceChildren();
  try{
   const url="https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&polygon_geojson=1&limit=12&countrycodes=es&q="+encodeURIComponent(query+", Navarra, España");
   const response=await fetch(url,{headers:{"Accept":"application/json"}});
   if(!response.ok)throw Error("Servicio geográfico temporalmente no disponible.");
   const rows=await response.json();
   if(request!==townSearchToken)return;
   features=rows.filter(x=>x.geojson&&["Polygon","MultiPolygon"].includes(x.geojson.type)).map(x=>({
    properties:{nombre:x.name||x.address?.town||x.address?.village||query,displayName:x.display_name},
    geometry:x.geojson
   }));
   if(!features.length){state.textContent="No se ha encontrado un perímetro para este pueblo. Puedes delimitarlo manualmente.";return;}
   candidates();
  }catch(e){state.textContent="No se pudo buscar: "+(e.message||e)+". Puedes utilizar la delimitación manual.";}
 }
 const searchAction=btn("Buscar localidades",buscar,"primary");
 input.insertAdjacentElement("afterend",searchAction);
 let debounce=null;
 input.addEventListener("input",()=>{clearTimeout(debounce);if(input.value.trim().length>=3)debounce=setTimeout(buscar,650);});
 input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();clearTimeout(debounce);buscar();}});
 overlay.addEventListener("click",e=>{if(e.target===overlay)close();});
 input.focus();
}
window.openKonsorTownCreator=openTownCreator;

function notice(target,text){el("p","cn-hint",text,target);}
function sectorCard(container,entry){
 const {z,idx}=entry;
 const card=el("div","cn-sector",undefined,container);
 const row=el("div","cn-flex",undefined,card);
 el("strong","cn-sector-name",z.sectorName||"Sector sin nombre",row);
 const estado=z.precheck?.sectorStatus==="no_apto"?"Descartado técnicamente":z.status==="completada"?"Volcado terminado":z.streetCompletedAt&&!z.dumpDate?"Calle terminada · por volcar":z.status==="en_proceso"?"Haciendo":"Por hacer";
 el("span","cn-tag",estado,row);
 el("p","cn-detail",[z.comercial||"Sin comercial",z.date||"Sin fecha"].join(" · "),card);
 if(z.comercial){
  const received=Number(z.assignmentReceivedAt)>0&&z.assignmentReceivedBy===z.comercial;
  el("p","cn-detail",z.status==="completada"?"Trabajo terminado":received?"Recibida por "+z.comercial+" · Pendiente de terminar":"Sin confirmar recepción del comercial",card);
 }
 const stats=z.stats||{};
 const doors=["si","no","ausente","papelito"].reduce((n,key)=>n+nval(stats[key]),0);
 el("p","cn-detail",doors+" puertas registradas · "+nval(stats.si)+" sí",card);
 const actions=el("div","cn-actions",undefined,card);
 actions.append(btn("Ver en mapa",()=>{
  document.getElementById("cnTerritorio")?.classList.remove("active");
  if(typeof focusMapOnTownOrZone==="function")focusMapOnTownOrZone(z.town,idx);
 },"outline"));
 actions.append(btn("Evaluar viviendas",()=>openPrecheck(z.id),"outline"));
 actions.append(btn("Revisar sector",()=>{
  document.getElementById("cnTerritorio")?.classList.remove("active");
  if(typeof openDumpModal==="function")openDumpModal(idx);
 },"outline"));
 if(typeof currentUserRole!=="undefined"&&currentUserRole==="jefe"){
  actions.append(btn("Eliminar sector",async()=>{
   const zona=savedZones?.[idx];
   if(!zona)return;
   if((zona.clients||[]).length&&!confirm("Este sector tiene fichas registradas. Borrarlo también eliminará esos datos. ¿Continuar?"))return;
   if(typeof deleteZone!=="function")return alert("No está disponible la eliminación.");
   await deleteZone(idx);
   render();
  },"outline"));
 }
}


/* Evaluación técnica previa: no confundir descartes con respuestas comerciales. */
function openPrecheck(zoneId){
 const zone=(Array.isArray(savedZones)?savedZones:[]).find(z=>String(z?.id)===String(zoneId));
 if(!zone)return alert("No se encuentra el sector.");
 const owner=zone.comercial;
 const authorized=(typeof currentUserRole!=="undefined"&&currentUserRole==="jefe")||owner===currentUserName;
 if(!authorized)return alert("Este sector no está asignado a tu cuenta.");
 let root=document.getElementById("konsorPrecheck");
 if(root)root.remove();
 root=$("div","modal-overlay cn-territorio");root.id="konsorPrecheck";root.style.zIndex="11030";
 const page=$("section","cn-page");page.style.maxWidth="560px";
 const head=$("div","cn-page-head");const title=$("div");
 title.append($("span","cn-eyebrow","EVALUACIÓN PREVIA"),$("h2","","Revisar viviendas"));
 head.append(title);head.append(btn("Cerrar",()=>root.remove()));
 const body=$("div","cn-page-body");page.append(head,body);root.append(page);document.body.append(root);root.classList.add("active");
 root.addEventListener("click",e=>{if(e.target===root)root.remove()});
 let draft=JSON.parse(JSON.stringify(zone.precheck||{houses:[],sectorStatus:"pendiente"}));
 if(!Array.isArray(draft.houses))draft.houses=[];
 const note=text=>el("p","cn-hint",text,body);
 const field=(placeholder,value="")=>{const input=$("input");input.placeholder=placeholder;input.value=value;input.style.cssText="box-sizing:border-box;width:100%;min-height:45px;border:1px solid #dce4ee;border-radius:13px;background:#fff;color:#243447;padding:11px;font-size:16px";return input};
 const status=$("p","cn-hint");
 async function commit(){
  if(!window.KonsorBridge?.save||window.KonsorBridge.busy)throw Error("No está disponible el guardado sincronizado.");
  const candidate=JSON.parse(JSON.stringify(savedZones));
  const target=candidate.find(z=>String(z?.id)===String(zoneId));
  if(!target)throw Error("El sector ya no existe.");
  target.precheck={...draft,updatedBy:currentUserName,updatedAt:Date.now()};
  target._updatedAt=Date.now();
  await window.KonsorBridge.save("comercial_custom_zones",candidate);
  savedZones=candidate;window.refreshCnTerritory?.();window.cnvRefreshHome?.();
 }
 async function save(){
  status.textContent="Guardando en Firestore…";
  try{await commit();status.textContent="Guardado confirmado.";render()}catch(e){status.textContent="No se confirmó el guardado: "+(e.message||e);}
 }
 function render(){
  body.replaceChildren();
  note("Usa Catastro y la inspección visual para identificar viviendas. No descartes automáticamente casas solo porque se parezcan.");
  const stats={apta:0,no_apta:0,dudosa:0};
  for(const h of draft.houses)if(Object.hasOwn(stats,h.status))stats[h.status]++;
  const row=el("div","cn-actions",undefined,body);
  for(const [key,label] of [["apta","Posibles aptas"],["no_apta","No aptas"],["dudosa","Dudosas"]])row.append($("span","cn-tag",label+": "+stats[key]));
  const list=el("div","",undefined,body);
  draft.houses.forEach((h,i)=>{
   const card=el("div","cn-sector",undefined,list);
   el("strong","",h.address||"Vivienda sin dirección",card);
   el("p","cn-detail",({apta:"Posiblemente apta",no_apta:"No apta",dudosa:"Necesita comprobación"})[h.status]||"Pendiente",card);
   if(h.reason)el("p","cn-detail",h.reason,card);
   const a=el("div","cn-actions",undefined,card);
   a.append(btn("Editar",()=>editor(i),"outline"),btn("Quitar",()=>{draft.houses.splice(i,1);render()},"outline"));
  });
  const actions=el("div","cn-actions",undefined,body);
  actions.append(btn("Añadir vivienda",()=>editor(-1)));
  actions.append(btn("Guardar revisión",save,"outline"));
  const sector=el("div","cn-sector",undefined,body);
  el("strong","","Evaluación del sector",sector);
  note("Puedes marcar todo el sector como no apto, pero debes justificarlo. No cuenta como rechazo comercial.");
  const reason=field("Motivo técnico del descarte total",draft.sectorReason||"");sector.append(reason);
  const action=el("div","cn-actions",undefined,sector);
  action.append(btn("Sector no apto",async()=>{
   if(!reason.value.trim())return alert("Indica el motivo técnico.");
   if(!confirm("¿Confirmas que TODO el sector debe descartarse técnicamente? Esta acción no borra fichas ni clientes."))return;
   draft.sectorStatus="no_apto";draft.sectorReason=reason.value.trim();await save();
  },"outline"));
  if(draft.sectorStatus==="no_apto")action.append(btn("Reabrir sector",async()=>{draft.sectorStatus="pendiente";draft.sectorReason="";await save()},"outline"));
  body.append(status);
 }
 function editor(i){
  body.replaceChildren();
  const h=i<0?{address:"",status:"dudosa",reason:""}:draft.houses[i];
  el("h3","","Clasificar vivienda",body);
  const address=field("Calle y número / referencia",h.address);body.append(address);
  const select=$("select");select.style.cssText="width:100%;min-height:47px;padding:10px;border:1px solid #dce4ee;border-radius:13px;background:#fff;color:#243447;font-size:16px";
  [["dudosa","Pendiente de comprobar"],["apta","Posiblemente apta"],["no_apta","No apta"]].forEach(([value,label])=>{const opt=$("option");opt.value=value;opt.textContent=label;select.append(opt)});
  select.value=h.status;body.append(select);
  const reason=field("Motivo u observaciones",h.reason);body.append(reason);
  const actions=el("div","cn-actions",undefined,body);
  actions.append(btn("Continuar",()=>{
   if(!address.value.trim())return alert("Identifica la vivienda para evitar duplicados.");
   const addressKey=norm(address.value);
   if(draft.houses.some((x,j)=>j!==i&&norm(x.address)===addressKey))return alert("Esta vivienda ya está clasificada.");
   const entry={address:address.value.trim(),status:select.value,reason:reason.value.trim()};
   if(i<0)draft.houses.push(entry);else draft.houses[i]=entry;
   render();
  }));
  actions.append(btn("Cancelar",render,"outline"));
  note("Los cambios se sincronizan al pulsar Guardar revisión.");
 }
 render();
}

async function deleteTownSafely(p){
 if(!p?.perimetro)return;
 const nombre=p.nombre;
 const clave=norm(nombre);
 const asociados=(Array.isArray(savedZones)?savedZones:[]).filter(z=>
   z&&!z.isNoAptoZone&&!z.isHotMission&&
   (norm(z.town)===clave||norm(z.parentTown)===clave));
 if(asociados.length){
  alert("No se puede eliminar "+nombre+": tiene "+asociados.length+
   " sector(es) o ficha(s) asociados. Elimina o reasigna primero esas zonas.");
  return;
 }
 if(!confirm("¿Eliminar definitivamente el perímetro de "+nombre+
  " de Firebase? Esta acción no se puede deshacer."))return;
 if(typeof window.guardarPerimetroPueblo!=="function"){
  alert("No está disponible la conexión con Firebase. El pueblo no se ha borrado.");
  return;
 }
 const overlay=document.getElementById("cnTerritorio");
 const controls=overlay?.querySelectorAll("button")||[];
 controls.forEach(b=>b.disabled=true);
 try{
  // La Cloud Function existente ofrece el borrado transaccional mediante eliminar:true.
  const resultado=await window.guardarPerimetroPueblo({
   nombre,rev:p.perimetro.rev||0,eliminar:true
  });
  if(resultado?.data?.ok!==true)throw Error("Firebase no confirmó la eliminación.");
  if(typeof cargarPerimetrosPueblos!=="function")throw Error("Falta la recarga de perímetros.");
  await cargarPerimetrosPueblos();
  const permanece=(Array.isArray(perimetrosPueblos)?perimetrosPueblos:[])
   .some(t=>norm(t.nombre)===clave);
  if(permanece)throw Error("Firebase sigue devolviendo este pueblo. Actualiza y comprueba su estado.");
  puebloAbierto=null;
  if(typeof actualizarAgrupacionTerritorial==="function")actualizarAgrupacionTerritorial();
  render();
 }catch(error){
  alert("No se ha podido confirmar la eliminación: "+(error.message||error));
 }finally{
  controls.forEach(b=>b.disabled=false);
 }
}

function renderDetail(target,p){
 const back=btn("Volver a pueblos",()=>{puebloAbierto=null;render();},"subtle");
 target.append(back);
 el("h3","cn-town-title",p.nombre,target);
 const row=el("div","cn-kpis",undefined,target);
 stat(row,"Sectores terminados",p.terminados+" / "+p.total);
  if(p.descartados)stat(row,"Descartados técnicamente",p.descartados);
 stat(row,"Comerciales",p.comerciales.length);
 stat(row,"Progreso de sectores",p.avance+"%");
 if(p.perimetro){
  const boundary=el("p","cn-hint","Perímetro del pueblo guardado en el mapa. Dentro puedes añadir sectores para cada comercial.",target);
  const actions=el("div","cn-actions",undefined,target);
  actions.append(btn("Ver perímetro en el mapa",()=>{
   document.getElementById("cnTerritorio")?.classList.remove("active");
   window.cnvShowMap?.();
   if(typeof map!=="undefined"&&map&&p.perimetro.points?.length>=3)map.fitBounds(L.latLngBounds(p.perimetro.points),{padding:[25,25]});
  }));
 }
 if(p.perimetro&&typeof currentUserRole!=="undefined"&&currentUserRole==="jefe"){
  const management=el("div","cn-actions",undefined,target);
  management.append(btn("Eliminar pueblo",()=>deleteTownSafely(p),"outline"));
 }
 const waiting=p.sectores.filter(({z})=>z.comercial&&z.status!=="completada"&&!(z.assignmentReceivedAt&&z.assignmentReceivedBy===z.comercial)).length;
 if(p.total)el("p","cn-hint",waiting?waiting+" sectores todavía sin confirmación de recepción.":"No hay sectores pendientes de confirmar recepción en este pueblo.",target);
 progress(target,p.avance);
 notice(target,p.total?"El avance indica sectores terminados, no superficie cubierta.":"Todavía no hay sectores en este pueblo. Crea el primero dentro de su perímetro.");
 const summary=el("div","cn-summary",undefined,target);
 const metrics=el("div","cn-kpis",undefined,summary);
 stat(metrics,"Sí",p.si);stat(metrics,"No",p.no);stat(metrics,"Puertas registradas",p.visitadas);
 el("p","cn-detail","Tasa de aceptación: "+(p.aceptacion===null?"Sin respuestas suficientes":p.aceptacion+"%")+" (sí / sí + no)",summary);
 const quick=el("div","cn-actions",undefined,target);
 quick.append(btn("Dibujar sector dentro del pueblo",()=>{
  document.getElementById("cnTerritorio")?.classList.remove("active");
  if(typeof window.konsorStartSectorInTown==="function"&&p.perimetro)window.konsorStartSectorInTown(p.nombre);
  else{
   if(typeof focusMapOnTownOrZone==="function"&&p.sectores.length)focusMapOnTownOrZone(p.nombre,p.sectores[0].idx);
   if(typeof startSectorDrawing==="function")startSectorDrawing();
  }
 },"primary"));
 el("h4","cn-section-title","Sectores del pueblo",target);
 p.sectores.slice().sort((a,b)=>(a.z.date||"9999").localeCompare(b.z.date||"9999")).forEach(entry=>sectorCard(target,entry));
}
function render(){
 const root=modal();const body=root.querySelector(".cn-page-body");body.replaceChildren();
 const data=pueblos();
 const p=puebloAbierto?data.find(p=>p.key===puebloAbierto):null;
 if(p){renderDetail(body,p);return;}
 const active=(Array.isArray(savedZones)?savedZones:[]).filter(z=>z&&currentTeam(z)&&!z.isSingleHouse&&!z.isNoAptoZone&&!z.isHotMission&&z.status!=="completada");
 const mikel=typeof isMikelTeamMember==="function"&&isMikelTeamMember(currentUserName);
 const teamNames=(typeof getActiveTeamUsers==="function"?getActiveTeamUsers(mikel):mikel?["Mikel (Jefe)","Mikel Com. 1","Mikel Com. 2","Mikel Com. 3","Mikel Com. 4","Mikel Com. 5"]:["Andrei (Jefe)","Comercial 1","Comercial 2","Comercial 3","Comercial 4","Comercial 5"]).filter(name=>name&&name!==currentUserName);
 const today=typeof getTodayISO==="function"?getTodayISO():new Date().toISOString().slice(0,10);
 const planning=el("details","cn-summary",undefined,body);
 el("summary","cn-section-title","Planificación del equipo · Ver detalles",planning);

 notice(planning,"Sectores asignados todavía abiertos. El porcentaje de pueblo indica sectores terminados, no cobertura de superficie.");
 const day=x=>String(x||"").slice(0,10);
 teamNames.forEach(name=>{
  const assigned=active.filter(z=>z.comercial===name);
  const overdue=assigned.filter(z=>day(z.date)&&day(z.date)<today).length;
  const waitingDump=assigned.filter(z=>Number(z.streetCompletedAt)>0&&!z.dumpDate).length;
  const future=assigned.filter(z=>day(z.date)>=today).length;
  const line=el("div","cn-sector",undefined,planning);
  el("strong","cn-sector-name",name,line);
  el("p","cn-detail", assigned.length+" sectores abiertos · "+overdue+" atrasados · "+future+" desde hoy · "+waitingDump+" por volcar",line);
 });
 if(teamNames.length&&teamNames.some(name=>!active.some(z=>z.comercial===name&&day(z.date)>=today))){
  notice(planning,"Hay comerciales sin próximos sectores programados. Asigna nuevas zonas o pueblos antes de agotar el trabajo disponible.");
 }
 planning.append(btn("Crear sector y asignar fecha",()=>{
   root.classList.remove("active");
   if(typeof startSectorDrawing==="function")startSectorDrawing();
 },"primary"));
 const counts={pendientes:0,haciendo:0,terminados:0};
 data.forEach(p=>counts[p.estado]++);
 const totals=el("div","cn-kpis",undefined,body);
 stat(totals,"Por hacer",counts.pendientes);
 stat(totals,"Haciendo",counts.haciendo);
 stat(totals,"Terminados",counts.terminados);
 const tabs=el("div","cn-tabs",undefined,body);
 [["pendientes","Sin empezar"],["haciendo","En proceso"],["terminados","Terminada"]].forEach(([key,label])=>{
 const b=btn(label,()=>{filtro=key;render();},filtro===key?"selected":"");
 b.setAttribute("aria-pressed",String(filtro===key));tabs.append(b);
 });
 const search=el("input","cn-search",undefined,body);search.type="search";
 search.placeholder="Buscar pueblo";search.value=textoBusqueda;
 search.addEventListener("input",()=>{textoBusqueda=search.value;fillList();});
 const results=el("div","cn-town-list",undefined,body);
 function fillList(){
  results.replaceChildren();
  const filtered=data.filter(p=>p.estado===filtro&&norm(p.nombre).includes(norm(textoBusqueda)));
  if(!filtered.length)notice(results,"No hay pueblos en este estado. Crea uno dibujando su perímetro en el mapa.");
  filtered.forEach(p=>{
   const card=el("div","cn-town",undefined,results);
   const line=el("div","cn-flex",undefined,card);
   el("strong","cn-town-name",p.nombre,line);
   el("span","cn-tag",p.estado==="pendientes"?"Sin empezar":p.estado==="haciendo"?"En proceso":"Terminada",line);
   const summary=el("div","cn-flex cn-town-progress",undefined,card);
   el("span","",p.total?p.avance+"% de sectores":"Sin sectores todavía",summary);
   el("span","",p.terminados+" de "+p.total,summary);
   progress(card,p.avance);
   el("p","cn-detail",(p.perimetro?"Perímetro dibujado · ":"Pueblo con sectores · ")+p.comerciales.length+" comerciales · "+p.si+" sí · "+p.no+" no",card);
   card.append(btn("Abrir pueblo",()=>{puebloAbierto=p.key;render();},"outline"));
  });
 }
 fillList();
 const foot=el("div","cn-footer",undefined,body);
 foot.append(btn("Dibujar nuevo pueblo",()=>{
  root.classList.remove("active");
  window.cnvShowMap?.();
  if(typeof iniciarDibujoPueblo==="function")iniciarDibujoPueblo();
 },"primary"));
 foot.append(btn("Crear y asignar sector",()=>{
  root.classList.remove("active");
  if(typeof startSectorDrawing==="function")startSectorDrawing();
  else alert("No se ha cargado la herramienta de sectores. Recarga la aplicación.");
 },"outline"));
 notice(body,"Primero dibuja el perímetro de un pueblo. Después ábrelo y dibuja dentro los sectores que asignarás a los comerciales.");
}
window.openCnTerritory=function(nombre){if(!["Andrei (Jefe)","Mikel (Jefe)"].includes(currentUserName))return;puebloAbierto=typeof nombre==="string"?norm(nombre):null;filtro="pendientes";textoBusqueda="";const root=modal();render();root.classList.add("active");};
window.refreshCnTerritory=function(){if(document.getElementById("cnTerritorio")?.classList.contains("active"))render();};
})();