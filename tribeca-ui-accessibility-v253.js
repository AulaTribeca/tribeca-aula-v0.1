/* Tribeca Aula v253 - vínculos accesibles para formularios dinámicos.
   No altera los nombres de campos, los envíos ni la lógica del aula. */
(() => {
  'use strict';
  let sequence = 0;
  function linkFormRow(row) {
    if (!row || row.nodeType !== 1) return;
    const labels = row.querySelectorAll('label');
    const fields = row.querySelectorAll('input:not([type="hidden"]), select, textarea');
    if (labels.length !== 1 || fields.length !== 1) return;
    const label = labels[0], field = fields[0];
    if (!label.textContent.trim() || label.contains(field) || label.control || label.htmlFor) return;
    if (field.id) {
      label.htmlFor = field.id;
      return;
    }
    let id;
    do { id = 'tribeca-ux-field-v253-' + (++sequence); }
    while (document.getElementById(id));
    field.id = id;
    label.htmlFor = id;
  }
  function check(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.matches?.('.form-row')) linkFormRow(root);
    root.querySelectorAll?.('.form-row').forEach(linkFormRow);
  }
  function init() {
    check(document.body);
    // El fondo bloqueado visualmente tampoco debe recibir foco de teclado.
    // Se conserva el estado inert previo de cada región y se restaura al entrar.
    const backgroundState = new Map();
    function syncAuthBackground() {
      const overlay = document.getElementById('tribecaAuthOverlay');
      const locked = document.body.classList.contains('auth-locked') && overlay && !overlay.hidden;
      if (locked) {
        document.querySelectorAll('#appHeader, main#inicio, body > footer, #windowLayer, #windowDock, #tribecaPwaInstallCta').forEach(region => {
          if (!backgroundState.has(region)) backgroundState.set(region, region.inert);
          region.inert = true;
        });
      } else {
        backgroundState.forEach((wasInert, region) => { region.inert = wasInert; });
        backgroundState.clear();
      }
    }
    syncAuthBackground();
    const authObserver = new MutationObserver(syncAuthBackground);
    authObserver.observe(document.body, { attributes:true, attributeFilter:['class'], childList:true });
    // Tras alternar acceso/recuperación, el teclado entra en el formulario activo.
    document.addEventListener('click', event => {
      const toggle = event.target.closest?.('#tribecaAuthOverlay [data-t16-forgot], #tribecaAuthOverlay [data-t16-login]');
      if (!toggle) return;
      const formId = toggle.hasAttribute('data-t16-forgot') ? 't16ResetForm' : 't16LoginForm';
      queueMicrotask(() => {
        const form = document.getElementById(formId);
        if (form && !form.hidden) form.querySelector('input:not([disabled])')?.focus();
      });
    });
    const observer = new MutationObserver((mutations) => {
      syncAuthBackground();
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) check(node);
      }
    });
    const roots = [document.getElementById('inicio'), document.getElementById('windowLayer')].filter(Boolean);
    roots.forEach(root => observer.observe(root, { childList:true, subtree:true }));
    // Modales de acceso se crean como hijos directos del body.
    observer.observe(document.body, { childList:true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
