/* KONSOR | Laboratorio: recorrido operativo de técnicos (datos ficticios). */
(function(){
'use strict';
const stateByRole={};
const material={bagKg:15,kgPerM2:1.5,marginPct:10,spareBags:2};
const num=(x)=>Number(x);
const esc=(x)=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const state=(role)=>stateByRole[role]||(stateByRole[role]={loaded:false,baseBags:0,extraBags:0,index:0,arrived:false,usage:{},evidence:{},finished:false});
function orders(ctx){
  return ctx.jobs.filter(j=>j.crew==='C1'&&j.stage==='Instalación'&&/aislamiento/i.test(j.service))
    .sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}
function plan(ctx){
  const valid=material.bagKg>0 && material.kgPerM2>0 && material.marginPct>=0 && material.marginPct<=50;
  const rows=orders(ctx).map(job=>({
    job, kg:job.m2*material.kgPerM2,
    bags:valid?Math.ceil(job.m2*material.kgPerM2*(1+material.marginPct/100)/material.bagKg):0
  }));
  return {valid,rows,total:rows.reduce((n,x)=>n+x.bags,0),m2:rows.reduce((n,x)=>n+x.job.m2,0),kg:rows.reduce((n,x)=>n+x.kg,0)};
}
function remaining(s){
 return s.baseBags+s.extraBags-Object.values(s.usage).reduce((sum,x)=>sum+(Number(x.bags)||0),0);
}
function next(ctx){
  const s=state(ctx.role), p=plan(ctx), active=p.rows[s.index];
  if(ctx.shift==='off')return {title:'Empieza tu jornada',detail:'Tienes '+p.rows.length+' instalaciones previstas. Al fichar, KONSOR calculará automáticamente el material necesario.'};
  if(ctx.shift==='lunch')return {title:'Pausa de comida activa',detail:'Reanuda tu jornada para continuar con las instalaciones.'};
  if(ctx.shift==='ended')return {title:'Jornada finalizada',detail:'Consulta lo realizado y las incidencias pendientes.'};
  if(!p.valid)return {title:'Configura el material',detail:'Falta el peso del saco o el consumo técnico por m².'};
  if(!s.loaded)return {title:'Prepara '+(p.total+material.spareBags)+' sacos para '+p.rows.length+' viviendas',detail:'Mínimo calculado: '+p.total+' sacos para '+p.m2+' m² aproximados. Añadimos '+material.spareBags+' de reserva para imprevistos. No necesitas saber el precio del material.'};
  if(s.finished)return {title:'Todas las instalaciones revisadas',detail:'Se han registrado las cantidades utilizadas. Comprueba el material sobrante.'};
  return {title:s.arrived?'Instalación '+active.job.id+' · '+active.job.town:'Siguiente destino: '+active.job.town,detail:s.arrived?'Registra la ejecución real y las evidencias de la obra.':'Carga confirmada. Abre la ruta de la primera vivienda y empieza el trabajo.'};
}
function stats(p){return '<div class="kt-stats"><div><strong>'+p.rows.length+'</strong><small>Viviendas</small></div><div><strong>'+p.m2+'</strong><small>m² estimados</small></div><div><strong>'+p.total+'</strong><small>Sacos previstos</small></div></div>'}
function row(x,i,s){
const done=s.usage[x.job.id];
return '<div class="kt-job"><span class="kt-index">'+(done?'✓':(i+1))+'</span><div class="kt-job-main"><strong>'+esc(x.job.town)+' · '+esc(x.job.id)+'</strong><small>'+x.job.m2+' m² · '+esc(x.job.service)+'</small><small>'+(done?'Ejecutados '+done.m2+' m² y '+done.bags+' sacos':'Cálculo estimado: '+x.bags+' sacos')+'</small></div><span class="kt-status">'+(done?'Hecha':(s.index===i&&s.loaded?'Siguiente':'Prevista'))+'</span></div>';
}
function html(ctx){
const s=state(ctx.role),p=plan(ctx),n=next(ctx),active=p.rows[s.index],used=Object.values(s.usage).reduce((a,x)=>a+Number(x.bags),0);
let h='<div class="kt-guide"><div class="kt-title"><button class="kt-back" data-nav="inicio">‹</button><div><span class="eyebrow">TÉCNICOS · RECORRIDO AUTOMÁTICO</span><h1>Mi jornada</h1></div></div>';
h+='<div class="kt-phases"><span class="'+(ctx.shift==='working'?'done':'active')+'">Jornada</span><span class="'+(s.loaded?'done':'active')+'">Carga</span><span class="'+(s.loaded&&!s.finished?'active':'')+'">Instalaciones</span><span class="'+(s.finished?'done':'')+'">Cierre</span></div>';
h+='<section class="kt-card"><div class="eyebrow">SIGUIENTE ACCIÓN RECOMENDADA</div><h2>'+esc(n.title)+'</h2><p>'+esc(n.detail)+'</p>';
if(ctx.shift==='off'||ctx.shift==='lunch')h+='<button class="kt-primary" id="ktShift">'+(ctx.shift==='off'?'Iniciar jornada':'Reanudar jornada')+' →</button>';
else if(ctx.shift==='ended')h+='<div class="kt-warning">La jornada está finalizada; las actuaciones pendientes siguen pendientes.</div>';
else if(!s.loaded)h+='<button class="kt-primary" id="ktLoaded" '+(!p.valid||!p.rows.length?'disabled':'')+'>He cargado '+(p.total+material.spareBags)+' sacos →</button>';
else if(!s.finished&&!s.arrived)h+='<button class="kt-primary" id="ktMap">Abrir ruta a '+esc(active.job.town)+' ↗</button><button class="kt-secondary" id="ktArrive">He llegado a la vivienda</button>';
else if(s.finished)h+='<span class="chip green">Todas las instalaciones ficticias registradas</span>';
else h+='<span class="chip green">Instalación en curso · '+esc(active.job.id)+'</span>';
h+='</section>'+stats(p);
if(!s.loaded){
h+='<section class="kt-card"><span class="eyebrow">ALMACÉN · MATERIAL PREPARADO</span><h2>Carga calculada automáticamente</h2><p>El sistema utiliza las superficies previstas de cada vivienda y las características del producto. La cuadrilla solo comprueba y carga el material.</p>';
h+='<div class="kt-inputs"><label>Kg por saco<input id="ktBag" type="number" min="0.01" step="0.5" value="'+material.bagKg+'"></label><label>Consumo kg/m²<input id="ktUse" type="number" min="0.01" step="0.1" value="'+material.kgPerM2+'"></label><label>Margen %<input id="ktMargin" type="number" min="0" max="50" step="1" value="'+material.marginPct+'"></label></div>';
h+='<label class="kt-spare">Sacos extra recomendados para incidencias<input id="ktSpare" type="number" min="0" max="30" step="1" value="'+material.spareBags+'"></label>';
h+='<div class="kt-warning"><b>Valores ficticios.</b> El producto real tendrá sus parámetros definidos por responsable técnico. Fórmula: redondear hacia arriba [m² × consumo kg/m² × (1 + margen) ÷ kg/saco]. El técnico solo comprueba la carga física.</div>';
h+='<div class="kt-subtitle">MATERIAL POR VIVIENDA</div>'+p.rows.map((x,i)=>row(x,i,s)).join('');
h+='<div class="kt-total"><strong>'+(p.total+material.spareBags)+' sacos recomendados</strong><small>'+p.total+' sacos calculados para las obras + '+material.spareBags+' sacos extra de reserva. '+p.kg.toFixed(1).replace('.',',')+' kg teóricos antes del margen.</small></div></section>';
}else{
h+='<section class="kt-card"><span class="eyebrow">INVENTARIO DE LA CUADRILLA</span><h2>'+remaining(s)+' sacos disponibles</h2><p>Cargados: '+(s.baseBags+s.extraBags)+' · Utilizados: '+used+'. El recuento físico prevalece sobre esta estimación.</p>';
if(!s.finished)h+='<button class="kt-secondary" id="ktExtra">Registrar material adicional</button>';
h+='</section>';
if(active&&!s.finished){
h+='<section class="kt-card"><span class="eyebrow">ORDEN '+(s.index+1)+' DE '+p.rows.length+' · '+esc(active.job.id)+'</span><h2>'+esc(active.job.town)+'</h2><p>'+esc(active.job.service)+' · '+active.job.m2+' m² previstos · '+active.bags+' sacos estimados.</p>';
if(!s.arrived)h+='<div class="kt-warning">Los domicilios son inventados. El botón de ruta abre únicamente el municipio; en producción utilizará la dirección verificada del expediente.</div>';
else{
h+='<div class="kt-inputs kt-two"><label>m² ejecutados<input id="ktM2" type="number" min="0.1" step="0.1" value="'+active.job.m2+'"></label><label>Sacos utilizados<input id="ktUsed" type="number" min="0" step="1" value="'+active.bags+'"></label></div>';
h+='<div class="kt-evidence"><label>Foto anterior<input id="ktBefore" type="file" accept="image/*"></label><label>Foto posterior<input id="ktAfter" type="file" accept="image/*"></label></div>';
h+='<button class="kt-secondary" id="ktFakePhotos">Usar fotos ficticias para probar</button><div class="kt-warning" id="ktEvidenceStatus">Las evidencias deben quedar vinculadas al expediente. Los archivos seleccionados no se suben en esta demo.</div><div id="ktError"></div><button class="kt-primary" id="ktFinish">Guardar parte y preparar siguiente ruta →</button>';
}
h+='</section>';
}
}
if(s.finished){
h+='<section class="kt-card"><span class="eyebrow">BALANCE AL TERMINAR</span><h2>Jornada técnica completada</h2><p>Sacos cargados: '+(s.baseBags+s.extraBags)+' · Consumidos: '+used+' · Sobrantes: '+remaining(s)+'.</p><button class="kt-secondary" id="ktRestart">Reiniciar prueba de esta cuadrilla</button></section>';
}
h+='<div class="kt-subtitle">INSTALACIONES ASIGNADAS</div>'+p.rows.map((x,i)=>row(x,i,s)).join('');
h+='<div class="kt-warning">Todo este recorrido utiliza clientes y materiales ficticios. La versión definitiva necesitará catálogo de productos, órdenes autorizadas, fotos almacenadas, validaciones y permisos de servidor.</div></div>';
return h;
}
function mount(ctx){
const s=state(ctx.role);
const byId=(id)=>document.getElementById(id);
const rerender=()=>ctx.rerender();
const ensureActive=()=>ctx.shift==='working';
if(byId('ktShift'))byId('ktShift').onclick=ctx.openShift;
for(const [id,key] of [['ktBag','bagKg'],['ktUse','kgPerM2'],['ktMargin','marginPct'],['ktSpare','spareBags']]){
const el=byId(id);if(el)el.onchange=()=>{const v=num(el.value);if(!Number.isFinite(v)||v<0||(key==='spareBags'&&(!Number.isInteger(v)||v>30))){ctx.toast('Introduce una cantidad válida');return}material[key]=v;rerender()};
}
if(byId('ktLoaded'))byId('ktLoaded').onclick=()=>{const p=plan(ctx);if(!ensureActive()||!p.valid||!p.rows.length)return ctx.toast('Comprueba jornada, órdenes y parámetros del material');s.baseBags=p.total;s.extraBags=material.spareBags;s.loaded=true;s.index=0;s.arrived=false;rerender();ctx.toast('Carga ficticia registrada, ruta preparada')};
if(byId('ktMap'))byId('ktMap').onclick=()=>{
 if(!s.loaded||!ensureActive())return;
 const j=plan(ctx).rows[s.index]?.job;if(!j)return;
 const destination=j.town+', Navarra, España';
 const href=/iPhone|iPad|iPod/i.test(navigator.userAgent)?'https://maps.apple.com/?daddr=':'https://www.google.com/maps/dir/?api=1&destination=';
 window.open(href+encodeURIComponent(destination),'_blank','noopener,noreferrer');
 ctx.toast('Ruta orientativa al municipio: domicilio ficticio');
};
if(byId('ktArrive'))byId('ktArrive').onclick=()=>{if(!ensureActive())return ctx.toast('Primero debes reanudar la jornada');s.arrived=true;rerender()};
if(byId('ktExtra'))byId('ktExtra').onclick=()=>{const entered=window.prompt('¿Cuántos sacos adicionales se han cargado? (demo)','2');if(entered===null)return;const n=num(entered);if(!Number.isInteger(n)||n<1||n>300)return ctx.toast('Introduce un número entero de 1 a 300');s.extraBags+=n;rerender()};
if(byId('ktBefore'))byId('ktBefore').onchange=function(){const j=plan(ctx).rows[s.index]?.job;if(!j)return;const e=s.evidence[j.id]||(s.evidence[j.id]={});e.before=this.files?.[0]?.name||'';if(byId('ktEvidenceStatus'))byId('ktEvidenceStatus').textContent='Anterior: '+(e.before||'pendiente')+' · Posterior: '+(e.after||'pendiente')};
if(byId('ktAfter'))byId('ktAfter').onchange=function(){const j=plan(ctx).rows[s.index]?.job;if(!j)return;const e=s.evidence[j.id]||(s.evidence[j.id]={});e.after=this.files?.[0]?.name||'';if(byId('ktEvidenceStatus'))byId('ktEvidenceStatus').textContent='Anterior: '+(e.before||'pendiente')+' · Posterior: '+(e.after||'pendiente')};
if(byId('ktFakePhotos'))byId('ktFakePhotos').onclick=()=>{const j=plan(ctx).rows[s.index]?.job;if(!j)return;s.evidence[j.id]={before:'Antes (ejemplo)',after:'Después (ejemplo)'};byId('ktEvidenceStatus').textContent='Dos imágenes de ejemplo registradas solo en la memoria de esta demo.'};
if(byId('ktFinish'))byId('ktFinish').onclick=()=>{
 const p=plan(ctx),cur=p.rows[s.index],j=cur?.job; if(!j||!ensureActive())return ctx.toast('Reanuda tu jornada para continuar');
 const m2=num(byId('ktM2').value),bags=num(byId('ktUsed').value),ev=s.evidence[j.id]||{};
 const errors=[];
 if(!Number.isFinite(m2)||m2<=0)errors.push('Introduce una superficie ejecutada válida');
 if(!Number.isInteger(bags)||bags<0)errors.push('Indica los sacos utilizados con un entero');
 if(!ev.before||!ev.after)errors.push('Faltan las dos fotografías de la obra');
 if(Number.isInteger(bags)&&bags>remaining(s))errors.push('No quedan tantos sacos cargados. Registra una reposición');
 if(errors.length){byId('ktError').innerHTML='<div class="kt-error">'+errors.map(esc).join(' · ')+'</div>';return}
 s.usage[j.id]={m2,bags};
 if(typeof ctx.onComplete==='function')ctx.onComplete(j,{m2,bags,before:ev.before,after:ev.after});
 s.index++;
 s.arrived=false;
 s.finished=s.index>=p.rows.length;
 rerender();
 ctx.toast(s.finished?'Obras ficticias cerradas. Material conciliado':'Parte registrado: siguiente ruta preparada');
};
if(byId('ktRestart'))byId('ktRestart').onclick=()=>{delete stateByRole[ctx.role];rerender()};
}
window.KonsorDemoTecnicos={html,mount,next,plan};
})();
