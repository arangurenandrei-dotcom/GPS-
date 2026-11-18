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
function notice(target,text){el("p","cn-hint",text,target);}
function sectorCard(container,entry){
 const {z,idx}=entry;
 const card=el("div","cn-sector",undefined,container);
 const row=el("div","cn-flex",undefined,card);
 el("strong","cn-sector-name",z.sectorName||"Sector sin nombre",row);
 const estado=z.status==="completada"?"Terminado":z.status==="en_proceso"?"Haciendo":"Por hacer";
 el("span","cn-tag",estado,row);
 el("p","cn-detail",[z.comercial||"Sin comercial",z.date||"Sin fecha"].join(" · "),card);
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
}
function renderDetail(target,p){
 const back=btn("Volver a pueblos",()=>{puebloAbierto=null;render();},"subtle");
 target.append(back);
 el("h3","cn-town-title",p.nombre,target);
 const row=el("div","cn-kpis",undefined,target);
 stat(row,"Sectores terminados",p.terminados+" / "+p.total);
 stat(row,"Comerciales",p.comerciales.length);
 stat(row,"Progreso de sectores",p.avance+"%");
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
 foot.append(btn("Dibujar sector en mapa",()=>{
  root.classList.remove("active");
  if(typeof startSectorDrawing==="function")startSectorDrawing();
 },"primary"));
 notice(body,"Resumen calculado a partir de los sectores sincronizados. No se registran pueblos nuevos desde esta pantalla todavía.");
}
window.openCnTerritory=function(){if(currentUserName!=="Andrei (Jefe)")return;puebloAbierto=null;filtro="haciendo";textoBusqueda="";const root=modal();render();root.classList.add("active");};
window.refreshCnTerritory=function(){if(document.getElementById("cnTerritorio")?.classList.contains("active"))render();};
})();