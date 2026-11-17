'use strict';
const FRANJAS={'09:00':[540,660],'11:00':[660,780],'15:00':[900,1020],'17:00':[1020,1140]};
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const phone=v=>String(v||'').replace(/\D/g,'').replace(/^(0034|34)(?=\d{9}$)/,'');
function local(value){
 const time=Date.parse(value);if(!Number.isFinite(time))return null;
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(time)).map(p=>[p.type,p.value]));
 return {date:`${parts.year}-${parts.month}-${parts.day}`,minute:Number(parts.hour)*60+Number(parts.minute)};
}
function validate(data){
 if(!data||typeof data!=='object')throw Error('Datos históricos inválidos.');
 const date=data.obraDate,time=String(data.obraTime||'').slice(0,5),team=Number(data.obraEquipoInstalacion);
 const ms=Date.parse(date+'T12:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==date||!Object.hasOwn(FRANJAS,time)||![2,3].includes(team))throw Error('Fecha, franja o equipo inválidos.');
 if(!String(data.crmOrigenId||'').trim()||String(data.crmOrigenId).length>100||phone(data.phone).length!==9||!norm(data.street)||!norm(data.crmKonsorTown))throw Error('Faltan ID original, teléfono o dirección completa.');
 return {date,time,team};
}
function overlaps(event,input){
 if(event.status==='cancelled'||event.transparency==='transparent')return false;
 const match=String(event.summary||'').match(/\bequipo\s*[-#:º]*\s*([23])\b/i);
 if(Number(match?.[1])!==input.team)return false;
 if(event.start?.date&&event.end?.date)return event.start.date<=input.date&&input.date<event.end.date;
 const start=local(event.start?.dateTime),end=local(event.end?.dateTime);
 if(!start||!end||start.date>input.date||end.date<input.date)return false;
 const a=start.date<input.date?0:start.minute,b=end.date>input.date?1440:end.minute;
 const [from,to]=FRANJAS[input.time];return a<to&&b>from;
}
function sameClient(event,data){
 const id=String(data.crmOrigenId||'').trim();
 const props={...event.extendedProperties?.shared,...event.extendedProperties?.private};
 if(['crmOrigenId','euroAislaId','externalId'].some(k=>String(props[k]||'').trim()===id))return true;
 // Un ID solo identifica al cliente si aparece etiquetado, nunca por una subcadena.
 const fields=String(event.description||'').split(/[\r\n]+/);
 if(fields.some(line=>/^(?:id(?: euro aisla)?|referencia|ref|crmOrigenId)\s*[:#=]\s*/i.test(line.trim())&&line.trim().replace(/^[^:#=]+[:#=]\s*/,'').trim()===id))return true;
 const tel=phone(data.phone);
 const text=String(event.summary||'')+'\n'+String(event.description||'');
 const numbers=text.match(/(?:\+?34[ .-]*)?(?:\d[ .-]*){9,}/g)||[];
 if(!numbers.some(n=>phone(n)===tel))return false;
 const location=' '+norm(event.location)+' ';
 const contains=value=>(' '+norm(value)+' ').trim().split(' ').every(token=>location.includes(' '+token+' '));
 return contains(data.street)&&contains(data.crmKonsorTown);
}
function selectEvent(events,data){
 const input=validate(data),occupied=events.filter(e=>overlaps(e,input));
 if(occupied.length!==1)throw Error(occupied.length?'La franja tiene varias citas; requiere revisión.':'No existe una cita KONSOR para esa fecha, franja y equipo.');
 const event=occupied[0],start=local(event.start?.dateTime),end=local(event.end?.dateTime);
 const [from,to]=FRANJAS[input.time];
 if(!start||!end||start.date!==input.date||end.date!==input.date||start.minute!==from||end.minute>to||end.minute<=from)throw Error('El horario de la cita requiere revisión.');
 if(!event.id||!sameClient(event,data))throw Error('La cita no identifica de forma suficiente al cliente.');
 if(data.crmKonsorEventId&&data.crmKonsorEventId!==event.id)throw Error('La cita de KONSOR ha cambiado. Verifica de nuevo.');
 return {eventId:event.id,etag:event.etag||'',fecha:input.date,hora:input.time,equipo:input.team};
}
module.exports={validate,selectEvent,sameClient,overlaps};
