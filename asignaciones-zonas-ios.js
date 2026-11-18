/* Confirmación sincronizada de asignación de zonas.
   Recibida ≠ terminada. Solo el comercial asignado puede confirmar. */
(function(){
"use strict";
function permitted(z){
 return !!z&&typeof currentUserName==="string"&&z.comercial===currentUserName&&currentUserRole!=="jefe";
}
function find(zoneId){
 if(!Array.isArray(savedZones))return null;
 const idx=savedZones.findIndex(z=>z&&String(z.id)===String(zoneId));
 return idx<0?null:{idx,z:savedZones[idx]};
}
function currentState(zoneId){
 const info=find(zoneId);
 if(!info)return null;
 const z=info.z;
 return{zoneId:z.id,town:z.town||"",street:z.sectorName||"",owner:z.comercial,created:z.date||"",
   receivedAt:Number(z.assignmentReceivedAt)||0,receivedBy:z.assignmentReceivedBy||"",
   complete:z.status==="completada",status:z.status||"sin_comprobar",bossNote:z.bossNote||""};
}
async function acknowledge(zoneId){
 const item=find(zoneId);if(!item)throw Error("Esta zona ya no está disponible. Actualiza el listado.");
 const z=item.z;if(!permitted(z))throw Error("Solo el comercial responsable puede confirmar esta zona.");
 if(z.assignmentReceivedAt&&z.assignmentReceivedBy===currentUserName)return currentState(zoneId);
 if(!window.KonsorBridge||window.KonsorBridge.busy)throw Error("Hay un guardado en curso. Comprueba la conexión y vuelve a intentarlo.");
 const candidate=JSON.parse(JSON.stringify(savedZones));
 const target=candidate[item.idx];target.assignmentReceivedAt=Date.now();target.assignmentReceivedBy=currentUserName;
 // No se cambia el estado de la zona: puede seguir por hacer.
 await window.KonsorBridge.save("comercial_custom_zones",candidate);
 savedZones=candidate;
 if(typeof window.cnvRefreshHome==="function")window.cnvRefreshHome();
 if(typeof window.refreshCnTerritory==="function")window.refreshCnTerritory();
 return currentState(zoneId);
}
function openZone(zoneId,showMap=false){
 const item=find(zoneId);if(!item)throw Error("No se encuentra esa zona.");
 if(showMap&&typeof focusMapOnTownOrZone==="function"){focusMapOnTownOrZone(item.z.town,item.idx);return;}
 if(typeof openDumpModal!=="function")throw Error("El visor de zonas aún no está disponible.");
 openDumpModal(item.idx);
}
window.konsorZoneAssignment={get:currentState,acknowledge,open:openZone};
})();