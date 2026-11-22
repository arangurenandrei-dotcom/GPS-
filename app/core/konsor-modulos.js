/*
 * KONSOR | Registro común de módulos y perfiles — versión inicial.
 *
 * No concede permisos: los autorizados se obtendrán del servidor. Esto
 * solo determina QUÉ opciones podrían representarse para un perfil.
 * La app comercial heredada todavía conserva su navegación y permisos.
 */
(function(root){
'use strict';
const modules=Object.freeze({
 inicio:{name:'Inicio',section:'común'},
 jornada:{name:'Mi jornada',section:'común'},
 mapa:{name:'Mapa y Catastro',section:'comercial'},
 captacion:{name:'Captación',section:'comercial'},
 oficina_comercial:{name:'Oficina comercial',section:'comercial'},
 resultados:{name:'Resultados',section:'comercial'},
 plan_comercial:{name:'Dirección comercial',section:'comercial'},
 ruta_tecnica:{name:'Rutas e instalaciones',section:'técnicos'},
 materiales:{name:'Material necesario',section:'técnicos'},
 partes:{name:'Partes, medidas y fotos',section:'técnicos'},
 gestion_tecnicos:{name:'Gestión de cuadrillas',section:'técnicos'},
 expedientes:{name:'Expedientes y tramitaciones',section:'oficina'},
 envio_cliente:{name:'Envíos al cliente',section:'oficina'},
 seguimiento_firmas:{name:'Seguimiento de firma',section:'oficina'},
 gestion_oficina:{name:'Dirección de Oficina',section:'oficina'},
 pagos:{name:'Seguimiento de remuneraciones',section:'administración'},
 gastos:{name:'Gastos de empresa',section:'administración'},
 anomalías:{name:'Incidencias de gastos',section:'administración'},
 gestion_administracion:{name:'Dirección de Administración',section:'administración'},
 finanzas:{name:'Situación económica',section:'dirección'},
 equipos:{name:'Departamentos y responsables',section:'dirección'},
 alertas:{name:'Avisos y tareas',section:'común'},
 remuneracion:{name:'Mi remuneración',section:'común'},
 edificio:{name:'Edificio KONSOR',section:'común'}
});
const roles=Object.freeze({
 comercial:{name:'Comercial',department:'comercial',items:['jornada','mapa','captacion','oficina_comercial','resultados','remuneracion']},
 jefe_equipo_comercial:{name:'Jefe de equipo comercial',department:'comercial',items:['jornada','mapa','captacion','oficina_comercial','resultados','plan_comercial','remuneracion']},
 jefe_planta_comercial:{name:'Responsable de Comercial',department:'comercial',items:['plan_comercial','resultados','mapa','oficina_comercial','remuneracion']},
 tecnico:{name:'Técnico',department:'técnicos',items:['jornada','ruta_tecnica','materiales','partes','remuneracion']},
 jefe_planta_tecnica:{name:'Responsable de Técnicos',department:'técnicos',items:['jornada','gestion_tecnicos','ruta_tecnica','partes','remuneracion']},
 oficina:{name:'Personal de Oficina',department:'oficina',items:['jornada','expedientes','envio_cliente','seguimiento_firmas','remuneracion']},
 jefe_planta_oficina:{name:'Responsable de Oficina',department:'oficina',items:['jornada','gestion_oficina','expedientes','envio_cliente','seguimiento_firmas','remuneracion']},
 administracion:{name:'Administración',department:'administración',items:['jornada','pagos','gastos','anomalías','remuneracion']},
 jefe_planta_administracion:{name:'Responsable de Administración',department:'administración',items:['gestion_administracion','pagos','gastos','anomalías','remuneracion']},
 ceo:{name:'Dirección general',department:'dirección',items:['finanzas','equipos','pagos','gastos','anomalías','remuneracion']}
});
const common=['inicio','alertas','edificio'];
function availableFor(assignedRoles){
 const selected=Array.isArray(assignedRoles)?assignedRoles:typeof assignedRoles==='string'?[assignedRoles]:[];
 const known=selected.filter(x=>Object.prototype.hasOwnProperty.call(roles,x));
 return known.length ? [...new Set([...common,...known.flatMap(x=>roles[x].items)])] : [];
}
function menuFor({assignedRoles=[],serverGrants=[],denied=[],suspended=false}={}){
 if(suspended)return [];
 const proposed=new Set(availableFor(assignedRoles));
 const grants=new Set(Array.isArray(serverGrants)?serverGrants:[]);
 const blocks=new Set(Array.isArray(denied)?denied:[]);
 // Sin confirmación del servidor: ningún módulo operativo habilitado.
 return [...proposed].filter(id=>grants.has(id)&&!blocks.has(id))
   .map(id=>({id,label:modules[id].name,section:modules[id].section}));
}
function demoPreview(role){
 return availableFor(role).map(id=>({id,label:modules[id].name,section:modules[id].section}));
}
const api=Object.freeze({modules,roles,availableFor,menuFor,demoPreview});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.KonsorModules=api;
})(typeof window!=='undefined'?window:undefined);
