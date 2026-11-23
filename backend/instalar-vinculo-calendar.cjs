'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
function install(dir){
 if(!dir)throw Error('Indica la carpeta functions.');
 const base=path.resolve(dir),index=path.join(base,'index.js'),calendar=path.join(base,'calendario-konsor.js');
 if(!fs.existsSync(index)||!fs.existsSync(calendar))throw Error('Faltan los módulos originales. No se ha modificado nada.');
 const oldIndex=fs.readFileSync(index,'utf8'),oldCalendar=fs.readFileSync(calendar,'utf8');
 const marker='// VINCULO_CALENDAR_VERIFICADO_V1';
 const nextIndex=oldIndex.includes(marker)?oldIndex:oldIndex+'\n'+marker+"\nexports.vincularObraExistenteKonsor = require('./vincular-obra-existente').vincularObraExistenteKonsor;\n";
 let nextCalendar=oldCalendar;
 if(!/module\.exports\s*=\s*\{[^}]*\bCALENDAR_ID\b[^}]*\}/s.test(oldCalendar)){
  const match=/module\.exports\s*=\s*\{([^}]*)\}\s*;?/.exec(oldCalendar);
  if(!match||!/\bcomprobarHueco\b/.test(match[1])||!/const\s+CALENDAR_ID\s*=/.test(oldCalendar))
   throw Error('Exportación del calendario no reconocida. No se ha modificado nada.');
  const args=match[1].trim().replace(/,\s*$/,'');
  nextCalendar=oldCalendar.replace(match[0],'module.exports = {'+args+', CALENDAR_ID};');
 }
 const one='vincular-obra-existente.js',two='historicos-core.js';
 const candidates={'index.js':nextIndex,'calendario-konsor.js':nextCalendar,
  [one]:fs.readFileSync(path.join(__dirname,one),'utf8'),
  [two]:fs.readFileSync(path.join(__dirname,two),'utf8')};
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'konsor-enlace-'));
 try{
  for(const [name,code] of Object.entries(candidates)){
   const p=path.join(temp,name);fs.writeFileSync(p,code);cp.execFileSync(process.execPath,['--check',p]);
  }
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
 const backup=path.join(base,'.vinculo-calendar-backup-'+Date.now());fs.mkdirSync(backup,{recursive:true});
 for(const name of Object.keys(candidates)){
  const old=path.join(base,name);if(fs.existsSync(old))fs.copyFileSync(old,path.join(backup,name));
 }
 for(const [name,code] of Object.entries(candidates))fs.writeFileSync(path.join(base,name),code);
 console.log('Función preparada. Copia de seguridad: '+backup);
 console.log('No se ha desplegado nada ni modificado Calendar o Firestore.');
}
if(require.main===module){try{install(process.argv[2]);}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={install};
