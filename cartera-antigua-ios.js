/* KONSOR: Cartera histórica sin geografía. Traslado de fichas únicamente con confirmación. */
(function(){
"use strict";
if(window.openKonsorLegacyPortfolio)return;
const ID="konsorLegacyPortfolio";
const E=(tag,cls,txt,parent)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);if(parent)parent.append(n);return n;};
const B=(txt,fn,primary=false)=>{const b=E("button","kha-btn"+(primary?" primary":""),txt);b.type="button";b.onclick=fn;return b;};
const N=x=>String(x??"").trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ");
const current=()=>typeof currentUserName==="string"?currentUserName:"";
const chief=()=>typeof currentUserRole!=="undefined"&&currentUserRole==="jefe";
const mikel=name=>typeof isMikelTeamMember==="function"?isMikelTeamMember(name):String(name||"").startsWith("Mikel");
const access=z=>z&&mikel(z.comercial)===mikel(current())&&(chief()||z.comercial===current());
const zs=()=>typeof savedZones!=="undefined"&&Array.isArray(savedZones)?savedZones:[];
const historical=c=>!!(c?.importedCsv||c?.importedLegacy||c?.origenHoja||c?.legacyReviewStatus);
const isPort=z=>!!z?.isLegacyPortfolio;
const booked=c=>["agendada","realizada","agendada_historica"].includes(c?.obraStatus);
const numeric=x=>{if(x===null||x===undefined||String(x).trim()==="")return null;const n=Number(String(x).replace(",","."));return Number.isFinite(n)&&n>=0?n:null;};
const net=x=>{const n=numeric(x);return n===null?null:Math.round(Math.max(0,n-5)*100)/100;};
const phone=x=>String(x||"").replace(/\D/g,"").replace(/^34(?=\d{9}$)/,"");
const hasIdentity=c=>!!(c&&(c.name||c.phone||c.street));
const portId=(owner,town)=>"konsor_historical_"+encodeURIComponent(owner)+"_"+encodeURIComponent(N(town)||"sin_localidad");
let screen="list",selection=new Set(),includeManual=false,currentEdit=null,query="",notice="";
const CSS='#konsorLegacyPortfolio{position:fixed;inset:0;z-index:2147483000;display:flex;justify-content:center;align-items:center;background:#14253a77;backdrop-filter:blur(9px);padding:12px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#253449}#konsorLegacyPortfolio *{box-sizing:border-box}#konsorLegacyPortfolio .kha-page{width:min(100%,700px);max-height:94dvh;overflow-y:auto;overscroll-behavior:contain;border-radius:24px;background:#f5f7fa;padding:18px;box-shadow:0 25px 65px #15223855}#konsorLegacyPortfolio h2{font-size:24px;margin:3px 0 10px;letter-spacing:-.4px}#konsorLegacyPortfolio h3{font-size:17px;margin:0 0 7px}#konsorLegacyPortfolio p{font-size:13px;line-height:1.45;color:#66788b;margin:7px 0}#konsorLegacyPortfolio .kha-row{display:flex;justify-content:space-between;align-items:center;gap:9px;flex-wrap:wrap}#konsorLegacyPortfolio .kha-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}#konsorLegacyPortfolio .kha-card{background:white;border:1px solid #e0e5ec;border-radius:17px;margin:10px 0;padding:15px}#konsorLegacyPortfolio .kha-btn{min-height:43px;border:1px solid #dce3ec;border-radius:12px;padding:10px 13px;background:white;font-size:14px;color:#253449;font-weight:600}#konsorLegacyPortfolio .kha-btn.primary{background:#243e57;color:white;border-color:#243e57}#konsorLegacyPortfolio .kha-btn:disabled{opacity:.4}#konsorLegacyPortfolio .kha-tag{display:inline-block;margin:6px 0;background:#f0f4f8;color:#3d536b;border-radius:20px;padding:5px 9px;font-size:12px}#konsorLegacyPortfolio .kha-tag.good{background:#e9f6ed;color:#137446}#konsorLegacyPortfolio .kha-field{display:block;font-size:13px;font-weight:600;margin-bottom:12px}#konsorLegacyPortfolio .kha-field input,#konsorLegacyPortfolio .kha-field select,#konsorLegacyPortfolio .kha-field textarea,#konsorLegacyPortfolio .kha-search{width:100%;border:1px solid #d5dfeb;background:#f9fbfd;border-radius:12px;padding:11px;font:inherit;font-size:16px;color:#253449;margin-top:5px;min-height:44px}#konsorLegacyPortfolio .kha-field textarea{min-height:70px}#konsorLegacyPortfolio .kha-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}#konsorLegacyPortfolio .kha-choose{display:flex;align-items:flex-start;gap:10px;border-top:1px solid #e9eef3;padding:11px 0;font-size:14px}#konsorLegacyPortfolio .kha-choose input{width:19px;height:19px;flex:none}#konsorLegacyPortfolio .kha-alert{background:#fff6e9;color:#885d24;border:1px solid #f3ddbb;border-radius:11px;padding:10px}#konsorLegacyPortfolio .kha-muted{font-size:12px;color:#8090a4}@media(max-width:450px){#konsorLegacyPortfolio{padding:0}#konsorLegacyPortfolio .kha-page{width:100%;height:100dvh;max-height:100dvh;border-radius:0;padding-top:max(14px,env(safe-area-inset-top));padding-bottom:max(18px,env(safe-area-inset-bottom))}#konsorLegacyPortfolio .kha-grid{grid-template-columns:1fr}}';
function start(){
 let root=document.getElementById(ID);
 if(!root){root=E("div","",undefined,document.body);root.id=ID;E("style","",CSS,root);root.onclick=ev=>{if(ev.target===root)root.remove();};}
 let page=root.querySelector(".kha-page");if(!page)page=E("div","kha-page",undefined,root);page.replaceChildren();
 const top=E("div","kha-row",undefined,page),name=E("div","",undefined,top);
 E("small","kha-muted","KONSOR · CRM",name);E("h2","","Clientes antiguos",name);
 top.append(B("Cerrar",()=>root.remove()));return page;
}
const p=(parent,text,cls="")=>E("p",cls,text,parent);
function card(parent,title,desc){const c=E("section","kha-card",undefined,parent);E("h3","",title,c);if(desc)p(c,desc);return c;}
function buttons(parent){return E("div","kha-actions",undefined,parent);}
function portZones(candidate,owner,town){
 const id=portId(owner,town);
 let z=candidate.find(x=>isPort(x)&&x.id===id);
 if(!z){z={id,isLegacyPortfolio:true,comercial:owner,town,sectorName:"Cartera histórica",points:[],
  status:"completada",date:"",clients:[],stats:{si:0,no:0,ausente:0,papelito:0},createdAt:Date.now(),_updatedAt:Date.now()};candidate.push(z);}
 return z;
}
async function commit(candidate){
 if(!window.KonsorBridge?.save||window.KonsorBridge.busy)throw Error("No hay conexión de guardado o hay una operación pendiente.");
 await window.KonsorBridge.save("comercial_custom_zones",candidate);
 savedZones=candidate;
 try{window.refreshCnTerritory?.();window.cnvRefreshHome?.();if(typeof renderAllSavedZones==="function"&&typeof map!=="undefined"&&map)renderAllSavedZones();}catch(_){}
}
function portfolioEntries(){
 const out=[];zs().forEach((z,zi)=>{if(!isPort(z)||!access(z))return;(z.clients||[]).forEach((c,ci)=>{if(hasIdentity(c))out.push({z,zi,c,ci});});});
 return out.sort((a,b)=>(a.c.legacyReviewStatus==="lista")-(b.c.legacyReviewStatus==="lista")||String(a.z.town).localeCompare(String(b.z.town),"es"));
}
function sourceEntries(){
 const out=[];zs().forEach((z,zi)=>{if(isPort(z)||!access(z)||z.isNoAptoZone||z.isHotMission)return;(z.clients||[]).forEach((c,ci)=>{if(hasIdentity(c))out.push({z,zi,c,ci,detected:historical(c)});});});return out;
}
function key(x){return x.zi+":"+x.ci;}
function showBackup(selected){
 const rows=selected.map(x=>({pueblo:x.z.town,sector:x.z.sectorName,responsable:x.z.comercial,ficha:x.c}));
 const blob=new Blob([JSON.stringify({origen:"KONSOR",exportado:new Date().toISOString(),registros:rows},null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download="konsor-copia-clientes-antiguos.json";document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
async function migrate(){
 const chosen=sourceEntries().filter(x=>selection.has(key(x)));
 if(!chosen.length)return;
 if(!confirm("¿Mover "+chosen.length+" fichas de sus sectores a Clientes antiguos? Se conservarán los datos y se bloquearán sus llamadas hasta completar cada ficha. No se borrarán los sectores."))return;
 const candidate=structuredClone(zs()),bySource=new Map(),seen=new Set();
 for(const x of chosen){
  const z=candidate[x.zi],c=z?.clients?.[x.ci];
  if(!z||!c||!access(z)||isPort(z))throw Error("Las fichas han cambiado. Reabre esta pantalla.");
  const town=String(c.locality||z.town||"").trim()||"Localidad pendiente";
  const destination=portZones(candidate,z.comercial||current(),town);
  const token=String(c.clientUid||c.konsorImportKey||[c.name,c.street,c.phone].join("|"));
  const duplicate=destination.clients.some(old=>String(old.clientUid||old.konsorImportKey||[old.name,old.street,old.phone].join("|"))===token);
  if(duplicate||seen.has(destination.id+"|"+token))throw Error("Posible duplicado en "+town+": "+(c.name||c.street)+". Nada se ha movido.");
  seen.add(destination.id+"|"+token);
  destination.clients.push({...c,clientUid:c.clientUid||"historico_"+Date.now()+"_"+x.zi+"_"+x.ci,importedLegacy:true,
   locality:town==="Localidad pendiente"?"":town,legacyReviewStatus:"pendiente",legacyMovedAt:Date.now(),
   legacyOriginZoneId:z.id,legacyOriginSector:z.sectorName||"",legacyOriginTown:z.town||""});
  destination._updatedAt=Date.now();
  if(!bySource.has(x.zi))bySource.set(x.zi,[]);
  bySource.get(x.zi).push({ci:x.ci,resp:c.captacionRespuesta,wasCsv:!!c.importedCsv});
 }
 for(const [zi,moved] of bySource){
  const z=candidate[zi],idx=new Set(moved.map(x=>x.ci));
  z.clients=(z.clients||[]).filter((_,i)=>!idx.has(i));
  for(const x of moved)if(x.wasCsv&&z.stats&&["si","no","ausente","papelito"].includes(x.resp))
   z.stats[x.resp]=Math.max(0,(Number(z.stats[x.resp])||0)-1);
  z._updatedAt=Date.now();
 }
 await commit(candidate);
 selection.clear();screen="list";notice="Se han trasladado "+chosen.length+" fichas. Los sectores originales siguen existiendo; puedes revisar si quedaron vacíos.";render();
}
function f(parent,label,value="",kind="text"){
 const wrapper=E("label","kha-field",undefined,parent);E("span","",label,wrapper);
 const input=E(kind==="textarea"?"textarea":"input","",undefined,wrapper);if(kind!=="textarea")input.type=kind;input.value=value??"";return input;
}
function sel(parent,label,currentValue,options){
 const wrapper=E("label","kha-field",undefined,parent);E("span","",label,wrapper);
 const element=E("select","",undefined,wrapper);
 options.forEach(([value,label])=>{const o=E("option","",label,element);o.value=value;});
 element.value=currentValue||"";return element;
}
function validateReady(d){
 const bad=[];
 if(!d.name)bad.push("nombre");if(!d.street)bad.push("calle");if(!d.locality||d.locality==="Localidad pendiente")bad.push("pueblo");
 if(!/^[6789]\d{8}$/.test(phone(d.phone)))bad.push("teléfono válido");
 if(!Number.isInteger(Number(d.buildYear))||Number(d.buildYear)<1800||Number(d.buildYear)>new Date().getFullYear())bad.push("año");
 if(numeric(d.m2Total)===null||Number(d.m2Total)<=5)bad.push("superficie total");
 if(!/^[DE][123]$/.test(d.cteZone))bad.push("CTE D/E");
 if(d.captacionRespuesta!=="si")bad.push("respuesta «Sí»");
 if(Number(d.buildYear)>2006)bad.push("año posterior a 2006");
 if(d.m2<(d.type==="urbanizacion"?50:60))bad.push("superficie neta mínima");
 if(d.type==="comunidad")bad.push("revisión específica de comunidad");
 if(d.obraStatus==="no_apto")bad.push("estado no apto");
 return bad;
}
function editor(page){
 const z=currentEdit?zs()[currentEdit.zi]:null,c=z?.clients?.[currentEdit?.ci];
 if(currentEdit&&(!z||!c||!isPort(z)||!access(z))){screen="list";render();return;}
 page.append(B("‹ Volver a la cartera",()=>{screen="list";notice="";render();}));
 const box=card(page,c?"Completar ficha histórica":"Nuevo cliente antiguo","Sin dibujo de pueblos o sectores. Guarda pendiente o confirma que está lista para llamadas.");
 const fields=E("div","kha-grid",undefined,box);
 const name=f(fields,"Nombre y apellidos",c?.name||"");
 const telephone=f(fields,"Teléfono",c?.phone||"","tel");
 const town=f(fields,"Pueblo",c?.locality||z?.town||"");
 const street=f(fields,"Calle y número",c?.street||"");
 const postal=f(fields,"Código postal",c?.postalCode||"");
 const year=f(fields,"Año de construcción",c?.buildYear||"","number");
 const total=f(fields,"Superficie total (m²)",c?.m2Total??"","number");total.min="0";total.step="0.1";
 const zone=sel(fields,"Zona CTE",c?.cteZone||"",[["","Pendiente"],["D1","D1"],["D2","D2"],["D3","D3"],["E1","E1"],["E2","E2"],["E3","E3"]]);
 const answer=sel(box,"Respuesta comercial",c?.captacionRespuesta||"si",[["si","Sí, interesado"],["no","No interesado"],["ausente","Ausente"],["papelito","Papelito"]]);
 const note=f(box,"Observaciones",c?.observaciones||"","textarea");
 const result=card(box,"Superficie neta","Solo se restan 5 m² fijos al total; las plantas no afectan al cálculo.");
 const amount=E("strong","",undefined,result);
 const refresh=()=>{const value=net(total.value);amount.textContent=value===null?"Pendiente de introducir superficie total":value+" m²";};
 total.oninput=refresh;refresh();
 if(c?.m2&&!c?.m2Total)p(result,"Superficie guardada anteriormente: "+c.m2+" m². Escribe el total para recalcular.");
 if(notice)p(box,notice,"kha-alert");
 const actions=buttons(box);
 const showError=message=>{let slot=box.querySelector(".kha-live-error");if(!slot)slot=E("p","kha-alert kha-live-error",undefined,box);slot.textContent=message;};
 async function save(ready,button){
  const d={name:name.value.trim(),phone:telephone.value.trim(),locality:town.value.trim(),street:street.value.trim(),
   postalCode:postal.value.trim(),buildYear:year.value.trim(),m2Total:total.value.trim(),cteZone:zone.value,
   captacionRespuesta:answer.value,observaciones:note.value.trim(),m2:net(total.value),type:c?.type||"vivienda",obraStatus:c?.obraStatus||"a_poner"};
  if(!(d.name||d.phone||d.street)){showError("Introduce al menos un nombre, teléfono o dirección.");return;}
  if(!d.locality){showError("Debes indicar un pueblo para guardar.");return;}
  if(d.m2===null&&c?.m2!==undefined)d.m2=c.m2;
  const pending=ready?validateReady(d):[];
  if(pending.length){showError("Faltan datos para activar llamadas: "+pending.join(", ")+". Puedes guardar como pendiente.");return;}
  if(ready&&booked(c)){showError("Esta ficha ya tiene una obra o cita histórica; no se puede reiniciar como llamada pendiente.");return;}
  button.disabled=true;
  try{
   const data=structuredClone(zs()),stamp=Date.now();
   if(c){
    const oldZone=data[currentEdit.zi],oldClient=oldZone?.clients?.[currentEdit.ci];
    if(!oldClient||!isPort(oldZone)||!access(oldZone))throw Error("La ficha ha cambiado.");
    const updated={...oldClient,...d,legacyReviewStatus:ready?"lista":"pendiente",
     legacyReviewedAt:ready?stamp:oldClient.legacyReviewedAt,legacyReviewedBy:ready?current():oldClient.legacyReviewedBy,updatedAt:stamp};
    if(!d.m2Total&&!oldClient.m2Total)delete updated.m2Total;
    if(ready&&(!oldClient.callStatus||["pendiente_visita","no_interesado","descartado"].includes(oldClient.callStatus)))updated.callStatus="pendiente";
    const dst=portZones(data,oldZone.comercial,d.locality);
    if(dst.id!==oldZone.id){dst.clients.push(updated);oldZone.clients.splice(currentEdit.ci,1);dst._updatedAt=stamp;}
    else oldZone.clients[currentEdit.ci]=updated;
    oldZone._updatedAt=stamp;
   }else{
    const dst=portZones(data,current(),d.locality);
    if(data.some(z=>access(z)&&(z.clients||[]).some(old=>
      N(old.street)===N(d.street)&&N(old.locality||z.town)===N(d.locality)&&phone(old.phone)===phone(d.phone)&&d.street&&phone(d.phone).length===9)))
     throw Error("Parece que ya existe ese cliente con la misma dirección y teléfono.");
    dst.clients.push({...d,clientUid:"hist_"+(crypto.randomUUID?.()||String(stamp)+Math.random().toString(36).slice(2)),
     importedLegacy:true,legacyReviewStatus:ready?"lista":"pendiente",legacyReviewedAt:ready?stamp:null,
     legacyReviewedBy:ready?current():"",callStatus:"pendiente",createdAt:stamp,statusChangedAt:stamp});
    dst._updatedAt=stamp;
   }
   await commit(data);screen="list";currentEdit=null;notice=ready?"Ficha guardada y habilitada para llamadas.":"Ficha guardada en pendientes.";render();
  }catch(err){button.disabled=false;showError("No se ha confirmado el guardado: "+(err.message||err));}
 }
 actions.append(B("Guardar pendiente",function(){save(false,this);}));
 actions.append(B("Guardar y habilitar llamadas",function(){save(true,this);},true));
}
function moveScreen(page){
 page.append(B("‹ Volver",()=>{screen="list";render();}));
 const rows=sourceEntries(),chosen=rows.filter(x=>selection.has(key(x)));
 const box=card(page,"Recuperar fichas de sectores","Por defecto aparecen seleccionadas las fichas que llegaron por CSV. Revisa cuáles quieres trasladar. No se borran sectores.");
 const actions=buttons(box);
 actions.append(B(includeManual?"Solo importadas":"Mostrar también las manuales",()=>{includeManual=!includeManual;render();}));
 actions.append(B("Descargar copia JSON",()=>showBackup(chosen)));
 const count=p(box,chosen.length+" seleccionadas · "+rows.length+" disponibles");
 const list=includeManual?rows:rows.filter(x=>x.detected);
 if(!list.length)p(box,"No se encontraron importaciones antiguas pendientes. Puedes mostrar las fichas manuales.");
 list.forEach(x=>{
  const label=E("label","kha-choose",undefined,box),input=E("input","",undefined,label);input.type="checkbox";input.checked=selection.has(key(x));
  input.onchange=()=>{input.checked?selection.add(key(x)):selection.delete(key(x));count.textContent=selection.size+" seleccionadas · "+rows.length+" disponibles";};
  const desc=E("span","",undefined,label);E("strong","",x.c.name||x.c.street||"Sin nombre",desc);
  p(desc,[x.z.town,x.z.sectorName,x.c.phone,x.detected?"CSV":"Manual"].filter(Boolean).join(" · "));
 });
 if(notice)p(box,notice,"kha-alert");
 const moveBtn=B("Trasladar fichas seleccionadas",async()=>{moveBtn.disabled=true;try{await migrate();}catch(err){notice=err.message||String(err);render();}finally{moveBtn.disabled=false;}},true);
 moveBtn.disabled=!chosen.length;box.append(moveBtn);
 p(box,"Las fichas se trasladan juntas en un único guardado. Los sectores quedan intactos salvo por la retirada de los clientes seleccionados.");
}
function listScreen(page){
 const rows=portfolioEntries(),actions=buttons(page);
 actions.append(B("Añadir cliente antiguo",()=>{screen="edit";currentEdit=null;notice="";render();},true));
 actions.append(B("Recuperar fichas de sectores",()=>{screen="move";includeManual=false;notice="";selection=new Set(sourceEntries().filter(x=>x.detected).map(key));render();}));
 const status=card(page,"Mi cartera","Las fichas históricas ya no requieren dibujar zonas ni organizar sectores.");
 const countReady=rows.filter(x=>x.c.legacyReviewStatus==="lista").length;
 E("span","kha-tag","Por completar: "+(rows.length-countReady),status);E("span","kha-tag good","Listos para llamar: "+countReady,status);
 if(notice)p(status,notice,"kha-alert");
 const search=E("input","kha-search",undefined,page);search.type="search";search.placeholder="Buscar nombre, pueblo, teléfono o calle";search.value=query;
 const results=E("div","",undefined,page);
 function drawRows(){
  query=search.value;results.replaceChildren();
  const match=rows.filter(x=>!query||N([x.c.name,x.c.street,x.c.phone,x.c.locality,x.z.town].join(" ")).includes(N(query)));
  if(!match.length)p(results,rows.length?"No hay coincidencias.":"La cartera está vacía. Puedes recuperar fichas que ya importaste o añadir un cliente directamente.");
  match.forEach(x=>{
   const item=card(results,x.c.name||x.c.street||"Cliente sin nombre",[x.z.town,x.c.street,x.c.phone].filter(Boolean).join(" · "));
   E("span",x.c.legacyReviewStatus==="lista"?"kha-tag good":"kha-tag",x.c.legacyReviewStatus==="lista"?"Lista para llamadas":"Pendiente de revisar",item);
   p(item,"Año: "+(x.c.buildYear||"pendiente")+" · m² netos: "+(x.c.m2??"pendiente")+" · CTE: "+(x.c.cteZone||"pendiente"));
   item.append(B("Abrir y completar ficha",()=>{screen="edit";currentEdit={zi:x.zi,ci:x.ci};notice="";render();},true));
  });
 }
 search.oninput=drawRows;drawRows();
}
function render(){
 const page=start();
 if(!current()){p(page,"Inicia sesión para acceder a los clientes.");return;}
 if(screen==="move")moveScreen(page);else if(screen==="edit")editor(page);else listScreen(page);
}
window.openKonsorLegacyPortfolio=function(){screen="list";query="";notice="";render();};
})();