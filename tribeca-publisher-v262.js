/* Tribeca Aula v262 — contrato único para publicar materiales docentes.
 * Compatible: documento adjunto, HTML/ZIP subido como URL, vídeo HTTPS,
 * enlace HTTPS, test/esquema en JSON nativo. Nunca HTML pegado en BD.
 * Compatible con los registros históricos: no los migra ni borra. */
(() => {
  'use strict';
  function ownHtml(url) {
    try {
      const parsed = new URL(String(url||''),location.href);
      return parsed.origin === location.origin &&
        /^\/tribeca-aula-v0\.1\/recursos\/[\w/-]+\.html?$/i.test(parsed.pathname);
    } catch (_) {return false;}
  }
  function hostedHtml(url) {
    try {
      const parsed = new URL(String(url||''),location.href);
      if(parsed.protocol !== 'https:' && !(location.hostname==='localhost' && parsed.origin===location.origin))return false;
      const externalAsset = /\/storage\/v1\/object\/public\/tribeca-public-assets\/.+\.html?$/i.test(parsed.pathname);
      const internal = ownHtml(url);
      return internal || externalAsset;
    } catch (_) {return false;}
  }
  function check(data) {
    const kind=String(data.kind||'').toLowerCase();
    if(data.isAnnouncement) return {ok:true,reason:''};
    const url=String(data.url||'').trim();
    const code=String(data.code||'').trim();
    const hasLegacy=!!data.editId && !!data.originalInline;
    if(data.uploadPending) return {ok:false,reason:'El archivo sigue subiendo. Comprueba que aparece «Recurso completo subido correctamente».'};
    if(url) {
      try {
        const u=new URL(url,location.href);
        if(u.protocol!=='https:' && !(location.hostname==='localhost' && u.origin===location.origin))return {ok:false,reason:'Usa una URL HTTPS para evitar bloqueos de seguridad.'};
      } catch (_) {return {ok:false,reason:'La dirección del recurso no es válida.'};}
    }
    if(!hasLegacy && /<!doctype\s+html|<html[\s>]|<script[\s>]|<iframe[\s>]|data:text\/html/i.test(code))
      return {ok:false,reason:'No publiques HTML o iframes pegados. Utiliza «HTML principal», «ZIP del recurso» o una URL HTTPS para que funcione en móvil y tablet.'};
    const requires=['presentation','game','test','exam','schema','video'].includes(kind);
    if(requires && !url && !code) return {ok:false,reason:'Este tipo necesita una URL HTTPS, un HTML/ZIP cargado o un JSON nativo válido.'};
    if(code && !hasLegacy && !/^\s*(?:tribeca-(?:quiz|exam|schema)-json::|[\[{])/i.test(code))
      return {ok:false,reason:'El campo de actividades admite únicamente JSON nativo. Para HTML completo sube el archivo en lugar de pegar código.'};
    return {ok:true,reason:''};
  }
  window.TribecaPublisherV262=Object.freeze({check,hostedHtml,ownHtml});
})();