/* KONSOR: cartera unificada. Cada ficha permanece en su zona original de Firebase. */
(function(){
"use strict";
if(window.openKonsorLegacyPortfolio)return;
const ID="konsorLegacyPortfolio";
let editorMode="guided";
let returnAfterEdit=null;
const E=(tag,cls,txt,parent)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);if(parent)parent.append(n);return n;};
const B=(txt,fn,primary=false)=>{const b=E("button","kha-btn"+(primary?" primary":""),txt);b.type="button";b.onclick=fn;return b;};
const N=x=>String(x??"").trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ");
const current=()=>typeof currentUserName==="string"?currentUserName:"";
const chief=()=>typeof currentUserRole!=="undefined"&&currentUserRole==="jefe";
const mikel=name=>typeof isMikelTeamMember==="function"?isMikelTeamMember(name):String(name||"").startsWith("Mikel");
const access=z=>z&&mikel(z.comercial)===mikel(current())&&(chief()||z.comercial===current());
const zs=()=>typeof savedZones!=="undefined"&&Array.isArray(savedZones)?savedZones:[];
const historical=c=>false; // Etiquetas importadas: procedencia técnica, no clase de cliente.
const isPort=z=>!!z?.isLegacyPortfolio;
const isSectorless=z=>!!(z?.isSingleHouse&&z?.isSectorlessCapture);
const captureStats=r=>({si:r==="si"?1:0,no:r==="no"?1:0,ausente:r==="ausente"?1:0,papelito:r==="papelito"?1:0});
const callable=x=>!booked(x.c)&&x.c.obraStatus!=="no_apto"&&!["no_interesado","descartado"].includes(x.c.callStatus)&&!!x.c.name&&!!x.c.phone&&!!x.c.street&&x.c.callStatus!=="bloqueada";
const inPortfolio=c=>false; // No existen categorías funcionales de clientes antiguos.
window.konsorIsHistoricalClient=()=>false;
window.konsorIsHistoricalOnlySector=z=>!!(z?.isLegacyPortfolio&&!z?.isSingleHouse);
window.konsorPerformanceStats=z=>z?.stats||{};
const booked=c=>["agendada","realizada","agendada_historica"].includes(c?.obraStatus);
const numeric=x=>{if(x===null||x===undefined||String(x).trim()==="")return null;const n=Number(String(x).replace(",","."));return Number.isFinite(n)&&n>=0?n:null;};
const net=x=>{const n=numeric(x);return n===null?null:Math.round(Math.max(0,n-5)*100)/100;};
const phone=x=>String(x||"").replace(/\D/g,"").replace(/^34(?=\d{9}$)/,"");
const hasIdentity=c=>!!(c&&(c.name||c.phone||c.street));
const portId=(owner,town)=>{
 // IDs Firestore: solo ASCII alfanumérico y guiones bajos.
 // encodeURIComponent producía %20 y paréntesis para "Andrei (Jefe)", rechazados por guardarTrabajoV2.
 const raw=N(owner)+"|"+N(town);
 let hash=2166136261;
 for(let i=0;i<raw.length;i++)hash=Math.imul(hash^raw.charCodeAt(i),16777619)>>>0;
 const slug=N(town).replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,30)||"sin_localidad";
 return "hist_"+slug+"_"+hash.toString(16).padStart(8,"0");
};
let screen="list",selection=new Set(),includeManual=false,currentEdit=null,query="",notice="",activeTown="",activeStreet="";
const CSS=`#konsorLegacyPortfolio{position:fixed;inset:0;z-index:2147483000;display:flex;justify-content:center;align-items:center;background:#14253a77;backdrop-filter:blur(9px);padding:12px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#253449}#konsorLegacyPortfolio *{box-sizing:border-box}#konsorLegacyPortfolio .kha-page{width:min(100%,700px);max-height:94dvh;overflow-y:auto;overscroll-behavior:contain;border-radius:24px;background:#f5f7fa;padding:18px;box-shadow:0 25px 65px #15223855}#konsorLegacyPortfolio h2{font-size:24px;margin:3px 0 10px;letter-spacing:-.4px}#konsorLegacyPortfolio h3{font-size:17px;margin:0 0 7px}#konsorLegacyPortfolio p{font-size:13px;line-height:1.45;color:#66788b;margin:7px 0}#konsorLegacyPortfolio .kha-row{display:flex;justify-content:space-between;align-items:center;gap:9px;flex-wrap:wrap}#konsorLegacyPortfolio .kha-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}#konsorLegacyPortfolio .kha-card{background:white;border:1px solid #e0e5ec;border-radius:17px;margin:10px 0;padding:15px}#konsorLegacyPortfolio .kha-btn{min-height:43px;border:1px solid #dce3ec;border-radius:12px;padding:10px 13px;background:white;font-size:14px;color:#253449;font-weight:600}#konsorLegacyPortfolio .kha-btn.primary{background:#243e57;color:white;border-color:#243e57}#konsorLegacyPortfolio .kha-btn:disabled{opacity:.4}#konsorLegacyPortfolio .kha-tag{display:inline-block;margin:6px 0;background:#f0f4f8;color:#3d536b;border-radius:20px;padding:5px 9px;font-size:12px}#konsorLegacyPortfolio .kha-tag.good{background:#e9f6ed;color:#137446}#konsorLegacyPortfolio .kha-field{display:block;font-size:13px;font-weight:600;margin-bottom:12px}#konsorLegacyPortfolio .kha-field input,#konsorLegacyPortfolio .kha-field select,#konsorLegacyPortfolio .kha-field textarea,#konsorLegacyPortfolio .kha-search{width:100%;border:1px solid #d5dfeb;background:#f9fbfd;border-radius:12px;padding:11px;font:inherit;font-size:16px;color:#253449;margin-top:5px;min-height:44px}#konsorLegacyPortfolio .kha-field textarea{min-height:70px}#konsorLegacyPortfolio .kha-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}#konsorLegacyPortfolio .kha-choose{display:flex;align-items:flex-start;gap:10px;border-top:1px solid #e9eef3;padding:11px 0;font-size:14px}#konsorLegacyPortfolio .kha-choose input{width:19px;height:19px;flex:none}#konsorLegacyPortfolio .kha-alert{background:#fff6e9;color:#885d24;border:1px solid #f3ddbb;border-radius:11px;padding:10px}#konsorLegacyPortfolio .kha-muted{font-size:12px;color:#8090a4}@media(max-width:450px){#konsorLegacyPortfolio{padding:0}#konsorLegacyPortfolio .kha-page{width:100%;height:100dvh;max-height:100dvh;border-radius:0;padding-top:max(14px,env(safe-area-inset-top));padding-bottom:max(18px,env(safe-area-inset-bottom))}#konsorLegacyPortfolio .kha-grid{grid-template-columns:1fr}}#konsorLegacyPortfolio .kha-tabs{display:flex;overflow-x:auto;gap:7px;padding:5px 0 12px;scrollbar-width:none}#konsorLegacyPortfolio .kha-tab{flex:none;min-height:39px;border:1px solid #dae2ec;border-radius:24px;background:white;color:#42546a;padding:9px 12px;font-size:13px;font-weight:650}#konsorLegacyPortfolio .kha-tab.selected{background:#24425e;color:white;border-color:#24425e}#konsorLegacyPortfolio .kha-rowitem{width:100%;text-align:left;display:flex;justify-content:space-between;align-items:center;gap:11px;padding:14px;border-radius:14px;background:#fff;border:1px solid #e1e7ee;margin:8px 0;font-size:15px;color:#273b51}#konsorLegacyPortfolio .kha-stat{color:#718096;font-size:12px;font-weight:500}#konsorLegacyPortfolio .kha-confirm{font-size:12px;color:#768599}#konsorLegacyPortfolio .kha-actions>a{display:inline-block;padding:12px 14px;border-radius:12px;color:#fff;background:#25425d;font-size:14px;font-weight:650;text-decoration:none}\n#konsorLegacyPortfolio .kha-advanced{background:#fff;border:1px solid #e0e6ef;border-radius:15px;padding:13px;margin:12px 0}\n#konsorLegacyPortfolio .kha-advanced>summary{cursor:pointer;font-weight:650;color:#3e516b}\n#konsorLegacyPortfolio .kha-net-inline{display:flex;justify-content:space-between;gap:12px;margin:12px 0;padding:12px 14px;border-radius:13px;background:#eff3f8;font-size:14px;color:#51657b}\n#konsorLegacyPortfolio .kha-net-inline strong{color:#26394d}\n
#konsorLegacyPortfolio [hidden]{display:none!important}
#konsorLegacyPortfolio .kha-mode-switch{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}
#konsorLegacyPortfolio .kha-mode-switch .kha-btn{min-width:0;padding:8px;font-size:13px}
#konsorLegacyPortfolio .kha-guide-bar{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px}
#konsorLegacyPortfolio .kha-guide-bar>.kha-btn{flex:1;padding:7px;font-size:12px}
#konsorLegacyPortfolio .kha-guide-bar>.kha-muted{flex:0 0 100%}
#konsorLegacyPortfolio .kha-guide-nav{display:flex;gap:8px;flex:0 0 100%;flex-wrap:wrap}
#konsorLegacyPortfolio .kha-home{padding:12px;margin:10px 0;border:1px solid #e3e9ef;border-radius:13px;background:#f9fbfe}
`;
function start(){
 let root=document.getElementById(ID);
 if(!root){root=E("div","",undefined,document.body);root.id=ID;E("style","",CSS,root);root.onclick=ev=>{if(ev.target===root)root.remove();};}
 let page=root.querySelector(".kha-page");if(!page)page=E("div","kha-page",undefined,root);page.replaceChildren();
 const top=E("div","kha-row",undefined,page),name=E("div","",undefined,top);
 E("small","kha-muted","KONSOR · CRM",name);E("h2","",screen==="edit"&&currentEdit?"Editar ficha":"Todos los clientes",name);
 top.append(B("Cerrar",()=>{root.remove();const back=returnAfterEdit;returnAfterEdit=null;back?.();}));return page;
}
const p=(parent,text,cls="")=>E("p",cls,text,parent);
function card(parent,title,desc){const c=E("section","kha-card",undefined,parent);E("h3","",title,c);if(desc)p(c,desc);return c;}
function buttons(parent){return E("div","kha-actions",undefined,parent);}
function existingZone(candidate,owner,town){
 // Se reutiliza una zona válida del propio responsable: no se crea otra zona en Firebase.
 return candidate.find(z=>z&&!isPort(z)&&!z.isSingleHouse&&!z.isNoAptoZone&&!z.isHotMission&&
   z.comercial===owner&&N(z.town)===N(town))||null;
}
function syncState(){
 const bridge=window.KonsorBridge;
 if(!bridge?.save)return {kind:"missing",message:"El módulo de guardado no se ha cargado. Cierra la aplicación y vuelve a abrirla desde el inicio."};
 const st=bridge.state?.();
 if(st?.failed)return {kind:"failed",message:"Existe un cambio anterior sin confirmar en Firestore. No se moverá ninguna ficha hasta recuperar la sincronización."};
 if(st?.pending>0)return {kind:"pending",message:"Hay "+st.pending+" guardado(s) en curso. Es necesario que terminen antes de mover fichas."};
 if(st&&!st.connected)return {kind:"offline",message:st.authenticated?"La sesión de Firebase todavía no está preparada. Comprueba la conexión y recupera la sincronización.":"No hay sesión iniciada en Firebase."};
 if(bridge.busy)return {kind:"pending",message:"Hay un guardado pendiente. No se puede iniciar otro traslado todavía."};
 return {kind:"ready",message:"Guardado disponible."};
}
async function commit(candidate){
 const check=syncState();
 if(check.kind!=="ready")throw Error(check.message);
 // Validar ANTES de enviar: el servidor rechaza IDs con %, espacios o caracteres fuera de ASCII.
 // Conserva los sectores existentes. Solo permite registrar viviendas individuales
 // sin polígono, usando el modelo de fichas V2 ya existente.
 const previous=zs(),originalIds=new Set(previous.map(z=>String(z.id)));
 // Únicamente se acepta una vivienda individual con pueblo, sin sector.
 const added=candidate.filter(z=>!originalIds.has(String(z.id)));
 if(candidate.length!==previous.length+added.length||
    previous.some(z=>!candidate.some(x=>String(x.id)===String(z.id)))||
    added.length>1||
    added.some(z=>!isSectorless(z)||z.comercial!==current()||
      !Array.isArray(z.points)||z.points.length!==0||
      z.singlePoint!==null||!Array.isArray(z.clients)||z.clients.length!==1))
  throw Error("Operación cancelada: no se permite crear ni eliminar sectores desde esta pantalla.");
 await window.KonsorBridge.save("comercial_custom_zones",candidate);
 savedZones=candidate;
 try{window.refreshCnTerritory?.();window.cnvRefreshHome?.();if(typeof renderAllSavedZones==="function"&&typeof map!=="undefined"&&map)renderAllSavedZones();}catch(_){}
}
function portfolioEntries(){
 const out=[];
 zs().forEach((z,zi)=>{
  if(!access(z)||z.isNoAptoZone||z.isHotMission)return;
  (z.clients||[]).forEach((c,ci)=>{if(hasIdentity(c))out.push({z,zi,c,ci});});
 });
 return out.sort((a,b)=>String(a.z.town).localeCompare(String(b.z.town),"es")||
  String(a.c.name||"").localeCompare(String(b.c.name||""),"es"));
}
function sourceEntries(){
 const out=[];zs().forEach((z,zi)=>{if(isPort(z)||isSectorless(z)||!access(z)||z.isNoAptoZone||z.isHotMission)return;(z.clients||[]).forEach((c,ci)=>{if(hasIdentity(c)&&!inPortfolio(c))out.push({z,zi,c,ci,detected:historical(c)});});});return out;
}
function key(x){return String(x.z.id)+"|"+String(x.c.clientUid||x.c.konsorImportKey||[x.c.name,x.c.street,x.c.phone,x.ci].join("|"));}
function showBackup(selected){
 const rows=selected.map(x=>({pueblo:x.z.town,sector:x.z.sectorName,responsable:x.z.comercial,ficha:x.c}));
 const blob=new Blob([JSON.stringify({origen:"KONSOR",exportado:new Date().toISOString(),registros:rows},null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download="konsor-copia-clientes.json";document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
async function migrate(){
 const chosen=sourceEntries().filter(x=>selection.has(key(x)));
 if(!chosen.length)return;
 if(!confirm("¿Organizar "+chosen.length+" fichas en Clientes antiguos? No se borrarán ni cambiarán de zona en Firebase. Desaparecerán de la lista de pendientes de traslado y quedarán bloqueadas para llamadas hasta que las revises."))return;
 const candidate=structuredClone(zs());
 let changed=0;
 for(const x of chosen){
  const z=candidate[x.zi],c=z?.clients?.[x.ci];
  if(!z||!c||!access(z)||isPort(z)||inPortfolio(c))
   throw Error("Alguna ficha ha cambiado. Vuelve a revisar la selección.");
  if(String(z.id)!==String(x.z.id)||String(c.clientUid||"")!==String(x.c.clientUid||""))
   throw Error("El orden de los datos ha cambiado. Actualiza la cartera antes de continuar.");
  // Mantener clientUid y zona: guardarTrabajoV2 valida la asociación física.
  c.legacyPortfolio=true;
  c.importedLegacy=true;
  c.legacyReviewStatus="pendiente";
  c.legacyMovedAt=Date.now();
  c.legacyOriginZoneId=z.id;
  c.legacyOriginSector=z.sectorName||"";
  c.legacyOriginTown=z.town||"";
  changed++;
 }
 if(!changed)return;
 await commit(candidate);
 selection.clear();screen="list";
 notice="Se han organizado "+changed+" fichas en Clientes antiguos. Se mantiene su ubicación interna en Firebase sin borrarlas ni duplicarlas.";
 render();
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
 const missing=[];
 if(!d.name)missing.push("nombre");
 if(!d.street)missing.push("dirección");
 if(!d.locality)missing.push("pueblo");
 if(!/^[6789]\d{8}$/.test(phone(d.phone)))missing.push("teléfono válido");
 if(d.captacionRespuesta!=="si")missing.push("respuesta «Sí»");
 return missing;
}
function editor(page){
 const z=currentEdit?zs()[currentEdit.zi]:null,c=z?.clients?.[currentEdit?.ci];
 if(currentEdit&&(!z||!c||!access(z)||z.id!==currentEdit.zoneId||String(c.clientUid)!==String(currentEdit.uid))){screen="list";notice="La ficha ha cambiado. Ábrela de nuevo.";render();return;}
 page.append(B("‹ Volver",()=>{
  if(returnAfterEdit){document.getElementById(ID)?.remove();const back=returnAfterEdit;returnAfterEdit=null;back();return;}
  screen="list";notice="";render();
 }));
 const box=card(page,c?"Ficha ID · "+String(c.clientUid||"").slice(-8).toUpperCase():"Nuevo cliente","Una ficha única. No hace falta crear sector para registrar clientes.");
 const switcher=E("div","kha-mode-switch",undefined,box);
 const guidedBtn=B("Proceso guiado",()=>setMode("guided"),true);
 const fullBtn=B("Ficha completa",()=>setMode("full"));
 switcher.append(guidedBtn,fullBtn);
 const guideBar=E("div","kha-guide-bar",undefined,box);
 const fields=E("div","kha-grid",undefined,box);
 const name=f(fields,"Nombre y apellidos",c?.name||"");
 const telephone=f(fields,"Teléfono",c?.phone||"","tel");
 const dni=f(fields,"DNI / NIE",c?.dni||"");
 const email=f(fields,"Correo electrónico",c?.email||"","email");
 const town=f(fields,"Pueblo",c?.locality||z?.town||"");
 const today=typeof getTodayISO==="function"?getTodayISO():new Date().toLocaleDateString("sv-SE");
 const captured=f(fields,"Fecha de captación",c?.captureDate||z?.date||today,"date");
 const street=f(fields,"Calle y número",c?.street||"");
 const postal=f(fields,"Código postal",c?.postalCode||"");
 const year=f(fields,"Año de construcción",c?.buildYear||"","number");
 const total=f(fields,"Superficie total (m²)",c?.m2Total??"","number");total.min="0";total.step="0.1";
 const zone=sel(fields,"Zona CTE",c?.cteZone||"",[["","Pendiente"],["D1","D1"],["D2","D2"],["D3","D3"],["E1","E1"],["E2","E2"],["E3","E3"]]);
 const geo=window.konsorLegacyGeo;
 const geoPanel=card(box,"Dirección y Catastro","El código postal y la zona CTE se consultan al completar la dirección.");
 const geoActions=buttons(geoPanel);
 const geoFeedback=E("p","kha-muted","",geoPanel);
 const geoOptions=E("div","",undefined,geoPanel);
 let geoRequest=0,postalAutomated=false,zoneManual=false;
 function setCteFromCp(force=false){
  const result=geo?.cte?.(postal.value,town.value);
  if(result?.cteZone&&(!zoneManual||force)){zone.value=result.cteZone;zoneManual=false;}
  else if(!result?.cteZone&&!zoneManual){zone.value="";}
  if(!result?.cteZone&&String(postal.value||"").trim())
   geoFeedback.textContent="Código postal anotado, pero sin correspondencia CTE verificada en KONSOR. Revisa manualmente la zona antes de llamar.";
  return result;
 }
 zone.addEventListener("change",()=>{zoneManual=true;});
 postal.addEventListener("change",()=>{postalAutomated=false;zoneManual=false;setCteFromCp(true);});
 async function searchPostal(force=false){
  const address=street.value.trim(),municipality=town.value.trim(),token=++geoRequest;
  if(!address||!municipality||(!force&&postal.value.trim()&&!postalAutomated))return;
  if(!geo?.postal){geoFeedback.textContent="El módulo de direcciones no está disponible. Introduce el CP manualmente.";return;}
  geoFeedback.textContent="Buscando calle y portal exactos en CartoCiudad…";
  geoOptions.replaceChildren();
  const original=JSON.stringify([address,municipality]);
  const result=await geo.postal(address,municipality).catch(()=>({status:"error",message:"No se pudo consultar CartoCiudad."}));
  if(token!==geoRequest||original!==JSON.stringify([street.value.trim(),town.value.trim()]))return;
  const verifyStreet=async()=>{
   if(!geo?.cadastre)return;
   const base=street.value.trim(),place=town.value.trim(),currentToken=geoRequest;
   const check=await geo.cadastre(base,place).catch(()=>null);
   if(currentToken!==geoRequest||base!==street.value.trim()||place!==town.value.trim()||
      check?.status!=="ok"||!Array.isArray(check.matches)||!check.matches.length)return;
   const verified=E("div","kha-street-options",undefined,geoOptions);
   E("small","","Direcciones encontradas en cartografía:",verified);
   for(const match of check.matches.slice(0,5)){
    const official=String(match.label||"").split(" · ")[0].trim();
    if(!official)continue;
    const choice=B(official,()=>{
     // La coincidencia procede de un portal preciso de CartoCiudad/IDENA.
     street.value=official;
     verified.replaceChildren();
     E("small","","Dirección seleccionada: "+official,verified);
    });
    verified.append(choice);
   }
   if(check.matches.length===1&&street.value.trim()!==String(check.matches[0].label||"").split(" · ")[0].trim())
    geoFeedback.textContent+=" · Selecciona la denominación de vía encontrada si corresponde.";
  };
  const apply=match=>{
   postal.value=match.cp;postalAutomated=true;zoneManual=false;
   const cte=setCteFromCp(true);
   geoFeedback.textContent="CP verificado por dirección: "+match.cp+
    (cte?.cteZone?" · Zona CTE orientativa: "+cte.cteZone:" · Zona CTE pendiente de confirmar")+
    ". Si el resultado es ambiguo, deja el valor sin verificar.";
   void verifyStreet();
  };
  if(result.status==="ok"&&result.matches?.length===1){apply(result.matches[0]);return;}
  if(result.status==="ambiguous"&&result.matches?.length){
   geoFeedback.textContent=result.message;
   const chooser=E("select","kha-search",undefined,geoOptions);
   const start=E("option","","Selecciona el código postal correcto",chooser);start.value="";
   result.matches.forEach((match,i)=>{const opt=E("option","",match.label,chooser);opt.value=String(i);});
   chooser.onchange=()=>{if(chooser.value!=="")apply(result.matches[Number(chooser.value)]);};
   return;
  }
  geoFeedback.textContent=result.message||"No se ha podido confirmar el portal. Introduce el CP manualmente.";
 }
 // CP y CTE se comprueban automáticamente al completar la dirección.
 street.addEventListener("blur",()=>{searchPostal(false);});
 street.addEventListener("change",()=>{searchPostal(false);});
 town.addEventListener("blur",()=>{searchPostal(false);});
 if(!postal.value.trim()&&street.value.trim()&&town.value.trim())
  Promise.resolve().then(()=>{if(document.getElementById(ID))searchPostal(false);});
 else if(postal.value.trim()&&!zone.value.trim())setCteFromCp();
 const cadastralBtn=B("Consultar Catastro oficial",async()=>{
  const address=street.value.trim(),municipality=town.value.trim(),token=++geoRequest;
  geoOptions.replaceChildren();
  geoFeedback.textContent="Buscando la parcela de "+address+", "+municipality+"…";
  if(!geo?.cadastre){geoFeedback.textContent="Consulta catastral no disponible.";return;}
  cadastralBtn.disabled=true;
  try{
   const result=await geo.cadastre(address,municipality);
   if(token!==geoRequest)return;
   if(result.status!=="ok"||!result.matches?.length){geoFeedback.textContent=result.message||"Parcela no localizada.";return;}
   geoFeedback.textContent=result.matches.length===1?"Dirección localizada; abre la ficha oficial.":"Hay varias coincidencias: selecciona el portal correcto.";
   let chosen=result.matches[0];
   if(result.matches.length>1){
    const selector=E("select","kha-search",undefined,geoOptions);
    result.matches.forEach((m,i)=>{const o=E("option","",m.label,selector);o.value=String(i);});
    selector.onchange=()=>{chosen=result.matches[Number(selector.value)];renderOfficial();};
   }
   const official=E("div","kha-actions",undefined,geoOptions);
   async function renderOfficial(){
    official.replaceChildren();
    const current=chosen;
    const url=await geo.cadastreUrl(current.lat,current.lon);
    if(token!==geoRequest||chosen!==current)return;
    const anchor=E("a","",url.official?"Abrir ficha oficial de Catastro":"Ver parcela en IDENA",official);
    anchor.href=url.url;anchor.target="_blank";anchor.rel="noopener noreferrer";
    p(official,url.official?"Consulta año y superficie en la ficha oficial y regístralos aquí.":"No hubo ficha directa; comprueba el punto en el visor oficial de IDENA.");
   }
   await renderOfficial();
  }catch(e){geoFeedback.textContent="No se ha podido consultar Catastro. Revisa la dirección e inténtalo de nuevo.";}
  finally{cadastralBtn.disabled=false;}
 });
 geoActions.append(cadastralBtn);
 const answer=sel(box,"Respuesta comercial",c?.captacionRespuesta||"",[["","Pendiente de respuesta"],["si","Sí, interesado"],["no","No interesado"],["ausente","Ausente"],["papelito","Papelito"]]);
 const note=f(box,"Observaciones",c?.observaciones||"","textarea");
 const result=E("div","kha-net-inline",undefined,box);
 E("span","","Superficie útil",result);
 const amount=E("strong","",undefined,result);
 const refresh=()=>{const value=net(total.value);amount.textContent=value===null?"Pendiente de introducir superficie total":value+" m²";};
 total.oninput=refresh;refresh();
 if(c?.m2&&!c?.m2Total)amount.textContent=String(c.m2)+" m²";
 const guidedSteps=[
  {title:"Contacto",help:"Introduce los datos de contacto. Puedes continuar si algún dato todavía falta.",nodes:[name,telephone,dni,email,captured,answer,note]},
  {title:"Vivienda",help:"Datos del inmueble. El CP y la CTE se buscarán automáticamente al completar la dirección.",nodes:[town,street,postal,year,total,zone]},
  {title:"Revisión",help:"Comprueba lo introducido. Los datos incompletos quedarán pendientes de completar.",nodes:[]}
 ];
 let activeStep=0;
 const extra=E("details","kha-advanced",undefined,box);
 E("summary","","Varias viviendas en este expediente",extra);
 E("p","kha-muted","La vivienda principal es la dirección de esta ficha. Aquí puedes añadir otras viviendas de la misma obra; comparten titular y documentación común.",extra);
 const homeList=E("div","kha-homes",undefined,extra);
 const extraHomes=Array.isArray(c?.viviendas)?c.viviendas.map(v=>({...v})):[];
 function homeEditor(){
  homeList.replaceChildren();
  extraHomes.forEach((v,i)=>{
   const pane=E("div","kha-home",undefined,homeList);
   E("strong","","Vivienda adicional "+(i+1),pane);
   const address=f(pane,"Dirección o referencia",v.direccion||"");address.oninput=()=>{v.direccion=address.value;};
   const area=f(pane,"Superficie total (m²)",v.m2Total??"","number");area.min="0";area.step="0.1";area.oninput=()=>{v.m2Total=area.value;};
   const note=f(pane,"Observaciones vivienda",v.notas||"");note.oninput=()=>{v.notas=note.value;};
   pane.append(B("Eliminar esta vivienda",()=>{extraHomes.splice(i,1);homeEditor();}));
  });
 }
 homeEditor();
 extra.append(B("Añadir otra vivienda",()=>{
  if(extraHomes.length>=49)return;
  extraHomes.push({id:"v"+(extraHomes.length+1)+"_"+Date.now(),direccion:"",m2Total:"",notas:""});
  homeEditor();
 }));
 function setMode(mode){
  editorMode=mode;
  guidedBtn.classList.toggle("primary",mode==="guided");
  fullBtn.classList.toggle("primary",mode==="full");
  guideBar.replaceChildren();
  const everything=[...guidedSteps.flatMap(s=>s.nodes.map(n=>n.closest(".kha-field"))),geoPanel,result,extra].filter(Boolean);
  if(mode==="full"){everything.forEach(n=>n.hidden=false);return;}
  guidedSteps.forEach((step,i)=>{
   const b=B((i+1)+". "+step.title,()=>{activeStep=i;setMode("guided");},i===activeStep);
   guideBar.append(b);
  });
  everything.forEach(n=>n.hidden=true);
  guidedSteps[activeStep].nodes.forEach(n=>{if(n?.closest(".kha-field"))n.closest(".kha-field").hidden=false;});
  if(activeStep===1){geoPanel.hidden=false;result.hidden=false;extra.hidden=false;}
  const help=E("p","kha-muted",guidedSteps[activeStep].help,guideBar);
  const nav=E("div","kha-guide-nav",undefined,guideBar);
  if(activeStep>0)nav.append(B("‹ Anterior",()=>{activeStep--;setMode("guided");}));
  if(activeStep<2)nav.append(B("Siguiente ›",()=>{activeStep++;setMode("guided");},true));
  if(activeStep===2){
   const review={name:name.value.trim(),phone:telephone.value.trim(),street:street.value.trim(),
    locality:town.value.trim(),m2:net(total.value),obraDate:c?.obraDate||""};
   const missing=window.KonsorExpediente?.missing?.(review,{town:review.locality},"comercial")||[];
   E("p","kha-muted",missing.length?
    "Por completar: "+missing.join(", ")+". Puedes guardar pendiente y volver más tarde.":
    "El contacto tiene los datos mínimos. Puedes guardarlo y continuar con las llamadas.",nav);
   if(missing.length)nav.append(B("Completar contacto",()=>{activeStep=0;setMode("guided");}));
   E("p","kha-muted","Puedes volver a editar esta misma ficha desde Comercial, Oficina o Técnicos.",nav);
  }
 }
 setMode(editorMode);
 if(notice)p(box,notice,"kha-alert");
 const actions=buttons(box);
 const showError=message=>{let slot=box.querySelector(".kha-live-error");if(!slot)slot=E("p","kha-alert kha-live-error",undefined,box);slot.textContent=message;};
 async function save(ready,button){
 const d={name:name.value.trim(),phone:telephone.value.trim(),dni:dni.value.trim().toUpperCase(),email:email.value.trim(),locality:town.value.trim(),street:street.value.trim(),
  postalCode:postal.value.trim(),buildYear:year.value.trim(),m2Total:total.value.trim(),cteZone:zone.value,
  captureDate:captured.value.trim(),captacionRespuesta:answer.value,observaciones:note.value.trim(),
  m2:net(total.value),type:c?.type||"vivienda",obraStatus:c?.obraStatus||"a_poner"};
  if(extraHomes.length){
   try{d.viviendas=window.KonsorExpediente.validateHomes(extraHomes);}
   catch(e){showError(e.message||"Revisa las viviendas.");return;}
  }else if(Array.isArray(c?.viviendas)){d.viviendas=[];}
 if(!(d.name||d.phone||d.street)){showError("Introduce al menos nombre, teléfono o dirección.");return;}
 if(d.dni&&typeof isValidDni==="function"&&!isValidDni(d.dni)){showError("DNI/NIE no válido.");return;}
 if(d.email&&!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(d.email)){showError("Correo electrónico incorrecto.");return;}
 if(!d.locality){showError("Debes indicar un pueblo.");return;}
 if(!/^\d{4}-\d{2}-\d{2}$/.test(d.captureDate)||!Number.isFinite(Date.parse(d.captureDate+"T12:00:00"))||d.captureDate>today){
  showError("Selecciona una fecha de captación válida, no posterior a hoy.");return;
 }
 if(d.m2===null&&c?.m2!==undefined)d.m2=c.m2;
 const pending=ready?validateReady(d):[];
 if(pending.length){showError("Faltan datos para activar llamadas: "+pending.join(", ")+". Puedes guardar como pendiente.");return;}
 if(ready&&booked(c)){showError("Esta ficha ya tiene una obra o cita; no puede reiniciarse.");return;}
 button.disabled=true;
 try{
  const data=structuredClone(zs()),stamp=Date.now();
  if(c){
   const oldZone=data[currentEdit.zi],oldClient=oldZone?.clients?.[currentEdit.ci];
   if(!oldClient||!access(oldZone)||
      String(oldZone.id)!==String(currentEdit.zoneId)||String(oldClient.clientUid)!==String(currentEdit.uid))
    throw Error("La ficha ha cambiado. Vuelve a abrirla.");
   if(!isSectorless(oldZone)&&!isPort(oldZone)&&!inPortfolio(oldClient)){
    // Edición de ficha ordinaria: no crear una importación histórica ni alterar estado.
    oldZone.clients[currentEdit.ci]={...oldClient,...d,updatedAt:stamp};
   }else if(isSectorless(oldZone)){
    // Una vivienda sin sector conserva el mismo modelo de ficha normal.
    // No se marca como «histórica» a efectos de estadísticas.
    const update={...oldClient,...d,sectorlessCapture:true,
      callStatus:ready?(oldClient.callStatus==="bloqueada"?"pendiente":oldClient.callStatus||"pendiente")
        :(oldClient.callStatus||"bloqueada"),
      updatedAt:stamp};
    oldZone.clients[currentEdit.ci]=update;
    oldZone.town=d.locality;oldZone.date=d.captureDate;oldZone.dumpDate=d.captureDate;
    oldZone.sectorName="🏠 "+d.street;oldZone.stats=captureStats(d.captacionRespuesta);
   }else{
    // Compatibilidad con fichas antiguas que ya estaban guardadas en sectores.
    const updated={...oldClient,...d,legacyPortfolio:true,importedLegacy:true,legacyReviewStatus:ready?"lista":oldClient.legacyReviewStatus||"pendiente",
      legacyReviewedAt:ready?stamp:oldClient.legacyReviewedAt,legacyReviewedBy:ready?current():oldClient.legacyReviewedBy,updatedAt:stamp};
    if(!d.m2Total&&!oldClient.m2Total)delete updated.m2Total;
    if(ready&&(!oldClient.callStatus||["pendiente_visita","no_interesado","descartado"].includes(oldClient.callStatus)))updated.callStatus="pendiente";
    oldZone.clients[currentEdit.ci]=updated;
   }
   oldZone._updatedAt=stamp;
  }else{
   if(data.some(z=>access(z)&&(z.clients||[]).some(old=>
      N(old.street)===N(d.street)&&N(old.locality||z.town)===N(d.locality)&&
      phone(old.phone)===phone(d.phone)&&d.street&&phone(d.phone).length===9)))
    throw Error("Parece que ya existe ese cliente con la misma dirección y teléfono.");
   // Mismo documento individual usado por «Nueva ficha» de KONSOR.
   // La vivienda no está asignada a un sector, no tiene polígono y no
   // genera porcentajes de cobertura ni conteos de sectores.
   let id=Date.now();while(data.some(z=>String(z.id)===String(id)))id++;
   const client={...d,clientUid:"f_"+crypto.randomUUID(),sectorlessCapture:true,
     origen:"contacto_directo",callStatus:ready?"pendiente":"bloqueada",
     createdAt:Date.parse(d.captureDate+"T12:00:00"),updatedAt:stamp,statusChangedAt:stamp};
   data.push({id,isSingleHouse:true,isSectorlessCapture:true,singlePoint:null,
     date:d.captureDate,dumpDate:d.captureDate,town:d.locality,
     sectorName:"🏠 "+d.street,comercial:current(),bossNote:"",pendingNote:"",
     status:"completada",points:[],stats:captureStats(d.captacionRespuesta),
     clients:[client],_updatedAt:stamp});
  }
  await commit(data);
  screen="list";currentEdit=null;
  notice=ready?"Cliente guardado y listo para llamadas.":"Ficha guardada. Puedes completar lo pendiente después.";
  activeTown=N(d.locality);activeStreet=streetBase(d.street).key;
  if(returnAfterEdit){document.getElementById(ID)?.remove();const back=returnAfterEdit;returnAfterEdit=null;back();return;}
  render();
 }catch(err){button.disabled=false;showError("No se ha confirmado el guardado: "+(err.message||err));}
}
 if(c){
  actions.append(B("Guardar cambios",function(){save(false,this);},true));
  if(!booked(c)&&(c.legacyReviewStatus==="pendiente"||(isSectorless(z)&&c.callStatus==="bloqueada")))
   actions.append(B("Habilitar llamadas",function(){save(true,this);}));
 }else{
  actions.append(B("Guardar pendiente",function(){save(false,this);}));
  actions.append(B("Guardar y habilitar llamadas",function(){save(true,this);},true));
 }
}
function moveScreen(page){
 page.append(B("‹ Volver",()=>{screen="list";render();}));
 const rows=sourceEntries(),chosen=rows.filter(x=>selection.has(key(x)));
 const box=card(page,"Recuperar fichas de sectores","Se separan de la captación de calle mediante una etiqueta. Sus documentos conservan la zona interna de Firebase; así no se pierden datos ni se crea otro sector.");
 const health=syncState();
 if(health.kind!=="ready"){
  const alertBox=card(box,"Guardado bloqueado",health.message);
  if(health.kind==="failed"||health.kind==="offline"){
   const recoverBtn=B("Recuperar sincronización",async()=>{
    recoverBtn.disabled=true;
    try{
     if(typeof window.KonsorBridge?.recover!=="function")throw Error("La recuperación no está cargada. Abre la versión más reciente de KONSOR.");
     await window.KonsorBridge.recover();
     // Recuperar puede cambiar el orden de las zonas: nunca reutilizar índices de una selección anterior.
     selection.clear();notice="Sincronización revisada. Vuelve a marcar las fichas y confirma el traslado.";render();
    }catch(e){notice="No se ha confirmado la recuperación: "+(e.message||e);render();}
   },true);
   alertBox.append(recoverBtn);
  }else if(health.kind==="pending")alertBox.append(B("Comprobar de nuevo",()=>{notice="";render();}));
 }
 const actions=buttons(box);
 actions.append(B(includeManual?"Solo importadas":"Mostrar también las manuales",()=>{includeManual=!includeManual;render();}));
 actions.append(B("Descargar copia JSON",()=>showBackup(chosen)));
 const count=p(box,chosen.length+" seleccionadas · "+rows.length+" disponibles");
 const list=includeManual?rows:rows.filter(x=>x.detected);
 if(!list.length)p(box,"No se encontraron importaciones antiguas pendientes. Puedes mostrar las fichas manuales.");
 list.forEach(x=>{
  const label=E("label","kha-choose",undefined,box),input=E("input","",undefined,label);input.type="checkbox";input.checked=selection.has(key(x));
  input.onchange=()=>{input.checked?selection.add(key(x)):selection.delete(key(x));count.textContent=selection.size+" seleccionadas · "+rows.length+" disponibles";moveBtn.disabled=!selection.size||syncState().kind!=="ready";};
  const desc=E("span","",undefined,label);E("strong","",x.c.name||x.c.street||"Sin nombre",desc);
  p(desc,[x.z.town,x.z.sectorName,x.c.phone,x.detected?"CSV":"Manual"].filter(Boolean).join(" · "));
 });
 if(notice)p(box,notice,"kha-alert");
 const moveBtn=B("Organizar en Clientes antiguos",async()=>{moveBtn.disabled=true;try{await migrate();}catch(err){notice=err.message||String(err);render();}finally{moveBtn.disabled=false;}},true);
 moveBtn.disabled=!chosen.length||health.kind!=="ready";box.append(moveBtn);
 p(box,"Se conservan todas las fichas en su ubicación técnica original. No se eliminarán los sectores ni se cambiará la zona de ningún cliente.");
}

function streetBase(address){
 const raw=String(address||"").trim();
 if(!raw)return {key:"sin_calle",label:"Dirección por completar"};
 // Captura el último número de portal, conservando números que forman parte del nombre de la calle.
 const found=raw.match(/^(.*?)(?:[,\s]+(?:n(?:[º°o.]|[úu]m\.?)?\s*)?(\d+)\s*(?:bis|ter|[a-z])?)(?:\s*[,;/].*)?$/iu);
 const label=(found?.[1]||raw).trim().replace(/[,;]$/,"").trim()||raw;
 const key=N(label).replace(/^(?:c\/|c\.|calle|cl|kalea|avenida|avda|av\.|paseo|plaza|pza)\s+/,"");
 return {key:key||"sin_calle",label};
}
function groupsByTown(){
 const map=new Map();
 portfolioEntries().forEach(x=>{
  const name=String(x.c.locality||x.z.town||"").trim()||"Localidad pendiente";
  const key=N(name);
  if(!map.has(key))map.set(key,{key,name,clients:[],streets:new Map()});
  const group=map.get(key);
  group.clients.push(x);
  const street=streetBase(x.c.street);
  if(!group.streets.has(street.key))group.streets.set(street.key,{...street,clients:[]});
  group.streets.get(street.key).clients.push(x);
 });
 return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,"es"));
}
function navButton(parent,text,action){
 const n=B(text,action);n.classList.add("kha-navigation");parent.append(n);return n;
}
function listScreen(page){
 const groups=groupsByTown(),total=groups.reduce((n,g)=>n+g.clients.length,0);
 const actions=buttons(page);
 actions.append(B("Añadir cliente",()=>{screen="edit";currentEdit=null;editorMode="guided";notice="";render();},true));
 actions.append(B("Nueva ficha completa",()=>{screen="edit";currentEdit=null;editorMode="full";notice="";render();}));
 actions.append(B("Volcar hoja de sector",()=>{
  if(typeof window.openSelectZoneToDump!=="function"){notice="El volcado de sectores no está disponible. Abre Comercial → Oficina → Volcado.";render();return;}
  document.getElementById(ID)?.remove();
  window.openSelectZoneToDump();
 }));
 const summary=card(page,"Cartera de clientes",total+" fichas en "+groups.length+" pueblos · con o sin sector");
 if(notice)p(summary,notice,"kha-alert");
 const stats=E("div","kha-row",undefined,summary);
 E("span","kha-tag","Pendientes: "+portfolioEntries().filter(x=>!callable(x)).length,stats);
 E("span","kha-tag good","Para llamar: "+portfolioEntries().filter(callable).length,stats);
 const search=E("input","kha-search",undefined,page);
 search.type="search";search.placeholder="Buscar nombre, teléfono, dirección o pueblo";search.value=query;
 const body=E("div","",undefined,page);
 const renderGroups=()=>{
  query=search.value;body.replaceChildren();
  if(!groups.length){p(body,"Todavía no hay clientes guardados en tu cartera.");return;}
  const q=N(query);
  let available=groups;
  if(q){
   const filtered=groups.map(g=>{
    const clients=g.clients.filter(x=>N([g.name,x.c.name,x.c.street,x.c.phone].join(" ")).includes(q));
    return {...g,clients,streets:new Map([...g.streets].map(([k,v])=>[k,{...v,clients:v.clients.filter(x=>clients.includes(x))}]).filter(([k,v])=>v.clients.length))};
   }).filter(g=>g.clients.length);
   available=filtered;
  }
  if(!available.length){p(body,"No hay coincidencias.");return;}
  const tabbar=E("div","kha-tabs",undefined,body);
  const selected=available.some(g=>g.key===activeTown)?activeTown:available[0].key;
  available.forEach(g=>{
   const btnTab=B(g.name+" · "+g.clients.length,()=>{activeTown=g.key;activeStreet="";renderGroups();});
   btnTab.className="kha-tab"+(g.key===selected?" selected":"");
   tabbar.append(btnTab);
  });
  const town=available.find(g=>g.key===selected);
  if(!town)return;

  const toolbar=E("details","kha-advanced",undefined,body);
  E("summary","","Herramientas de datos",toolbar);
  const withoutPostal=town.clients.filter(x=>!/^31\d{3}$/.test(String(x.c.postalCode||""))||
    !/^[DE][123]$/.test(String(x.c.cteZone||"")));
  const auto=B("Autocompletar CP y CTE ("+withoutPostal.length+")",async()=>{
   if(!withoutPostal.length)return;
   const geo=window.konsorLegacyGeo;
   if(!geo?.postal||!geo?.cte){notice="Servicio de direcciones no disponible.";render();return;}
   const selected=withoutPostal.slice(0,25);
   if(!confirm("¿Verificar los CP y zonas CTE de "+selected.length+" fichas de "+town.name+"? Las direcciones ambiguas quedarán pendientes."))return;
   if(syncState().kind!=="ready"){notice=syncState().message;render();return;}
   auto.disabled=true;
   const feedback=E("p","kha-confirm","Comprobando direcciones…",body);
   try{
    const data=structuredClone(zs());let changed=0,ambiguous=0,unknown=0;
    for(let i=0;i<selected.length;i++){
     const x=selected[i],z=data[x.zi],c=z?.clients?.[x.ci];
     if(!c||String(z.id)!==String(x.z.id)||String(c.clientUid)!==String(x.c.clientUid))
      throw Error("Los datos cambiaron durante la consulta. No se ha modificado ningún registro.");
     feedback.textContent="Verificando "+(i+1)+"/"+selected.length+": "+(c.street||"Sin dirección");
     const locality=String(c.locality||z.town||"").trim();
     let cp=String(c.postalCode||"").trim();
     if(!/^31\d{3}$/.test(cp)){
      const result=await geo.postal(c.street,locality).catch(()=>({status:"error"}));
      if(result.status!=="ok"||result.matches?.length!==1){
       if(result.status==="ambiguous")ambiguous++;else unknown++;
       continue;
      }
      cp=result.matches[0].cp;
     }
     const zone=geo.cte(cp,locality)?.cteZone||"";
     if(cp!==c.postalCode||(!/^[DE][123]$/.test(c.cteZone||"")&&/^[DE][123]$/.test(zone))){
      c.postalCode=cp;
      if(!/^[DE][123]$/.test(c.cteZone||"")&&/^[DE][123]$/.test(zone))c.cteZone=zone;
      c.legacyAddressCheckedAt=Date.now();z._updatedAt=Date.now();changed++;
     }
    }
    if(changed)await commit(data);
    notice="Revisadas "+selected.length+" · completadas "+changed+" · sin coincidencia "+unknown+
      " · ambiguas "+ambiguous+".";
    if(withoutPostal.length>25)notice+=" Hay más fichas para una segunda pasada.";
    render();
   }catch(e){auto.disabled=false;feedback.textContent="Sin confirmar el guardado: "+(e.message||e);}
  },true);
  auto.disabled=!withoutPostal.length;
  toolbar.append(auto);
  toolbar.append(B("Guardar copia JSON",()=>showBackup(town.clients)));
  E("h3","",town.name+" · Calles",body);
  p(body,"Selecciona una calle.");
  const streets=[...town.streets.values()].sort((a,b)=>a.label.localeCompare(b.label,"es"));
  if(activeStreet&&!town.streets.has(activeStreet))activeStreet="";
  if(!activeStreet){
   for(const road of streets){
    const ready=road.clients.filter(callable).length;
    const row=B("",()=>{activeTown=town.key;activeStreet=road.key;renderGroups();});
    row.className="kha-rowitem";
    const names=E("span","",undefined,row);
    E("strong","",road.label,names);
    p(names,road.clients.length+" fichas · "+ready+" listas para llamadas","kha-stat");
    E("span","","›",row);body.append(row);
   }
  }else{
   navButton(body,"‹ Volver a calles",()=>{activeStreet="";renderGroups();});
   const street=town.streets.get(activeStreet);
   E("h3","",street?.label||"",body);
   for(const x of street?.clients||[]){
    const item=card(body,x.c.name||"Cliente sin nombre",[x.c.street||"Dirección pendiente",x.c.phone].filter(Boolean).join(" · "));
    E("span",callable(x)?"kha-tag good":"kha-tag",
      callable(x)?"Lista para llamadas":"Pendiente de completar",item);
    p(item,(x.c.m2?x.c.m2+" m² · ":"")+(x.c.obraStatus==="agendada"?"Obra agendada":"Ficha de cliente"));
    item.append(B("Editar ficha",()=>{
      screen="edit";currentEdit={zi:x.zi,ci:x.ci,zoneId:x.z.id,uid:x.c.clientUid};
      notice="";render();
    },true));
   }
  }
 };
 search.oninput=renderGroups;renderGroups();
}
function render(){
 const page=start();
 if(!current()){p(page,"Inicia sesión para acceder a los clientes.");return;}
 if(screen==="move")moveScreen(page);else if(screen==="edit")editor(page);else listScreen(page);
}
window.openKonsorClients=function(){screen="list";activeTown="";activeStreet="";query="";notice="";render();};
window.openKonsorFichaOriginal=function(clientUid,onReturn){
 const uid=String(clientUid||"");
 let entry=null;
 zs().some((z,zi)=>{
  if(!access(z))return false;
  const ci=(z.clients||[]).findIndex(c=>String(c.clientUid||"")===uid);
  if(ci<0)return false;
  entry={z,zi,ci,c:z.clients[ci]};return true;
 });
 if(!entry){notice="Ficha no disponible en la sesión actual. Actualiza KONSOR.";screen="list";render();return false;}
 screen="edit";editorMode="full";returnAfterEdit=typeof onReturn==="function"?onReturn:null;
 currentEdit={zi:entry.zi,ci:entry.ci,zoneId:entry.z.id,uid:entry.c.clientUid};notice="";render();return true;
};
window.openKonsorLegacyPortfolio=window.openKonsorClients;
window.openKonsorLegacyClient=window.openKonsorFichaOriginal;
window.openKonsorNewClient=function(mode="guided"){screen="edit";currentEdit=null;returnAfterEdit=null;editorMode=mode==="full"?"full":"guided";notice="";render();};

})();
