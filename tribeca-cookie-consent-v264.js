/* Tribeca Aula · gestión de consentimiento v264. */
(function cookieModule(){
  'use strict';
  const KEY='tribeca-cookie-preferences-v264',VERSION='264.1',LIFETIME=365*86400000,LINK='politica-cookies.html';
  let current=null,minor=false,once=false,formerFocus=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function retrieve(){
    try{
      const record=JSON.parse(localStorage.getItem(KEY)||'null');
      if(record&&record.version===VERSION&&typeof record.externalMedia==='boolean'&&
        Number.isFinite(record.at)&&record.at<=Date.now()&&Date.now()-record.at<LIFETIME)return record;
    }catch(_){}
    return null;
  }
  function allowed(){return current?.externalMedia===true&&!minor;}
  function validExternal(url){
    try{
      const u=new URL(String(url||''),location.href);
      return u.protocol==='https:'&&u.origin!==location.origin&&
        !(/\/storage\/v1\/object\/public\/tribeca-public-assets\//i.test(u.pathname)&&/\.supabase\.co$/i.test(u.hostname));
    }catch(_){return false;}
  }
  function isMinor(profile){
    if(!profile||String(profile.role||'')!=='student')return false;
    const match=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(profile.birth_date||''));
    if(!match)return true;
    const born=new Date(Date.UTC(+match[1],+match[2]-1,+match[3]));
    if(born.getUTCFullYear()!==+match[1]||born.getUTCMonth()+1!==+match[2]||born.getUTCDate()!==+match[3])return true;
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Europe/Madrid'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
    const age=(+parts.year)-born.getUTCFullYear()-(+parts.month<born.getUTCMonth()+1||
      (+parts.month===born.getUTCMonth()+1&&+parts.day<born.getUTCDate())?1:0);
    return age<14;
  }
  function placeholder(url,title,height){
    if(!validExternal(url)||allowed())return '';
    return `<section class="tribeca-media-choice-v264" aria-label="Contenido externo opcional">
      <strong>${esc(title||'Contenido externo')}</strong>
      <p>${minor?'Este servicio externo requiere autorización para menores de 14 años. Consulta con la academia.':
        'Este recurso se aloja en un servicio externo que puede utilizar cookies. No se cargará sin tu decisión.'}</p>
      ${minor?'':`<button type="button" class="secondary-btn" data-tribeca-media-activate-v264="${esc(url)}" data-tribeca-media-title-v264="${esc(title||'Contenido externo')}" data-tribeca-media-height-v264="${Math.round(height)||540}">Cargar este contenido</button>`}
      <a href="${LINK}" target="_blank" rel="noopener noreferrer">Política de cookies</a>
    </section>`;
  }
  function externalFrameMarkup(url,title,height){return placeholder(url,title,height);}
  function close(){
    document.getElementById('tribeca-cookie-panel-v264')?.remove();
    if(formerFocus?.isConnected)formerFocus.focus({preventScroll:true});
    formerFocus=null;
  }
  function revokeLoaded(){
    document.querySelectorAll('iframe[data-tribeca-external-media-v264]').forEach(frame=>{
      const node=frame.closest('.tribeca-external-loaded-v264');
      const html=placeholder(frame.dataset.tribecaExternalMediaV264,frame.title,Number(frame.dataset.tribecaHeight||540));
      if(html){ (node||frame).outerHTML=html; } else frame.remove();
    });
  }
  function choose(value){
    current={version:VERSION,externalMedia:!!value,at:Date.now()};
    try{localStorage.setItem(KEY,JSON.stringify(current));}catch(_){}
    close();
    if(!allowed())revokeLoaded();
    document.dispatchEvent(new CustomEvent('tribeca:cookie-preferences-updated',{detail:{externalMedia:allowed()}}));
  }
  function open(settings=false){
    close();
    formerFocus=document.activeElement;
    const node=document.createElement('aside');
    node.id='tribeca-cookie-panel-v264';
    node.className='tribeca-cookie-panel-v264';
    node.setAttribute('aria-label','Preferencias de cookies');
    const options=settings?`<div class="tribeca-cookie-options-v264">
      <div><strong>Necesarias</strong><p>Acceso, sesión y preferencias que has elegido.</p><em>Siempre activas</em></div>
      <label><span><strong>Multimedia de terceros</strong><small>Vídeos y presentaciones externos. Desactivado por defecto.</small></span>
        <input type="checkbox" id="tribeca-external-media-v264" ${allowed()?'checked':''} ${minor?'disabled':''}></label>
      ${minor?'<p>En perfiles de menores de 14 años, esta opción no se activa sin autorización de sus representantes.</p>':''}
      </div>`:'';
    node.innerHTML=`<div class="tribeca-cookie-intro-v264">
       <span>TRIBECA AULA · PRIVACIDAD</span>
       <h2>${settings?'Configurar cookies':'Tu privacidad importa'}</h2>
       <p>Utilizamos almacenamiento necesario para acceder al aula y recordar tus preferencias. Los vídeos y presentaciones de terceros son opcionales y podrían utilizar cookies propias.</p></div>
       ${options}<div class="tribeca-cookie-actions-v264">
       <button type="button" data-tribeca-cookie-choice-v264="reject" class="tribeca-cookie-equal-v264">Rechazar opcionales</button>
       <button type="button" data-tribeca-cookie-choice-v264="accept" class="tribeca-cookie-equal-v264">Aceptar opcionales</button>
       ${settings?'<button type="button" data-tribeca-cookie-choice-v264="save" class="tribeca-cookie-config-v264">Guardar elección</button>':
       '<button type="button" data-tribeca-cookie-choice-v264="settings" class="tribeca-cookie-config-v264">Configurar</button>'}</div>
       <div class="tribeca-cookie-foot-v264"><a href="${LINK}" target="_blank" rel="noopener noreferrer">Política de cookies</a>
       <small>Puedes cambiar tu decisión cuando quieras. Rechazar no impide utilizar el aula.</small></div>`;
    node.addEventListener('click',e=>{
      const button=e.target.closest('[data-tribeca-cookie-choice-v264]');if(!button)return;
      const action=button.dataset.tribecaCookieChoiceV264;
      if(action==='reject')choose(false);
      if(action==='accept')choose(true);
      if(action==='settings')open(true);
      if(action==='save')choose(!!node.querySelector('#tribeca-external-media-v264')?.checked);
    });
    document.body.appendChild(node);
    node.querySelector('button')?.focus({preventScroll:true});
  }
  function onProfile(profile){
    minor=isMinor(profile);
    if(minor)revokeLoaded();
  }
  document.addEventListener('click',e=>{
    const manager=e.target.closest('[data-tribeca-cookies-manage]');
    if(manager){e.preventDefault();open(true);return;}
    const btn=e.target.closest('button[data-tribeca-media-activate-v264]');
    if(!btn)return;
    e.preventDefault();
    const url=btn.dataset.tribecaMediaActivateV264;
    if(minor||!validExternal(url))return;
    const wrap=btn.closest('.tribeca-media-choice-v264');
    if(!wrap)return;
    const holder=document.createElement('div');
    holder.className='tribeca-external-loaded-v264';
    const frame=document.createElement('iframe');
    frame.src=new URL(url,location.href).href;
    frame.title=btn.dataset.tribecaMediaTitleV264||'Contenido externo';
    frame.dataset.tribecaExternalMediaV264=url;
    frame.dataset.tribecaHeight=btn.dataset.tribecaMediaHeightV264||'540';
    frame.loading='lazy';
    frame.sandbox='allow-scripts allow-forms allow-popups allow-presentation';
    frame.referrerPolicy='no-referrer';frame.allowFullscreen=true;
    frame.style.minHeight=Math.max(330,Math.min(1200,Number(frame.dataset.tribecaHeight)||540))+'px';
    holder.append(frame);
    wrap.replaceWith(holder);
  });
  function init(){
    if(once)return;once=true;current=retrieve();
    if(!current)open(false);
  }
  window.TribecaCookieConsentV264=Object.freeze({init,open,allowed,onProfile,externalFrameMarkup,validExternal,
    selection:()=>current,minorRestricted:()=>minor});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
