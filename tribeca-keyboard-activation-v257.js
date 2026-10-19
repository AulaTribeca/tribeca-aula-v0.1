/* Tribeca Aula v257: activacion por teclado de tarjetas no nativas.
   Complementa, sin duplicar, los manejadores existentes de tarjetas de clase
   del alumno. Enter/Espacio equivalen a clic, sin ejecutar escrituras nuevas. */
(() => {
  'use strict';
  const selector = [
    '.t16-tool-card[role="button"][tabindex]',
    '.teacher-quick-class-card[data-t90-open-class][role="button"][tabindex]',
    '.subject-card[data-class-subject][role="button"][tabindex]',
    '.subject-card[data-subject]:not([data-class-subject])[role="button"][tabindex]',
    '.teacher-tasks-summary[data-t114-open-tasks][role="button"][tabindex]'
  ].join(', ');

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.repeat || event.isComposing) return;
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches(selector)) return;
    if (target.hasAttribute('disabled') || target.getAttribute('aria-disabled') === 'true') return;
    if (target.closest('[inert]') || target.hidden) return;
    // La etiqueta semantica sigue siendo role=button; solo se normaliza activacion.
    event.preventDefault();
    target.click();
  }, false);
})();