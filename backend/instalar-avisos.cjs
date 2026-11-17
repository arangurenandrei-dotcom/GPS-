'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const dir=path.resolve(process.argv[2]||'functions'),entry=path.join(dir,'index.js');
const live=fs.readFileSync(entry,'utf8');
const deps=[...live.matchAll(/require\(['"](\.\/[^'"]+)['"]\)/g)].map(m=>path.resolve(dir,m[1].endsWith('.js')?m[1]:m[1]+'.js'));
const files=[...new Set([entry,...deps])].filter(f=>fs.existsSync(f)&&fs.readFileSync(f,'utf8').includes('exports.revisarActividad='));
if(files.length!==1)throw Error('No se ha identificado un único motor activo de avisos.');
const file=files[0];
let source=fs.readFileSync(file,'utf8');
const moduleFile=path.join(dir,'rendimiento.js'),moduleSource=fs.readFileSync(path.join(__dirname,'rendimiento.js'),'utf8');
function replace(anchor,newText){
 if(source.split(anchor).length!==2)throw Error('No se reconoce el motor de avisos en '+file+' ('+anchor+'). No se han aplicado cambios.');
 source=source.replace(anchor,()=>newText);
}
if(!source.includes("require('./rendimiento')")){
 replace('for(const event of result.events)await enqueue(event);',`const extra=require('./rendimiento').extraEvents({zones,shifts});
  for(const event of [...result.events.filter(e=>!e.key.startsWith('evolution:')&&!e.key.startsWith('boss-evolution:')),...extra])await enqueue(event);`);
 replace('const r=doc.data();if(!r.enabled',`const r=doc.data();
   if(r.assignment && r.enabled && USERS.includes(r.to)){
    const context={reminderId:doc.id,person:r.to},version=doc.id+':'+r.updatedAt;
    await enqueue({to:r.to,key:'encargo:'+version,category:'zones',title:'Encargo de Andrei · '+r.title,body:r.body,context,createdAt:Date.now()});
    if(!r.confirmedAt && r.dueAt-Date.now()<=3600000)await enqueue({to:USERS[0],key:'sin-confirmar:'+version,category:'management',title:'Encargo sin confirmar · '+r.to,body:r.title,context,createdAt:Date.now()});
    continue;
   }
   if(!r.enabled`);
 replace('tx.set(ref,{title:v.title.trim()',`tx.set(ref,{assignment:me.boss && v.assignment===true,confirmedAt:null,completedAt:null,title:v.title.trim()`);
 source+=`
exports.actualizarEncargo=onCall({region:REGION},async request=>{
 const me=await identity(request),{id,action}=request.data||{};
 if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id)||!['confirm','complete'].includes(action))throw new HttpsError('invalid-argument','Encargo inválido.');
 const ref=db.doc('app_reminders/'+id);
 await db.runTransaction(async tx=>{
  const snap=await tx.get(ref),r=snap.data();
  if(!r?.assignment||r.to!==me.name)throw new HttpsError('permission-denied','Encargo ajeno.');
  if(r.completedAt||!r.enabled)return;
  const now=Date.now();
  tx.update(ref,action==='complete'?{confirmedAt:r.confirmedAt||now,completedAt:now,enabled:false}:{confirmedAt:r.confirmedAt||now});
 });
 return {ok:true};
});
`;
}
const tmp=file+'.avisos-candidate.cjs';
fs.writeFileSync(tmp,source);
try{cp.execFileSync(process.execPath,['--check',tmp]);cp.execFileSync(process.execPath,['--check',path.join(__dirname,'rendimiento.js')]);
 if(!fs.existsSync(file+'.antes-rendimiento'))fs.copyFileSync(file,file+'.antes-rendimiento');
 fs.writeFileSync(moduleFile,moduleSource);
 fs.renameSync(tmp,file);
}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
console.log('Motor de avisos preparado.');
