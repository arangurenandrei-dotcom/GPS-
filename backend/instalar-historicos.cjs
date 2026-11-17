'use strict';
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const os=require('node:os');
function patch(source){
 if(source.includes('HISTORICOS_KONSOR_V1'))return source;
 const replace=(a,b)=>{if(source.split(a).length!==2)throw Error('El servidor no coincide con la versión revisada: '+a.slice(0,65));source=source.replace(a,b);};
 replace("const { comprobarHueco } = require('./calendario-konsor');", "const { comprobarHueco } = require('./calendario-konsor');\n// HISTORICOS_KONSOR_V1\nconst { verificarReservaHistorica } = require('./historicos-konsor');");
 replace('  const pendientes = new Map();','  const pendientes = new Map();\n  const historicosVerificados = new Map();');
 replace('    if (!mismaReserva) {',`    if (!anteriorDoc && datos.importadoHistorico === true) {
      requireAccess(userKey === 'jefe');
      if (!datos.crmKonsorEventId) fail('failed-precondition','Verifica primero la cita histórica en KONSOR.');
      const verified = await verificarReservaHistorica(datos);
      historicosVerificados.set(cambio.id, verified);
      continue;
    }
    if (!mismaReserva) {`);
 replace('      const data = c.datos;',`      const data = c.datos;
      if (c.col === 'fichas' && data && typeof data === 'object') {
        if (!prev && data.importadoHistorico === true) requireAccess(me.key === 'jefe');
        if (!prev && data.crmKonsorEventId && !historicosVerificados.has(c.id))
          fail('failed-precondition','Vínculo KONSOR sin verificar.');
        if (prev) {
          for (const key of ['crmKonsorEventId','crmKonsorEventKey','crmKonsorVerifiedAt','crmKonsorEtag']) {
            if (JSON.stringify(data[key]) !== JSON.stringify(prev.datos?.[key]))
              fail('permission-denied','El vínculo histórico no se puede cambiar desde la ficha.');
          }
        }
        const verified = historicosVerificados.get(c.id);
        if (verified) {
          requireAccess(me.key === 'jefe' && !prev);
          data.crmKonsorEventId = verified.eventId;
          data.crmKonsorEventKey = verified.eventKey;
          data.crmKonsorEtag = verified.etag;
          data.crmKonsorVerifiedAt = now;
        }
      }`);
 replace("    for (const [path,c] of changes) if (c.col==='fichas'){",`    // Leer todas las reclamaciones antes de efectuar cualquier escritura.
    const historicalClaims=[];
    const claimedInBatch=new Set();
    for(const [id,verified] of historicosVerificados){
      const ref=db.doc('vinculos_konsor/'+verified.eventKey);
      const claim=(await tx.get(ref)).data();
      if(claim || claimedInBatch.has(verified.eventKey))
        fail('already-exists','La cita KONSOR ya está vinculada. Recarga y revisa.');
      claimedInBatch.add(verified.eventKey);
      const data=next.get('fichas/'+id);
      requireAccess(data && data.teamId==='andrei');
      const parentPath='zonas/'+data.zonaId;
      const parent=next.has(parentPath)?next.get(parentPath):(await tx.get(db.doc(parentPath))).data();
      requireAccess(parent && data.datos.crmKonsorTown===parent.datos.town);
      historicalClaims.push([ref,{fichaId:id,eventId:verified.eventId,teamId:'andrei',createdAt:now,createdByUid:uid}]);
    }
    for (const [path,c] of changes) if (c.col==='fichas'){`);
 replace('    for(const [ref,d] of reservations)tx.set(ref,d);','    for(const [ref,d] of reservations)tx.set(ref,d);\n    for(const [ref,d] of historicalClaims)tx.create(ref,d);');
 return source;
}
function install(dir){
 const base=path.resolve(dir),names=['persistencia.js','calendario-konsor.js','index.js','operaciones-v2.js'];
 const original=Object.fromEntries(names.map(n=>[n,fs.readFileSync(path.join(base,n),'utf8')]));
 let calendar=original['calendario-konsor.js'];
 if(!/module\.exports\s*=\s*\{comprobarHueco(?:,\s*CALENDAR_ID)?\};/.test(calendar))throw Error('Exportación del calendario inesperada. No se ha modificado nada.');
 calendar=calendar.replace(/module\.exports\s*=\s*\{comprobarHueco(?:,\s*CALENDAR_ID)?\};/,'module.exports = {comprobarHueco, CALENDAR_ID};');
 const marker="exports.verificarHistoricoKonsor = require('./historicos-konsor').verificarHistoricoKonsor;";
 let operations=original['operaciones-v2.js'];
 if(!operations.includes('// HISTORICOS_PROTECTED_V1')){
  const anchor='        obraAgendadaEn,\n        ...camposSeguros';
  if(operations.split(anchor).length!==2)throw Error('La función antigua de edición no coincide con la versión revisada.');
  operations=operations.replace(anchor,'        obraAgendadaEn,\n        // HISTORICOS_PROTECTED_V1\n        crmKonsorEventId, crmKonsorEventKey, crmKonsorVerifiedAt, crmKonsorEtag, crmKonsorTown, importadoHistorico,\n        ...camposSeguros');
 }
 const files={...original,'operaciones-v2.js':operations,'persistencia.js':patch(original['persistencia.js']),'calendario-konsor.js':calendar,'index.js':original['index.js'].includes(marker)?original['index.js']:original['index.js']+'\n'+marker+'\n'};
 for(const n of ['historicos-core.js','historicos-konsor.js'])files[n]=fs.readFileSync(path.join(__dirname,n),'utf8');
 const staging=fs.mkdtempSync(path.join(os.tmpdir(),'konsor-validacion-'));
 try{for(const [n,s] of Object.entries(files)){const p=path.join(staging,n);fs.writeFileSync(p,s);cp.execFileSync(process.execPath,['--check',p]);}}finally{fs.rmSync(staging,{recursive:true});}
 // Solo después de verificar anclas y sintaxis se crean las copias y se instala.
 const backup=path.join(base,'.historicos-backup-'+Date.now());fs.mkdirSync(backup);
 for(const n of Object.keys(files))if(fs.existsSync(path.join(base,n)))fs.copyFileSync(path.join(base,n),path.join(backup,n));
 for(const [n,s] of Object.entries(files))fs.writeFileSync(path.join(base,n),s);
 console.log('Instalación local verificada. Copia anterior: '+backup);
 console.log('No se han desplegado funciones ni modificado eventos o datos de clientes.');
}
if(require.main===module){try{if(!process.argv[2])throw Error('Indica la carpeta functions.');install(process.argv[2]);}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={patch,install};
