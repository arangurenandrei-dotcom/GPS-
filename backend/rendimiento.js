'use strict';
const {USERS,BOSS,madridDate,clock}=require('./lib');
const day=(date,n)=>new Date(Date.parse(date+'T12:00Z')+n*86400000).toISOString().slice(0,10);
const minute=time=>/^([01]\d|2[0-3]):[0-5]\d$/.test(time)?Number(time.slice(0,2))*60+Number(time.slice(3)):NaN;
const amount=v=>({'45-60':50,'60-80':70,'80-100':90,'100-150':125,'150+':160}[v]||Math.max(0,Number(String(v||'').replace(',','.'))||0));
function periods(today){
 const out=[], first=today.slice(0,7)+'-01', last=day(first,-1);
 if(new Date(today+'T12:00Z').getUTCDay()===1)out.push(['Semana',day(today,-7),day(today,-1),day(today,-14),day(today,-8)]);
 if(today.endsWith('-16'))out.push(['Primera quincena',first,day(today,-1),last.slice(0,7)+'-01',last.slice(0,7)+'-15']);
 if(today===first){const prev=last.slice(0,7)+'-01',end=day(prev,-1);out.push(['Mes',prev,last,end.slice(0,7)+'-01',end]);}
 return out;
}
function metrics(zones,shifts,start,end){
 const inside=d=>d>=start&&d<=end;
 const m={si:0,no:0,ausente:0,papelito:0,yaAislado:0, fichas:0,completas:0,citas:0,obras:0,llamadas:0,m2:0,horas:0,towns:new Map(),days:new Set(),late:new Set()};
 for(const s of shifts){const date=s.localDate||String(s.date||'').slice(0,10);if(!inside(date)||!s.startTime)continue;
  m.days.add(date);const minutes=minute(s.endTime)-minute(s.startTime)-Number(s.lunchMinutes||0);if(Number.isFinite(minutes))m.horas+=Math.max(0,minutes)/60;}
 for(const z of zones){
  const date=z.dumpDate||z.date;
  if(inside(date)&&!(z.isSingleHouse&&z.clients?.[0]?.origen&&z.clients[0].origen!=='puerta')){
   const st=z.stats||{};for(const k of ['si','no','ausente','papelito','yaAislado'])m[k]+=Number(st[k])||0;
   if(z.town&&!z.isSingleHouse&&z.dumpDate){const t=m.towns.get(z.town)||{si:0,no:0,sectors:0};t.ausente=(t.ausente||0)+(Number(st.ausente)||0);t.si+=Number(st.si)||0;t.no+=Number(st.no)||0;t.sectors++;m.towns.set(z.town,t);}
  }
  if(z.firstDumpRecordedAt&&inside(z.dumpDate)&&madridDate(z.firstDumpRecordedAt)>z.dumpDate)m.late.add(z.dumpDate);
  for(const c of z.clients||[]){if(!(c.name||c.street||c.phone))continue;
   m.llamadas+=(c.callLog||[]).filter(log=>log.t&&inside(madridDate(log.t))).length;
   if(inside(c.createdAt?madridDate(c.createdAt):date)){m.fichas++;if(c.name&&c.street&&c.phone)m.completas++;}
   if(c.obraStatus==='agendada'&&c.crmUploaded&&inside(c.obraDate))m.citas++;
   if(c.obraStatus==='realizada'&&inside(c.obraRealizadaDate||(c.obraRealizadaAt?madridDate(c.obraRealizadaAt):''))){m.obras++;m.m2+=amount(c.m2);}
  }
 }return m;
}
function extraEvents({zones=[],shifts=[],now=Date.now()}){
 const today=madridDate(now),minutes=clock(now),events=[];
 const emit=(to,key,category,title,body,context)=>events.push({to,key,category,title,body,context,createdAt:now});
 for(const user of USERS){
  const mine=zones.filter(z=>z.comercial===user&&!z.isNoAptoZone),work=shifts.filter(s=>s.user===user);
  for(const z of mine)for(const c of z.clients||[]){
   const delta=Number(c.nextContactAt)-now;
   if(delta>=0&&delta<=15*60000&&(!c.obraStatus||c.obraStatus==='a_poner'))emit(user,'contact:'+z.id+':'+(c.clientUid||c.id||c.phone)+':'+c.nextContactAt,'followups','Tienes un seguimiento acordado','El contacto está previsto en '+Math.ceil(delta/60000)+' minutos. Abre la ficha para revisar las notas.',{zoneId:z.id});
   if(user!==BOSS&&minutes>=9*60&&c.obraStatus==='agendada'&&!c.crmUploaded&&[today,day(today,1)].includes(c.obraDate))emit(BOSS,'crm-urgente:'+z.id+':'+(c.clientUid||c.id||c.phone)+':'+c.obraDate,'management','Cita pendiente de CRM · '+user,'La obra del '+c.obraDate+' sigue pendiente de confirmación. Revisa la reserva con el comercial.',{zoneId:z.id,person:user});
  }
  // Avisos informativos basados en datos registrados, una vez por día/umbral.
  const shiftToday=work.find(x=>(x.localDate||String(x.date||'').slice(0,10))===today);
  const scheduledToday=mine.filter(z=>z.date===today&&!z.isSingleHouse&&!z.isHotMission);
  if(minutes>=10*60&&!shiftToday?.startTime&&scheduledToday.length){
   emit(user,'routine:late-start:'+today+':'+user,'daily','Todavía no has iniciado la jornada',
     'Son las 10:00 y no consta un fichaje de entrada. Si ya estás trabajando, abre Mi jornada y comprueba el registro.',
     {person:user,action:'shift'});
  }
  if(shiftToday?.status==='lunch'&&shiftToday.lunchStart){
   const since=minutes-minute(shiftToday.lunchStart);
   if(Number.isFinite(since)&&since>=60&&since<90){
    emit(user,'routine:lunch-60:'+today+':'+user,'daily','Llevas una hora en comida',
      '¿Has terminado de comer? Si has vuelto al trabajo, pulsa Reanudar en Mi jornada.',
      {person:user,action:'resume'});
   }else if(Number.isFinite(since)&&since>=90){
    emit(user,'routine:lunch-90:'+today+':'+user,'daily','Comprueba tu pausa de comida',
      'Llevas más de 90 minutos en pausa. Si olvidaste reanudar el fichaje, revisa Mi jornada.',
      {person:user,action:'resume'});
   }
  }
  if(shiftToday&&(shiftToday.status==='finished'||shiftToday.endTime)&&scheduledToday.length&&scheduledToday.every(z=>z.status==='completada')){
   const missing=scheduledToday.flatMap(z=>z.clients||[]).filter(c=>(c.name||c.street||c.phone)&&!(c.name&&c.street&&c.phone));
   if(!missing.length){
    emit(user,'routine:done:'+today+':'+user,'daily','Jornada completada',
      'Has cerrado la jornada y los sectores planificados de hoy constan como completados, sin fichas incompletas detectadas. Buen trabajo.',
      {person:user,action:'summary'});
   }
  }
  if(minutes<9*60)continue;
  for(const [period,start,end,priorStart,priorEnd] of periods(today)){
   const m=metrics(mine,work,start,end),p=metrics(mine,work,priorStart,priorEnd);
   if(![m,p].some(v=>v.days.size||v.si||v.no||v.fichas||v.citas||v.obras||v.ausente||v.papelito))continue;
   const contacts=m.si+m.no,previous=p.si+p.no,rate=contacts?100*m.si/contacts:0,old=previous?100*p.si/previous:0;
   const pay=user===BOSS?1:0.85;
   const summary=start+' a '+end+' · '+m.days.size+' jornadas, '+m.horas.toFixed(1)+' h registradas. '+m.si+' síes, '+m.no+' noes, '+m.ausente+' ausentes, '+m.papelito+' papelitos. '+m.completas+'/'+m.fichas+' fichas completas, '+m.llamadas+' seguimientos registrados. '+m.citas+' citas CRM previstas en el periodo y '+m.obras+' obras realizadas. Comisión estimada por obra realizada: '+(m.m2*pay).toFixed(2)+' € (periodo anterior: '+(p.m2*pay).toFixed(2)+' €).';
   const actions=[];
   if(period==='Semana'){
    const lastFive=[...m.days].sort().slice(-5);
    if(lastFive.filter(d=>m.late.has(d)).length>=3)actions.push('Hay volcados posteriores al día trabajado en al menos 3 de las últimas 5 jornadas. Revisa cuándo se registran los sectores.');
   }
   if(m.llamadas>=10&&p.llamadas>=10&&p.citas>=3&&m.citas<p.citas*.7)actions.push('Con '+m.llamadas+' seguimientos registrados, las citas previstas pasan de '+p.citas+' a '+m.citas+'. Revisa las notas de llamada.');
   if(p.citas>=2&&m.citas>=p.citas*1.5)actions.push('Las citas previstas suben de '+p.citas+' a '+m.citas+'. Reconoce la mejora.');
   for(const [town,t] of m.towns)if(t.sectors>=2&&t.ausente>=20&&t.ausente/(t.ausente+t.si+t.no)>=0.6)actions.push('Hay '+t.ausente+' ausentes registrados en '+town+'. Revisa horarios antes de la siguiente pasada.');
   if(m.days.size>=3&&p.days.size>=3&&p.si&&m.si/m.days.size<=0.75*p.si/p.days.size)actions.push('Los síes por jornada pasan de '+(p.si/p.days.size).toFixed(1)+' a '+(m.si/m.days.size).toFixed(1)+'. Revisa las zonas y las horas de calle.');
   if(contacts>=30&&previous>=30&&old-rate>=8)actions.push('La conversión pasa del '+Math.round(old)+' % al '+Math.round(rate)+' %. Revisa el argumento de puerta con el comercial.');
   if(contacts>=30&&previous>=30&&rate-old>=8)actions.push('La conversión sube del '+Math.round(old)+' % al '+Math.round(rate)+' %. Reconoce el avance y comparte qué ha funcionado.');
   if(m.fichas>m.completas)actions.push('Completa los datos de '+(m.fichas-m.completas)+' fichas.');
   if(m.days.size>=3&&p.days.size===m.days.size&&p.horas>0&&m.horas<=p.horas*0.75)actions.push('Con las mismas jornadas, las horas registradas pasan de '+p.horas.toFixed(1)+' a '+m.horas.toFixed(1)+'. Revisa los fichajes.');
   for(const [town,t] of m.towns)if(t.sectors>=2&&t.si+t.no>=30&&t.si/(t.si+t.no)>=0.30)actions.push(town+' suma '+t.si+' síes en '+(t.si+t.no)+' conversaciones. Valora reforzar la zona.');
   const key='balance:'+period+':'+start+':'+user;
   emit(user,key,'motivation',period+' · tu actividad',summary+(contacts?' Conversión: '+Math.round(rate)+' %.':''),{person:user});
   if(user!==BOSS)emit(BOSS,key,'management',period+' · '+user,summary+' '+actions.join(' '),{person:user});
  }
 }return events;
}
module.exports={extraEvents,periods,metrics};
