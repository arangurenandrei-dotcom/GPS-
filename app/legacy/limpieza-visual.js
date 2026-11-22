
/* Eliminar pictogramas decorativos únicamente de la representación DOM.
   Nunca modifica datos de Firebase, textos guardados o valores de formularios. */
(function cleanDecorativeUi(){
 const emoji=/[\p{Extended_Pictographic}\p{Emoji_Presentation}](?:\uFE0F|\uFE0E|\u200D[\p{Extended_Pictographic}\p{Emoji_Presentation}])*|[\u2600-\u27BF]\uFE0F?/gu;
 const containers='.hud-header,.bottom-action-panel,.banner-drawing,.modal-overlay,.celebration-toast';
 const skip='script,style,textarea,input,option,svg,canvas,.leaflet-container,.leaflet-pane,.leaflet-marker-icon,.leaflet-popup';
 function scrub(root){
  if(!root || root.nodeType!==1 || root.matches?.(skip))return;
  if(!root.matches?.(containers) && !root.closest?.(containers)){
   if(!root.querySelector?.(containers))return;
  }
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{
   acceptNode(node){
    const p=node.parentElement;
    return p && p.closest(containers) && !p.closest(skip)
      ? NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
   }
  });
  let n;
  while((n=walker.nextNode())){
   const old=n.nodeValue;
   emoji.lastIndex=0;
   if(emoji.test(old)){
    emoji.lastIndex=0;
    const next=old.replace(emoji,'').replace(/^[ \\t]+/,'');
    if(next!==old)n.nodeValue=next;
   }
  }
 }
 function init(){
  document.querySelectorAll(containers).forEach(scrub);
  const observer=new MutationObserver(records=>{
   for(const rec of records){
    if(rec.type==='characterData'){const el=rec.target.parentElement;if(el && el.closest(containers)&&!el.closest(skip)){
      const old=rec.target.nodeValue;emoji.lastIndex=0;if(emoji.test(old)){emoji.lastIndex=0;rec.target.nodeValue=old.replace(emoji,'').replace(/^[ \\t]+/,'');}
    }}else{
     rec.addedNodes.forEach(n=>{if(n.nodeType===1)scrub(n);});
    }
   }
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
