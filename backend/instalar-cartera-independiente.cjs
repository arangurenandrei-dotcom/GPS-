'use strict';
/* Instalador idempotente, con copia local. NO despliega ni escribe datos. */
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const cp=require('node:child_process');
const marker='// KONSOR_CARTERA_INDEPENDIENTE_V1';
const exportsCode=[
  marker,
  "exports.listarClientesAntiguos = require('./cartera-independiente').listarClientesAntiguos;",
  "exports.guardarClienteAntiguo = require('./cartera-independiente').guardarClienteAntiguo;",
  "exports.actualizarLlamadaClienteAntiguo = require('./cartera-independiente').actualizarLlamadaClienteAntiguo;"
].join('\n');
function install(target){
  if(!target)throw Error('Indica la carpeta functions.');
  const folder=path.resolve(target),indexPath=path.join(folder,'index.js');
  if(!fs.existsSync(indexPath))throw Error('No existe functions/index.js. No se ha cambiado nada.');
  const original=fs.readFileSync(indexPath,'utf8');
  const moduleSource=fs.readFileSync(path.join(__dirname,'cartera-independiente.js'),'utf8');
  const edited=original.includes(marker)?original:original+'\n'+exportsCode+'\n';
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'konsor-historicos-'));
  try{
    for(const [name,code] of [['index.js',edited],['cartera-independiente.js',moduleSource]]){
      const file=path.join(tmp,name);fs.writeFileSync(file,code);cp.execFileSync(process.execPath,['--check',file]);
    }
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
  const backup=path.join(folder,'.cartera-independiente-backup-'+Date.now());
  fs.mkdirSync(backup,{recursive:true});
  fs.copyFileSync(indexPath,path.join(backup,'index.js'));
  if(fs.existsSync(path.join(folder,'cartera-independiente.js')))
    fs.copyFileSync(path.join(folder,'cartera-independiente.js'),path.join(backup,'cartera-independiente.js'));
  fs.writeFileSync(indexPath,edited);
  fs.writeFileSync(path.join(folder,'cartera-independiente.js'),moduleSource);
  console.log('Funciones preparadas con copia anterior en '+backup);
  console.log('Pendiente desplegar 3 funciones. No se ha escrito en Firestore.');
}
if(require.main===module){try{install(process.argv[2]);}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={install};
