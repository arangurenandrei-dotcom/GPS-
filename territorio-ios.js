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
 try {return typeof isMikelTeamMember==="function"&&!isMikelTeamMember(z.comercial);}
 catch(e){return false;}
}
function pueblos(){
 const grouped=new Map();
 if(!Array.isArray(savedZones))return [];
 savedZones.forEach((z,idx)=>{
  if(!z||!currentTeam(z)||z.isSingleHouse||z.isNoAptoZone||z.isHotMission||!String(z.town||"").trim())return;
  const k=norm(z.town);
  if(!grouped.has(k))grouped.set(k,{key:k,nombre:z.town,sectores:[]});
  grouped.get(k).sectores.push({z,idx});
 });
 return [...grouped.values()].map(p=>{
  const total=p.sectores.length;
  const terminados=p.sectores.filter(({z})=>z.status==="completada").length;
  const haciendo=p.sectores.filter(({z})=>z.status==="en_proceso").length;
  const si=p.sectores.reduce((sum,{z})=>sum+nval(z.stats?.si),0);
  const no=p.sectores.reduce((sum,{z})=>sum+nval(z.stats?.no),0);
  const ausente=p.sectores.reduce((sum,{z})=>sum+nval(z.stats?.ausente),0);
  const papelito=p.sectores.reduce((sum,{z})=>sum+nval(z.stats?.papelito),0);
  const comerciales=[...new Set(p.sectores.map(({z})=>z.comercial).filter(Boolean))];
  const fechas=p.sectores.map(({z})=>z.date).filter(Boolean).sort();
  const estado=terminados===total?"terminados":(haciendo>0||terminados>0?"haciendo":"pendientes");
  return {...p,total,terminados,haciendo,si,no,ausente,papelito,
   visitadas:si+no+ausente+papelito,
   aceptacion:si+no>0?Math.round(100*si/(si+no)):null,
   avance:Math.round(100*terminados/total),comerciales,fechas,estado};
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
 const state=el("p","cn-hint","Cargando municipios…",content);
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
  if(!token){state.textContent=features.length+" municipios disponibles. Escribe un nombre para buscar.";return;}
  const matches=features.filter(f=>norm(f.properties?.nombre||"").includes(token)).slice(0,16);
  state.textContent=matches.length?matches.length+" resultado(s). Selecciona el municipio correcto.":"No hay coincidencias. Prueba otra forma del nombre.";
  matches.forEach(f=>{
   const row=el("section","cn-town",undefined,list);
   el("strong","cn-town-name",f.properties.nombre,row);
   el("p","cn-detail","Navarra · Perímetro municipal oficial",row);
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
 input.addEventListener("input",candidates);
 overlay.addEventListener("click",e=>{if(e.target===overlay)close();});
 fetch("./municipios-navarra.geojson",{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("No se pudo cargar la cartografía.");return r.json();}).then(data=>{
  features=(data.features||[]).filter(f=>f.properties?.nombre&&f.geometry);
  candidates();input.focus();
 }).catch(e=>{state.textContent="Sin cartografía automática: "+(e.message||e)+". Puedes delimitar el pueblo manualmente.";});
}
window.openKonsorTownCreator=openTownCreator;

function notice(target,text){el("p","cn-hint",text,target);}
function sectorCard(container,entry){
 const {z,idx}=entry;
 const card=el("div","cn-sector",undefined,container);
 const row=el("div","cn-flex",undefined,card);
 el("strong","cn-sector-name",z.sectorName||"Sector sin nombre",row);
 const estado=z.status==="completada"?"Volcado terminado":z.streetCompletedAt&&!z.dumpDate?"Calle terminada · por volcar":z.status==="en_proceso"?"Haciendo":"Por hacer";
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
function renderDetail(target,p){
 const back=btn("Volver a pueblos",()=>{puebloAbierto=null;render();},"subtle");
 target.append(back);
 el("h3","cn-town-title",p.nombre,target);
 const row=el("div","cn-kpis",undefined,target);
 stat(row,"Sectores terminados",p.terminados+" / "+p.total);
 stat(row,"Comerciales",p.comerciales.length);
 stat(row,"Progreso de sectores",p.avance+"%");
 const waiting=p.sectores.filter(({z})=>z.comercial&&z.status!=="completada"&&!(z.assignmentReceivedAt&&z.assignmentReceivedBy===z.comercial)).length;
 el("p","cn-hint",waiting?waiting+" sectores todavía sin confirmación de recepción.":"No hay sectores pendientes de confirmar recepción en este pueblo.",target);
 progress(target,p.avance);
 notice(target,"El progreso refleja sectores terminados, no superficie física cubierta. La cobertura territorial requiere delimitar el área objetivo y medir los sectores.");
 const summary=el("div","cn-summary",undefined,target);
 const metrics=el("div","cn-kpis",undefined,summary);
 stat(metrics,"Sí",p.si);stat(metrics,"No",p.no);stat(metrics,"Puertas registradas",p.visitadas);
 el("p","cn-detail","Tasa de aceptación: "+(p.aceptacion===null?"Sin respuestas suficientes":p.aceptacion+"%")+" (sí / sí + no)",summary);
 const quick=el("div","cn-actions",undefined,target);
 quick.append(btn("Asignar otro sector",()=>{
  document.getElementById("cnTerritorio")?.classList.remove("active");
  if(typeof focusMapOnTownOrZone==="function")focusMapOnTownOrZone(p.nombre,p.sectores[0]?.idx??null);
  const input=document.getElementById("assignTown");
  if(input)input.value=p.nombre;
  if(typeof startSectorDrawing==="function")startSectorDrawing();
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
 const teamNames=(typeof getActiveTeamUsers==="function"?getActiveTeamUsers(false):["Andrei (Jefe)","Comercial 1","Comercial 2","Comercial 3","Comercial 4","Comercial 5"]).filter(name=>name&&name!=="Andrei (Jefe)"&&!String(name).startsWith("Mikel")&&!String(name).startsWith("Comercial Mikel"));
 const today=typeof getTodayISO==="function"?getTodayISO():new Date().toISOString().slice(0,10);
 const planning=el("section","cn-summary",undefined,body);
 el("h3","cn-section-title","Continuidad del equipo",planning);
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
 [["pendientes","Por hacer"],["haciendo","Haciendo"],["terminados","Terminados"]].forEach(([key,label])=>{
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
  if(!filtered.length)notice(results,"No hay pueblos con sectores en este estado. Los pueblos sin sectores todavía no forman parte del listado sincronizado.");
  filtered.forEach(p=>{
   const card=el("div","cn-town",undefined,results);
   const line=el("div","cn-flex",undefined,card);
   el("strong","cn-town-name",p.nombre,line);
   el("span","cn-tag",p.estado==="pendientes"?"Por hacer":p.estado==="haciendo"?"Haciendo":"Terminado",line);
   const summary=el("div","cn-flex cn-town-progress",undefined,card);
   el("span","",p.avance+"% de sectores",summary);
   el("span","",p.terminados+" de "+p.total,summary);
   progress(card,p.avance);
   el("p","cn-detail",p.comerciales.length+" comerciales · "+p.si+" sí · "+p.no+" no · "+(p.aceptacion===null?"Sin tasa":"Aceptación "+p.aceptacion+"%"),card);
   card.append(btn("Abrir pueblo",()=>{puebloAbierto=p.key;render();},"outline"));
  });
 }
 fillList();
 const foot=el("div","cn-footer",undefined,body);
 foot.append(btn("Crear pueblo · Búsqueda automática",openTownCreator,"primary"));
 foot.append(btn("Crear y asignar sector",()=>{
  root.classList.remove("active");
  if(typeof startSectorDrawing==="function")startSectorDrawing();
  else alert("No se ha cargado la herramienta de sectores. Recarga la aplicación.");
 },"outline"));
 notice(body,"Busca y selecciona un pueblo para registrar su perímetro; después dibuja los sectores de trabajo y asígnales responsable y fecha.");
}
window.openCnTerritory=function(){if(currentUserName!=="Andrei (Jefe)")return;puebloAbierto=null;filtro="haciendo";textoBusqueda="";const root=modal();render();root.classList.add("active");};
window.refreshCnTerritory=function(){if(document.getElementById("cnTerritorio")?.classList.contains("active"))render();};
})();