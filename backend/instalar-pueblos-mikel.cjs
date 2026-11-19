'use strict';
// Parchar las Cloud Functions territoriales existentes sin alterar las demás.
// Ejecutar: node instalar-pueblos-mikel.cjs ~/konsor-despliegue-final/functions
const fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(process.argv[2]||'functions');
const file=path.join(dir,'persistencia.js');
if(!fs.existsSync(file))throw Error('No existe '+file);
let s=fs.readFileSync(file,'utf8');
const stamp='/* KONSOR pueblos multi-equipo v1 */';
if(s.includes(stamp)){console.log('Los permisos de pueblos por equipo ya están instalados.');process.exit(0);}
const first=s.indexOf('exports.leerPerimetrosPueblo = onCall(');
const second=s.indexOf('exports.guardarPerimetroPueblo = onCall(');
if(first<0||second<first)throw Error('No se han localizado ambas funciones de pueblos. No se ha modificado nada.');
let end=s.indexOf('\nexports.',second+12);if(end<0)end=s.length;
let a=s.slice(first,second),b=s.slice(second,end);
function once(source,old,replacement,label){
 const parts=source.split(old);
 if(parts.length!==2)throw Error('No coincide el código de '+label+'. No se ha modificado el archivo.');
 return parts.join(replacement);
}
const auth="requireAccess(u?.estado === 'aprobado' && u.userKey === 'jefe');";
const authNew="requireAccess(u?.estado === 'aprobado' && ['jefe','jefe_mikel'].includes(u.userKey));\n  const teamId = u.userKey === 'jefe_mikel' ? 'mikel' : 'andrei';";
a=once(a,auth,authNew,'permisos de lectura');
b=once(b,auth,authNew,'permisos de escritura');
a=once(a,".where('teamId', '==', 'andrei')",".where('teamId', '==', teamId)",'consulta territorial');
b=once(b,"sha('andrei|' + clave)","sha(teamId + '|' + clave)",'identificador por equipo');
b=once(b,"teamId:'andrei',","teamId,",'escritura territorial');
const next=s.slice(0,first)+stamp+'\n'+a+b+s.slice(end);
const backup=file+'.backup-konsor-pueblos';
if(!fs.existsSync(backup))fs.writeFileSync(backup,s);
fs.writeFileSync(file,next);
console.log('Pueblos preparados con permisos independientes para Andrei y Mikel.');
console.log('Copia de seguridad:',backup);
console.log('Comprueba sintaxis con: node --check '+file);
console.log('Despliega: firebase deploy --only functions:leerPerimetrosPueblo,functions:guardarPerimetroPueblo --project gestion-comercial-navarr-3b028');
