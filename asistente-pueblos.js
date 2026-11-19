/* KONSOR: confirmación de pueblo dibujado; no sustituye Leaflet ni Firebase. */
(function(){
'use strict';
let active=false;
const clean=s=>String(s||'').trim().replace(/\s+/g,' ');
function center(points){const p=points.map(x=>[Number(x[0]),Number(x[1])]);return p.reduce((acc,x)=>[acc[0]+x[0]/p.length,acc[1]+x[1]/p.length],[0,0]);}
async function names(points){
 const [lat,lon]=center(points);
 const url='https://nominatim.openstreetmap.org/reverse?'+new URLSearchParams({lat,lon,format:'jsonv2',zoom:'16',addressdetails:'1','accept-language':'es'});
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8500);
 try{const res=await fetch(url,{signal:controller.signal});if(!res.ok)throw Error('Sin geocodificación');
 const a=(await res.json()).address||{};return [...new Set([a.village,a.town,a.city,a.hamlet,a.suburb,a.municipality,a.county].map(clean).filter(Boolean))];
 }finally{clearTimeout(timer);}
}
window.konsorConfirmarNombrePueblo=async function(points){
 if(active)return null;
 if(!Array.isArray(points)||points.length<3){alert('Marca al menos tres puntos del pueblo.');return null;}
 active=true;
 if(!document.getElementById('ktc-css')){
 const style=document.createElement('style');style.id='ktc-css';
 style.textContent='.ktc-backdrop{position:fixed;inset:0;z-index:2147483500;display:flex;align-items:center;justify-content:center;padding:18px;background:#1e293b66;backdrop-filter:blur(11px)}.ktc-card{box-sizing:border-box;width:min(100%,430px);max-height:90dvh;overflow:auto;padding:23px;border-radius:25px;background:#f7f8fb;color:#263449;box-shadow:0 24px 70px #14233740;font-family:-apple-system,BlinkMacSystemFont,sans-serif}.ktc-card h2{font-size:24px;color:#1d2a3b;margin:6px 0 10px}.ktc-card p{color:#68788d;font-size:13px;line-height:1.5;margin:0 0 13px}.ktc-small{font-size:11px;color:#77869c;font-weight:750;letter-spacing:1px}.ktc-opt{width:100%;display:block;text-align:left;background:white;border:1px solid #e2e7ed;color:#25364a;border-radius:13px;padding:13px;margin:7px 0;font-size:15px}.ktc-opt[aria-pressed=true]{border-color:#526581;background:#edf2f8}.ktc-card label{display:block;font-size:13px;font-weight:700;margin:16px 0 7px}.ktc-card input{box-sizing:border-box;width:100%;min-height:48px;padding:12px;border:1px solid #d9e0e9;background:#fff;color:#22334a;border-radius:12px;font-size:16px}.ktc-actions{display:flex;gap:9px;margin-top:16px}.ktc-actions button{flex:1;min-height:46px;border:0;border-radius:13px;font-weight:700}.ktc-no{background:#e7ebf1;color:#45566e}.ktc-yes{background:#263b53;color:white}.ktc-yes:disabled{opacity:.45}';
 document.head.appendChild(style);
 }
 return new Promise(resolve=>{
 const modal=document.createElement('div');modal.className='ktc-backdrop';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
 modal.innerHTML='<div class="ktc-card"><span class="ktc-small">KONSOR · TERRITORIOS</span><h2>Confirmar localidad</h2><p>Perímetro marcado manualmente. Comprueba el nombre antes de guardar.</p><div id="ktc-choices" aria-live="polite"><p>Identificando localidad…</p></div><label for="ktc-name">Pueblo o localidad</label><input id="ktc-name" autocomplete="off" maxlength="100" placeholder="Selecciona o escribe el nombre"><div class="ktc-actions"><button type="button" class="ktc-no">Cancelar</button><button type="button" class="ktc-yes" disabled>Confirmar y guardar</button></div><p style="margin-top:13px;font-size:11px">El nombre es una sugerencia. Nunca se dibuja automáticamente el perímetro.</p></div>';
 document.body.appendChild(modal);const input=modal.querySelector('#ktc-name'),button=modal.querySelector('.ktc-yes'),choices=modal.querySelector('#ktc-choices');
 const update=()=>button.disabled=!clean(input.value);
 const done=v=>{modal.remove();active=false;resolve(v);};
 input.oninput=update;modal.querySelector('.ktc-no').onclick=()=>done(null);button.onclick=()=>{if(clean(input.value))done(clean(input.value));};
 input.focus();
 names(points).then(options=>{
 if(!modal.isConnected)return;
 if(!options.length){choices.textContent='No se ha podido identificar con precisión. Introduce el nombre.';return;}
 choices.innerHTML='<p>Posibles localidades:</p>';
 options.slice(0,5).forEach(item=>{const b=document.createElement('button');b.type='button';b.className='ktc-opt';b.textContent=item;b.onclick=()=>{input.value=item;update();choices.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));};choices.appendChild(b);});
 if(options.length===1){input.value=options[0];update();}
 }).catch(()=>{if(modal.isConnected)choices.textContent='No se ha podido identificar la localidad. Escribe el nombre.';});
 });
};
})();