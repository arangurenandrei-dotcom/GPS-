/* KONSOR · Importador territorial CSV v1. No importa sin confirmación ni crea geografía automáticamente. */
(function(){
'use strict';
const baseKey='konsor_import_csv_draft_v1';
const norm=s=>String(s||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const schema=['localidad','sector','calle','numero','nombre','telefono','respuesta','comercial','observaciones','origen_hoja'];
function csvParse(src){
 const text=String(src||'').replace(/^\uFEFF/,'');const first=text.split(/\r?\n/,1)[0];
 const delim=[';',',','\t'].sort((a,b)=>first.split(b).length-first.split(a).length)[0];
 const out=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
  else if(c===delim&&!quoted){row.push(field);field='';}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))out.push(row);row=[];field='';}
  else field+=c;
 }
 if(quoted)throw Error('El CSV contiene comillas sin cerrar.');
 row.push(field);if(row.some(v=>v.trim()))out.push(row);
 if(out.length<2)throw Error('El archivo no contiene registros.');
 const head=out.shift().map(norm), aliases={localidad:['pueblo','municipio'],sector:['sector_id','ficha','numero_sector'],calle:['direccion','street'],numero:['portal','número','num'],nombre:['cliente','name'],telefono:['teléfono','movil','móvil','phone'],respuesta:['estado','resultado','si_no'],comercial:['responsable','agente'],observaciones:['notas','indicaciones'],origen_hoja:['hoja','origen','foto']};
 const columns=schema.map(k=>head.findIndex(h=>h===norm(k)||(aliases[k]||[]).some(a=>norm(a)===h)));
 for(const required of ['localidad','sector','calle','respuesta'])if(columns[schema.indexOf(required)]<0)throw Error('Falta la columna obligatoria: '+required);
 if(out.length>1500)throw Error('Límite de seguridad: 1500 registros por archivo.');
 const records=out.map((cells,i)=>{const item={line:i+2};schema.forEach((k,j)=>item[k]=columns[j]>=0?String(cells[columns[j]]||'').trim():'');return item;});
 return records;
}
function response(v){
 const x=norm(v);if(['si','sí','interesado','positivo'].includes(x))return 'si';
 if(['no','negativo','no interesado'].includes(x))return 'no';
 if(['ausente','no estaba','no contesta'].includes(x))return 'ausente';
 if(['papelito','aviso','nota dejada'].includes(x))return 'papelito';
 return null;
}
function groups(rows){const m=new Map();rows.forEach((r,i)=>{const id=norm(r.localidad)+'|'+norm(r.sector);if(!m.has(id))m.set(id,{id,town:r.localidad,sector:r.sector,rows:[],target:''});m.get(id).rows.push({...r,index:i});});return [...m.values()];}
function fingerprint(r){return [r.localidad,r.sector,r.calle,r.numero,r.nombre,r.telefono,r.origen_hoja].map(norm).join('|');}
function getDraft(key){try{return JSON.parse(sessionStorage.getItem(key)||'null')}catch{return null}}
function setDraft(key,d){sessionStorage.setItem(key,JSON.stringify(d))}
window.konsorImportCsvWizard=function(api){
 if(!api||typeof api.snapshot!=='function')throw Error('Falta integración territorial de KONSOR');
 const storageKey=baseKey+'_'+String(api.sessionKey||'default').replace(/[^a-zA-Z0-9_-]/g,'_');
 const previous=document.getElementById('konsor-csv-wizard');if(previous)previous.remove();
 let draft=getDraft(storageKey)||{rows:[],verified:false,assign:{},filename:''};
 const overlay=document.createElement('div');overlay.id='konsor-csv-wizard';
 overlay.style.cssText='position:fixed;inset:0;z-index:2147483400;background:#10203966;backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:14px';
 const root=document.createElement('section');
 root.style.cssText='width:min(100%,700px);max-height:93dvh;overflow:auto;border-radius:26px;background:#f5f7fa;color:#243447;padding:22px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 30px 80px #15233955';
 overlay.append(root);document.body.append(overlay);
 const style=document.createElement('style');style.textContent='#konsor-csv-wizard h2{font-size:24px;letter-spacing:-.5px;margin:8px 0}#konsor-csv-wizard p{font-size:13px;color:#68788c;line-height:1.5}#konsor-csv-wizard button,#konsor-csv-wizard select,#konsor-csv-wizard input{font:inherit;font-size:14px}#konsor-csv-wizard button{min-height:43px;border-radius:13px;border:1px solid #dfe5ee;background:#fff;color:#273952;padding:8px 13px;cursor:pointer}#konsor-csv-wizard button.primary{background:#273b52;color:#fff;border-color:#273b52}#konsor-csv-wizard button:disabled{opacity:.45;cursor:not-allowed}#konsor-csv-wizard .card{border:1px solid #e2e6ed;border-radius:17px;background:#fff;padding:15px;margin:11px 0}#konsor-csv-wizard .line{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}#konsor-csv-wizard select{width:100%;padding:10px;background:#f9fafc;color:#243447;border:1px solid #dce3ec;border-radius:11px}#konsor-csv-wizard .muted{font-size:12px;color:#75859a}#konsor-csv-wizard .warn{color:#ac5a19}#konsor-csv-wizard .good{color:#157653}#konsor-csv-wizard .controls{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}';
 overlay.append(style);
 function close(){overlay.remove();}
 function save(){setDraft(storageKey,draft)}
 function btn(label,fn,primary=false){const b=document.createElement('button');b.textContent=label;if(primary)b.className='primary';b.onclick=fn;return b;}
 function note(parent,msg,cls=''){const p=document.createElement('p');p.textContent=msg;if(cls)p.className=cls;parent.append(p);}
 function render(){
  root.replaceChildren();
  const title=document.createElement('div');title.className='line';title.innerHTML='<div><div class="muted">KONSOR · IMPORTACIÓN GUIADA</div><h2>Importar fichas</h2></div>';
  title.append(btn('Cerrar',close));root.append(title);
  if(!draft.rows.length){
   note(root,'Sube un CSV generado a partir de las hojas de captación. Primero se revisará: no se guardará ningún cliente automáticamente.');
   const box=document.createElement('div');box.className='card';const file=document.createElement('input');file.type='file';file.accept='.csv,text/csv,text/plain';box.append(file);
   file.onchange=async()=>{try{const f=file.files[0];if(!f)return;if(f.size>2e6)throw Error('Archivo demasiado grande (máximo 2 MB).');const rows=csvParse(await f.text());draft={rows,verified:false,assign:{},filename:f.name};save();render();}catch(e){alert(e.message)}};
   root.append(box);note(root,'Columnas: localidad, sector, calle, numero, nombre, telefono, respuesta, comercial, observaciones y origen_hoja. Obligatorias: localidad, sector, calle y respuesta.');
   const sample=btn('Descargar plantilla CSV',()=>{const blob=new Blob(['\uFEFF'+schema.join(';')+'\r\n'],{type:'text/csv;charset=utf-8'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='konsor-plantilla-captacion.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),3000)});root.append(sample);return;
  }
  const gs=groups(draft.rows),towns=[...new Set(gs.map(g=>norm(g.town)))];
  const summary=document.createElement('div');summary.className='card';summary.innerHTML='<b>'+draft.rows.length+' registros · '+gs.length+' sectores · '+towns.length+' pueblos</b><p>'+html(draft.filename)+'</p>';
  root.append(summary);
  const faults=draft.rows.filter(r=>!r.localidad||!r.sector||!r.calle||!response(r.respuesta));
  const duplicate=new Set();let dupes=0;draft.rows.forEach(r=>{const id=fingerprint(r);if(duplicate.has(id))dupes++;duplicate.add(id)});
  if(faults.length)note(root,faults.length+' registros con datos obligatorios vacíos o respuesta no reconocida. Corrige el CSV y vuelve a cargarlo.','warn');
  if(dupes)note(root,dupes+' posibles duplicados dentro del archivo. Revisa antes de guardar.','warn');
  const snap=api.snapshot();const polygons=snap.towns||[],zones=snap.zones||[];
  function findTown(t){return api.requireTownBoundary===false?{nombre:t}:polygons.find(p=>norm(p.nombre)===norm(t)&&Array.isArray(p.points)&&p.points.length>=3)}
  // Sugerir asignación automática solo cuando sector + pueblo coinciden de manera inequívoca.
  const chosenIds=new Set(Object.values(draft.assign||{}).filter(Boolean).map(String));
  for(const g of gs){
   if(draft.assign[g.id])continue;
   const candidates=zones.filter(z=>!z.isSingleHouse&&!z.isNoAptoZone&&
     norm(z.parentTown||z.town)===norm(g.town)&&norm(z.sectorName)===norm(g.sector)&&!chosenIds.has(String(z.id)));
   if(candidates.length===1){
    draft.assign[g.id]=String(candidates[0].id);chosenIds.add(String(candidates[0].id));save();
   }
  }
  const unresolved=gs.filter(g=>!findTown(g.town));
  const missing=gs.filter(g=>!zones.some(z=>!z.isSingleHouse&&!z.isNoAptoZone&&norm(z.parentTown||z.town)===norm(g.town)&&norm(z.sectorName)===norm(draft.assign[g.id]||g.sector)));
  const h=document.createElement('h3');h.textContent='1 · Comprobar pueblos y sectores';root.append(h);
  for(const town of [...new Set(gs.map(g=>g.town))]){
   const card=document.createElement('div');card.className='card';
   const tGroups=gs.filter(g=>norm(g.town)===norm(town));
   const ok=!!findTown(town);
   const line=document.createElement('div');line.className='line';line.innerHTML='<b>'+html(town)+'</b><span class="'+(ok?'good':'warn')+'">'+(ok?'Perímetro confirmado':'Falta delimitar')+'</span>';card.append(line);
   note(card,tGroups.length+' sector(es) · '+tGroups.reduce((n,g)=>n+g.rows.length,0)+' registros');
   if(!ok){card.append(btn('Dibujar pueblo en el mapa',()=>{save();close();api.drawTown(town)}));}
   for(const g of tGroups){
    const block=document.createElement('div');block.style.cssText='border-top:1px solid #e5eaf0;padding:10px 0';
    const label=document.createElement('b');label.textContent=g.sector+' · '+g.rows.length+' registros';block.append(label);
    const candidates=zones.filter(z=>!z.isSingleHouse&&!z.isNoAptoZone&&norm(z.parentTown||z.town)===norm(town));
    const sel=document.createElement('select');sel.innerHTML='<option value="">Selecciona el sector dibujado</option>';
    candidates.forEach(z=>{const option=document.createElement('option');option.value=String(z.id);option.textContent=z.sectorName+' · '+(z.comercial||'Sin responsable');sel.append(option)});
    const chosen=draft.assign[g.id];const matched=candidates.find(z=>String(z.id)===String(chosen));if(matched)sel.value=String(matched.id);
    sel.onchange=()=>{draft.assign[g.id]=sel.value;draft.verified=false;save();render()};block.append(sel);
    if(ok&&!candidates.length)block.append(btn('Dibujar sector',()=>{save();close();api.drawSector(town)}));
    card.append(block);
   }
   root.append(card);
  }
  const assigned=gs.every(g=>{const z=zones.find(z=>String(z.id)===String(draft.assign[g.id]));return z&&!z.isSingleHouse&&norm(z.parentTown||z.town)===norm(g.town)});
  const uniqueAssignments=new Set(gs.map(g=>String(draft.assign[g.id]||''))).size===gs.length;
  const ready=!faults.length&&!dupes&&!unresolved.length&&assigned&&uniqueAssignments&&!!snap.canCommit;
  const review=document.createElement('div');review.className='card';const mark=document.createElement('label');mark.style.cssText='display:flex;align-items:center;gap:10px;font-size:14px';
  const check=document.createElement('input');check.type='checkbox';check.checked=!!draft.verified;check.disabled=!ready;check.onchange=()=>{draft.verified=check.checked;save();render()};mark.append(check,document.createTextNode('He comprobado todas las fichas y la asignación de sectores.'));review.append(mark);
  const done=document.createElement('label');done.style.cssText='display:flex;align-items:flex-start;gap:10px;font-size:13px;margin-top:14px;color:#52637a';
  const complete=document.createElement('input');complete.type='checkbox';complete.checked=!!draft.completeSectors;
  complete.onchange=()=>{draft.completeSectors=complete.checked;save();};
  done.append(complete,document.createTextNode('Este CSV incluye todas las fichas de los sectores seleccionados. Después de guardar, marcar el volcado de esos sectores como finalizado.'));
  review.append(done);
  note(review,'Deja esta casilla sin marcar si solo estás importando una parte de las hojas. Ningún sector se cerrará automáticamente sin tu confirmación.');
  if(!snap.canCommit)note(review,'Este usuario no tiene sectores autorizados para guardar este archivo. Revisa que las fichas pertenezcan a su equipo y sector.');
  else if(!ready)note(review,uniqueAssignments?'Para guardar, corrige los errores, delimita los pueblos y selecciona todos los sectores.':'No puedes asociar dos fichas de sector distintas al mismo sector dibujado.');
  const actions=document.createElement('div');actions.className='controls';
  actions.append(btn('Cambiar archivo',()=>{if(!confirm('¿Descartar esta revisión?'))return;sessionStorage.removeItem(storageKey);draft={rows:[],verified:false,assign:{},filename:''};render()}));
  const commit=btn('Guardar fichas confirmadas',async()=>{commit.disabled=true;try{const result=await api.commit(draft.rows,gs,draft.assign,{complete:!!draft.completeSectors});sessionStorage.removeItem(storageKey);alert('Importación finalizada: '+result+' registros incorporados a sus sectores.');close();}catch(e){alert('No se han confirmado todos los datos: '+e.message);commit.disabled=false}},true);
  commit.disabled=!ready||!draft.verified;actions.append(commit);review.append(actions);root.append(review);
 }
 render();
};
})();