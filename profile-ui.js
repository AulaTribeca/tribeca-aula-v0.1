/* Tribeca Aula v225 · aplicación silenciosa de preferencias visuales por perfil */
(() => {
  'use strict';

  let lastProfileId = null;
  let lastSignature = '';
  let timer = null;

  const clamp = (value, min, max, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  };

  function clearProfileUi(){
    if(!document.body) return;
    document.body.classList.remove('tribeca-profile-readable');
    const root=document.documentElement;
    root.style.removeProperty('--tribeca-profile-font-scale');
    root.style.removeProperty('--tribeca-profile-letter-spacing');
    root.style.removeProperty('--tribeca-profile-line-height');
  }

  function currentProfile(){
    return window.TribecaAuth?.profile || null;
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
    if(signature===lastSignature) return true;

    clearProfileUi();
    lastProfileId=String(profile.id||'');
    lastSignature=signature;

    const font=String(prefs.font_family||'').toLowerCase();
    if(font==='opendyslexic'){
      document.body.classList.add('tribeca-profile-readable');
      const root=document.documentElement;
      root.style.setProperty('--tribeca-profile-font-scale',String(clamp(prefs.font_size,.9,1.35,1.05)));
      root.style.setProperty('--tribeca-profile-letter-spacing',`${clamp(prefs.letter_spacing,0,.08,.015)}em`);
      root.style.setProperty('--tribeca-profile-line-height',String(clamp(prefs.line_height,1.2,2,1.55)));

      const fontSelect=document.getElementById('fontSelect');
      if(fontSelect && fontSelect.value!=='opendyslexic') fontSelect.value='opendyslexic';
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
