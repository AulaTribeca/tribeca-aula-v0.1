/* Tribeca Aula v229 · lectura clara y modo de interfaz mínima por perfil */
(() => {
  'use strict';

  let lastProfileId = null;
  let lastSignature = '';
  let timer = null;
  let observer = null;

  const clamp = (value, min, max, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  };

  function clearProfileUi(){
    if(!document.body) return;
    document.body.classList.remove('tribeca-profile-readable','tribeca-profile-minimal');
    const root=document.documentElement;
    root.style.removeProperty('--tribeca-profile-font-scale');
    root.style.removeProperty('--tribeca-profile-letter-spacing');
    root.style.removeProperty('--tribeca-profile-word-spacing');
    root.style.removeProperty('--tribeca-profile-line-height');
    root.style.removeProperty('--tribeca-profile-reading-width');
  }

  function currentProfile(){
    return window.TribecaAuth?.profile || null;
  }

  function enhanceEditableFields(root=document){
    if(!document.body?.classList.contains('tribeca-profile-readable')) return;
    const nodes=[];
    if(root?.matches?.('textarea,[contenteditable="true"],input[type="text"],input:not([type])')) nodes.push(root);
    root?.querySelectorAll?.('textarea,[contenteditable="true"],input[type="text"],input:not([type])').forEach(node=>nodes.push(node));
    nodes.forEach(node=>{
      node.setAttribute('spellcheck','true');
      node.setAttribute('autocapitalize','sentences');
    });
  }

  function ensureObserver(){
    if(observer || !document.body) return;
    observer=new MutationObserver(records=>{
      records.forEach(record=>record.addedNodes.forEach(node=>{
        if(node?.nodeType===1) enhanceEditableFields(node);
      }));
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  function applyProfileUi(){
    const profile=currentProfile();
    if(!profile){
      if(lastProfileId!==null) clearProfileUi();
      lastProfileId=null;
      lastSignature='';
      return false;
    }

    const prefs=(profile.ui_preferences && typeof profile.ui_preferences==='object') ? profile.ui_preferences : {};
    const signature=JSON.stringify([profile.id,prefs]);
    if(signature===lastSignature){
      enhanceEditableFields();
      return true;
    }

    clearProfileUi();
    lastProfileId=String(profile.id||'');
    lastSignature=signature;

    if(prefs.minimal_ui===true) document.body.classList.add('tribeca-profile-minimal');

    const font=String(prefs.font_family||'').toLowerCase();
    if(font==='verdana' || font==='accessible' || font==='opendyslexic'){
      document.body.classList.add('tribeca-profile-readable');
      const root=document.documentElement;
      root.style.setProperty('--tribeca-profile-font-scale',String(clamp(prefs.font_size,.9,1.25,1)));
      root.style.setProperty('--tribeca-profile-letter-spacing',`${clamp(prefs.letter_spacing,0,.04,0)}em`);
      root.style.setProperty('--tribeca-profile-word-spacing',`${clamp(prefs.word_spacing,0,.08,.01)}em`);
      root.style.setProperty('--tribeca-profile-line-height',String(clamp(prefs.line_height,1.35,1.8,1.5)));
      root.style.setProperty('--tribeca-profile-reading-width',`${clamp(prefs.max_line_width_ch,52,76,68)}ch`);

      const fontSelect=document.getElementById('fontSelect');
      if(fontSelect){
        let option=fontSelect.querySelector('option[value="verdana"]');
        if(!option){
          option=document.createElement('option');
          option.value='verdana';
          option.textContent='Verdana';
          fontSelect.appendChild(option);
        }
        fontSelect.value='verdana';
      }

      enhanceEditableFields();
      ensureObserver();
    }
    return true;
  }

  function start(){
    applyProfileUi();
    let attempts=0;
    timer=window.setInterval(()=>{
      applyProfileUi();
      attempts+=1;
      if(attempts>40 && currentProfile()){
        clearInterval(timer);
        timer=null;
      }
    },250);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  window.addEventListener('pageshow',applyProfileUi);
  window.TribecaApplyProfileUi=applyProfileUi;
})();
