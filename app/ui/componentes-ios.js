/* KONSOR · componentes UI únicos, extraídos del Inicio iOS existente sin cambiar HTML ni SVG. */
(function(root){
'use strict';
const el=(tag,cl,txt,parent)=>{
 const o=document.createElement(tag);if(cl)o.className=cl;if(txt!==undefined)o.textContent=String(txt);
 if(parent)parent.append(o);return o;
};
const btn=(txt,fn,cl)=>{const b=el("button","cnv-button "+(cl||""),txt);b.type="button";b.addEventListener("click",fn);return b;};
const icons={
 map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 15h3"/>',
 office:'<path d="M3 21V7l9-4 9 4v14M9 21v-6h6v6"/>',
 clients:'<circle cx="12" cy="8" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2M4 3h16"/>',
 results:'<path d="M3 20h18M6 16V9M12 16V4M18 16v-5"/>',
 direction:'<path d="M3 20h18M6 20V9l6-5 6 5v11M9 20v-6h6v6"/>',
 calls:'<path d="M6 3h4l1 5-2 2a15 15 0 0 0 5 5l2-2 5 1v4a3 3 0 0 1-3 3C9 21 3 15 3 6a3 3 0 0 1 3-3Z"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
 ruler:'<path d="m21 7-4-4L3 17l4 4L21 7zM14 6l4 4M11 9l3 3M8 12l3 3"/>',
 gps:'<circle cx="12" cy="12" r="7"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5"/>',
 layers:'<path d="m12 3 9 5-9 5-9-5 9-5zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
 pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2"/>'
};
const icon=(name)=>{
 const box=el("span","cnv-icon");
 box.innerHTML='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(icons[name]||icons.map)+'</svg>';
 return box;
};

root.KonsorUI=Object.freeze({el,button:btn,icon});
})(window);
