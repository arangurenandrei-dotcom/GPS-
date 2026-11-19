/* Adaptador de las pantallas existentes a documentos independientes. */
(function () {
  'use strict';
  const groups = {
    comercial_custom_zones: ['zonas','fichas'], comercial_shifts: ['jornadas'],
    comercial_activity: ['actividad'], comercial_hot_lead_missions: ['misiones'],
    comercial_completed_towns: ['pueblos_completados'], comercial_user_profiles: ['alias_perfiles'],
    comercial_boss_tasks: ['tareas_jefe']
  };
  const path = d => d.col + '/' + d.id;
  const copy = v => JSON.parse(JSON.stringify(v));
  const keyFor = name => Object.keys(CANONICAL_USER_NAMES).find(k => CANONICAL_USER_NAMES[k]===name);
  const canonical = value => JSON.stringify(value, function(k,v){
    if(v && typeof v==='object' && !Array.isArray(v)) return Object.fromEntries(Object.keys(v).sort().map(key=>[key,v[key]]));
    return v;
  });
  let baseline = new Map(), revs = new Map(), townIds = new Map(), taskCallback;
  let tail=Promise.resolve(), pending=0, version=0, uid='', key='', ready=false, failed=false, reading=false;
  const live = () => ready && window.auth?.currentUser?.uid===uid;
  function flatten(group, rows) {
    const result=new Map();
    function add(col,id,datos,opts={}) {
      const item=copy({col,id:String(id),datos,...opts});
      if(result.has(path(item)))throw Error('Dos registros tienen el mismo identificador. Conserva la pantalla y revisa ambos.');
      result.set(path(item),item);
    }
    if(group==='comercial_custom_zones') for(const z of rows){
      const {clients=[],...datos}=z;
      if(datos.points) datos.points=datos.points.map(p=>({lat:p[0],lng:p[1]}));
      add('zonas',z.id,datos);
      clients.forEach((c,orden)=>{
        if(!c.clientUid)c.clientUid='f_'+crypto.randomUUID();
        const {clientUid,rev,...fields}=c;
        add('fichas',clientUid,fields,{zona:String(z.id),owner:keyFor(z.comercial),orden});
      });
    } else if(group==='comercial_user_profiles'){
      for(const [id,data] of Object.entries(rows))add('alias_perfiles',id,data);
    } else if(group==='comercial_completed_towns'){
      for(const nombre of rows){
        if(!townIds.has(nombre))townIds.set(nombre,'p_'+crypto.randomUUID());
        add('pueblos_completados',townIds.get(nombre),{nombre});
      }
    } else for(const row of rows) add(groups[group][0],row.id,row);
    return result;
  }
  function hydrate(docs) {
    const lists=Object.fromEntries(Object.keys(groups).map(k=>[k,[]]));
    lists.comercial_user_profiles={};
    const children=new Map();
    const sorted=docs.slice().sort((a,b)=>a.orden-b.orden || a.id.localeCompare(b.id));
    for(const d of sorted){
      if(!Number.isSafeInteger(d.rev)||d.rev<1||!d.datos)throw Error('Documento v2 sin datos o sin revisión: '+path(d));
      if(d.col==='fichas'){
        const c={...d.datos,clientUid:d.id,rev:d.rev};
        if(!children.has(d.zona))children.set(d.zona,[]);
        children.get(d.zona).push(c);
      }
    }
    for(const d of sorted){
      if(d.col==='zonas'){
        const z={...d.datos,clients:children.get(d.id)||[]};
        if(z.points) z.points=z.points.map(p=>[p.lat,p.lng]);
        lists.comercial_custom_zones.push(z);
      } else if(d.col==='pueblos_completados'){
        townIds.set(d.datos.nombre,d.id); lists.comercial_completed_towns.push(d.datos.nombre);
      } else if(d.col==='alias_perfiles')lists.comercial_user_profiles[d.id]=d.datos;
      else if(d.col!=='fichas'){
        const group=Object.keys(groups).find(k=>groups[k].includes(d.col));
        lists[group].push(d.datos);
      }
    }
    return lists;
  }
  function install(state,initial) {
    if(state.key!==key)throw Error('El perfil de la sesión ha cambiado. Vuelve a entrar.');
    const lists=hydrate(state.docs);
    const projected=new Map();
    for(const [group,rows] of Object.entries(lists))for(const [p,d] of flatten(group,rows))projected.set(p,d);
    baseline=projected; revs=new Map(state.docs.map(d=>[path(d),d.rev]));
    // Las fichas sin zona permanecen en Firebase. Nunca se borran por faltar en el mapa.
    const orphan=state.docs.filter(d=>d.col==='fichas'&&!projected.has(path(d))).length;
    if(initial && orphan)alert('Firebase contiene '+orphan+' ficha(s) sin zona visible. Se conservan y requieren revisión.');
    savedZones=lists.comercial_custom_zones; savedShifts=lists.comercial_shifts;
    hotLeadMissions=lists.comercial_hot_lead_missions; completedTowns=lists.comercial_completed_towns;
    activityLog=lists.comercial_activity; customUserProfiles=lists.comercial_user_profiles;
    bossPlanItems=lists.comercial_boss_tasks;
    if(taskCallback)taskCallback(bossPlanItems,false);
    if(!initial && map){renderAllSavedZones();updateShiftUI();updateHudLiveSalaryPill();}
  }
  let invalidate=0, checked=0, stopWatch;
  function draftKey(){return 'trabajo_pendiente_v2_'+uid;}
  async function open(userUid,userKey){
    if(ready && uid===userUid && key===userKey)return;
    uid=userUid;key=userKey;
    const draft=sessionStorage.getItem(draftKey());
    if(draft){
      const batch=JSON.parse(draft);
      try{
        await window.writeWorkV2(batch);
        sessionStorage.removeItem(draftKey());
      }catch(e){
        if(!['functions/aborted','functions/failed-precondition','functions/invalid-argument','functions/permission-denied'].includes(e.code))throw e;
        if(!confirm('Hay un cambio pendiente rechazado por Firebase. ¿Guardar una copia de ese cambio en este dispositivo y cargar la versión del servidor?')) throw e;
        const url=URL.createObjectURL(new Blob([draft],{type:'application/json'}));
        const a=document.createElement('a');a.href=url;a.download='cambio-pendiente-konsor.json';a.click();
        setTimeout(()=>URL.revokeObjectURL(url),60000);
        sessionStorage.removeItem(draftKey());
      }
    }
    const {data}=await window.readWorkV2({});
    if(window.auth.currentUser?.uid!==uid)throw Error('Sesión cerrada.');
    install(data,true);ready=true;failed=false;
    if(stopWatch)stopWatch();
    stopWatch=window.watchWorkV2(key.startsWith('mikel_')||key==='jefe_mikel'?'mikel':'andrei',
      ()=>{invalidate++;refresh();},()=>status('Actualización en directo interrumpida · vuelve a abrir la app'));
  }
  function status(message) {
    const el=document.getElementById('workSaveStatus');
    if(el){el.textContent=message;el.hidden=!message;}
  }
  async function save(group,rows){
    if(group==='comercial_completed_towns')for(const name of rows)if(!townIds.has(name)){
      const prefix=key==='jefe_mikel'?'pueblo|mikel|':'pueblo|';
      const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(prefix+name));
      townIds.set(name,'p_'+Array.from(new Uint8Array(hash)).map(n=>n.toString(16).padStart(2,'0')).join('').slice(0,20));
    }
    return saveGroups({[group]:rows});
  }
  function saveGroups(values){
    if(!live())return Promise.reject(Error('Inicia sesión y espera a que se carguen los datos.'));
    let target;
    const erase=new Set(Object.keys(values).filter(k=>k!=='comercial_activity').flatMap(k=>groups[k]));
    try{
      target=new Map();
      for(const [group,rows] of Object.entries(values))for(const [p,d] of flatten(group,rows))target.set(p,d);
    }catch(e){return Promise.reject(e);}
    pending++;version++;
    status('Guardando…');
    const job=tail.then(async()=>{
      if(!live())throw Error('La sesión ha cambiado.');
      if(failed)throw Error('Hay un guardado pendiente. Recarga para recuperar el cambio del servidor.');
      const changes=[];
      for(const [p,d] of target){
        if(canonical(d)!==canonical(baseline.get(p))) changes.push({...d,rev:revs.get(p)||0});
      }
      for(const [p,d] of baseline){
        if(erase.has(d.col)&&!target.has(p))changes.push({col:d.col,id:d.id,rev:revs.get(p),remove:true});
      }
      if(!changes.length)return;
      const batch={op:crypto.randomUUID(),changes};
      sessionStorage.setItem(draftKey(),JSON.stringify(batch));
      const {data}=await window.writeWorkV2(batch);
      if(data?.ok!==true||data.op!==batch.op)throw Error('Falta confirmación del servidor.');
      for(const c of changes){
        const p=path(c);
        if(c.remove){baseline.delete(p);revs.delete(p);}
        else {baseline.set(p,target.get(p));revs.set(p,c.rev+1);}
      }
      sessionStorage.removeItem(draftKey());
    });
    const tracked=job.then(()=>{if(pending===1)status('');},e=>{
      failed=true;status('Sin guardar · recarga para recuperar el cambio');throw e;
    }).finally(()=>{pending--;});
    tail=tracked.catch(()=>{});
    return tracked;
  }
  function idle(){
    return live()&&!pending&&!failed&&!isDrawingMode&&!isCropMode&&!isRoofMeasureMode&&
      !document.hidden&&!document.querySelector('.modal-overlay.active,.leaflet-popup,#drawingBanner.active');
  }
  async function refresh(){
    if(reading||!idle()||checked===invalidate)return;
    reading=true;const stamp=version, ticket=invalidate;
    try{
      const {data}=await window.readWorkV2({});
      if(idle()&&stamp===version){
        checked=ticket;
        if(data.docs.length!==revs.size||data.docs.some(d=>revs.get(path(d))!==d.rev))install(data,false);
        status('');
      }
    } catch(e){if(idle())status('Sin actualizar · comprueba la conexión');}
    finally{reading=false;}
  }
  window.addEventListener('focus',()=>{invalidate++;refresh();});
  document.addEventListener('visibilitychange',refresh);
  setInterval(refresh,2000);
  window.KonsorBridge={open,save,saveGroups,refresh,get busy(){return pending>0||failed;},
    watchTasks(cb){taskCallback=cb;cb(bossPlanItems,false);return ()=>{taskCallback=null;};}};
})();
