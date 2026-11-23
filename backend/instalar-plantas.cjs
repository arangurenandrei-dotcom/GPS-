'use strict';
/* Instalador idempotente para Cloud Functions de plantas KONSOR.
 * No despliega ni modifica datos. Verifica sintaxis y respalda index.js.
 */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
function install(folder){
 const dir=path.resolve(folder||'functions'),entry=path.join(dir,'index.js');
 if(!fs.existsSync(entry))throw Error('No existe functions/index.js.');
 const source=fs.readFileSync(entry,'utf8');
 const target=path.join(dir,'plantas-konsor.js');
 const code=fs.readFileSync(path.join(__dirname,'plantas-konsor.js'),'utf8');
 const names=['crearMensajePlantaKonsor','listarMensajesPlantaKonsor','actualizarMensajePlantaKonsor',
 'configurarMargenesPlantaKonsor','automatizarFichaPlantasKonsor','escalarPendientesPlantasKonsor'];
 const marker='// KONSOR_PLANTAS_V1';
 let next=source;
 if(!source.includes(marker)){
  if(names.some(name=>new RegExp('exports\\.'+name+'\\s*=').test(source)))
   throw Error('Hay funciones de plantas sin marcador. Revisión manual obligatoria.');
  next+='\n'+marker+'\n'+names.map(name=>'exports.'+name+" = require('./plantas-konsor')."+name+';').join('\n')+'\n';
 }
 const temp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'konsor-plantas-'));
 try{
  for(const [filename,src] of [['index.js',next],['plantas-konsor.js',code]]){
   const file=path.join(temp,filename);fs.writeFileSync(file,src);
   cp.execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
  }
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
 if(next===source&&fs.existsSync(target)&&fs.readFileSync(target,'utf8')===code)return {changed:false,functions:names};
 const backup=path.join(dir,'.backup-plantas-'+Date.now());fs.mkdirSync(backup);
 fs.copyFileSync(entry,path.join(backup,'index.js'));
 if(fs.existsSync(target))fs.copyFileSync(target,path.join(backup,'plantas-konsor.js'));
 fs.writeFileSync(target,code);fs.writeFileSync(entry,next);
 return {changed:true,backup,functions:names};
}
if(require.main===module){try{console.log(JSON.stringify(install(process.argv[2]),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={install};
