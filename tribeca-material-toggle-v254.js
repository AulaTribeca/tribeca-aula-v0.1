/* Tribeca Aula v254.1 · detalles de publicación: un solo estado, una sola etiqueta.
   El contenido, los enlaces, las notas y la persistencia no se modifican. */
(() => {
  'use strict';
  const labels = {
    es:['Abrir','Cerrar'], gl:['Abrir','Pechar'],
    en:['Open','Close'], fr:['Ouvrir','Fermer'],
    pl:['Otwórz','Zamknij'], de:['Öffnen','Schließen'],
    pt:['Abrir','Fechar']
  };
  function locale() {
    const code=(document.documentElement.lang||'es').toLowerCase().split('-')[0];
    return labels[code] || labels.es;
  }
  function sync(details) {
    if (!details?.matches?.('details.material-collapse-card')) return;
    const hint=details.querySelector('summary.material-collapse-summary .material-expand-hint');
    if (!hint) return;
    hint.textContent=locale()[details.open ? 1 : 0];
  }
  function all() {
    document.querySelectorAll('details.material-collapse-card').forEach(sync);
  }
  document.addEventListener('toggle', ev=>sync(ev.target), true);
  document.addEventListener('change', ev=>{
    if (ev.target?.id==='languageSelect') Promise.resolve().then(all);
  }, true);
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', all, {once:true});
  else all();
})();
