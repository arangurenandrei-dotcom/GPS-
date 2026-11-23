/* KONSOR · Indicadores reales de mensajes y avisos.
 * No se infiere "leído": las tareas permanecen sin confirmar hasta ACK del servidor.
 * Solo usa bandejas devueltas por Cloud Functions para el perfil autorizado.
 */
(function(w){
'use strict';
const PLANTS=new Set(['comercial','oficina','tecnicos','ceo']);
const bindings=new Map(),cached=new Map(),busy=new Map();
let uid='',generalCount=0,generalKnown=false,lastPlant='',lastRefresh=0;
const severity=items=>{
 const pending=(Array.isArray(items)?items:[]).filter(t=>t&&t.status==='pending'&&t.to&&t.to!==t.from);
 if(!pending.length)return {count:0,level:'none'};
 const critical=pending.some(t=>t.priority==='critical');
 const important=pending.some(t=>t.priority==='important');
 return {count:pending.length,level:critical?'red':important?'yellow':'blue'};
};
const bellLevel=(count,critical=false)=>count<=0?'none':critical||count>=8?'red':count>=4?'yellow':'blue';
function actualUser(){
 const user=w.auth?.currentUser?.uid||'';
 if(user!==uid){uid=user;cached.clear();busy.clear();generalCount=0;generalKnown=false;lastRefresh=0;}
 return user;
}
function paint(node,plant,kind){
 if(!node)return;
 const status=cached.get(plant);
 if(kind==='bell'){
  const count=(status?.count||0)+(generalKnown?generalCount:0);
  const level=bellLevel(count,status?.level==='red');
  node.dataset.konsorLevel=level;
  node.setAttribute('aria-label','Abrir avisos · '+count+' pendientes');
  node.title='Avisos · '+count+' pendientes';
 }else{
  node.dataset.konsorLevel=status?.level||'none';
  node.setAttribute('aria-label','Mensajes entre plantas'+(status?' · '+status.count+' sin confirmar':''));
 }
}
function paintAll(){
 for(const [node,data] of bindings){
  if(node.isConnected===false){bindings.delete(node);continue;}
  paint(node,data.plant,data.kind);
 }
}
async function refresh(plant){
 if(!PLANTS.has(plant)||!actualUser()||!w.KonsorBridge?.state?.().connected)return false;
 if(typeof w.listarMensajesPlantaKonsor!=='function')return false;
 if(busy.has(plant))return busy.get(plant);
 const request=(async()=>{
  try{
   const result=(await w.listarMensajesPlantaKonsor({plant})).data;
   if(!result?.ok||!Array.isArray(result.items))throw Error('Bandeja no verificada');
   if(actualUser())cached.set(plant,severity(result.items));
   paintAll();return true;
  }catch(err){
   // Sin datos confirmados no se inventa un estado vacío.
   console.warn('Indicador KONSOR: no se pudo consultar la bandeja',err?.code||err?.message||err);
   return false;
  }finally{busy.delete(plant);}
 })();
 busy.set(plant,request);return request;
}
function bind(node,plant,kind='tile'){
 if(!node||!PLANTS.has(plant))return node;
 actualUser();bindings.set(node,{plant,kind});node.classList.add('konsor-indicator-host');
 paint(node,plant,kind);
 refresh(plant);return node;
}
function setGeneral(count){
 actualUser();
 generalCount=Math.max(0,Math.min(1000,Number(count)||0));
 generalKnown=true;paintAll();
}
function changed(plant){
 if(PLANTS.has(plant))refresh(plant);
}
function active(){
 const selected=w.konsorDesigner?.current?.();
 if(PLANTS.has(selected))return selected;
 return 'comercial';
}
w.addEventListener?.('focus',()=>{const plant=active();refresh(plant);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(active());});
w.setInterval?.(()=>{if(document.hidden)return;const plant=active();if(plant!==lastPlant||Date.now()-lastRefresh>=60000){lastPlant=plant;lastRefresh=Date.now();refresh(plant);}},60000);
w.KonsorIndicators=Object.freeze({bind,refresh,changed,setGeneral,severity,bellLevel});
})(window);
