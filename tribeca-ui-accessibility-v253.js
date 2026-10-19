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
    const observer = new MutationObserver((mutations) => {
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
