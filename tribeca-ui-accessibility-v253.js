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
    // El panel se vuelve a renderizar al cambiar opciones: conservar el foco.
    let panelWasOpen = false, lastControl = null;
    const attrs = ['data-a11y-font','data-a11y-reset','data-a11y-toggle-setting','data-a11y-step','data-a11y-range','data-a11y-field','data-a11y-language','data-a11y-reading-mode','data-a11y-close'];
    document.addEventListener('focusin', event => {
      if (!event.target.closest?.('[data-a11y-panel]')) return;
      lastControl = { node:event.target, values:attrs.filter(a=>event.target.hasAttribute(a)).map(a=>[a,event.target.getAttribute(a)]), step:event.target.getAttribute('data-step') };
    });
    function syncAccessibilityPanel() {
      const root = document.getElementById('tribecaAccessibilityWidget');
      const panel = root?.querySelector('[data-a11y-panel]');
      if (!panel) { panelWasOpen=false; return; }
      const toggle = root.querySelector('[data-a11y-toggle]');
      panel.id='tribecaAccessibilityPanel';
      panel.setAttribute('role','dialog');
      toggle.setAttribute('aria-controls',panel.id);
      toggle.setAttribute('aria-expanded',String(!panel.hidden));
      panel.querySelectorAll('article').forEach((article,index)=>{
        const heading=article.querySelector('h3');
        if(!heading) return;
        heading.id='tribeca-a11y-option-'+index;
        article.querySelectorAll('input,select').forEach(field=>field.setAttribute('aria-labelledby',heading.id));
        article.querySelectorAll('[data-a11y-step], [data-a11y-reset]').forEach(button=>button.setAttribute('aria-label',button.textContent.trim()+' · '+heading.textContent.trim()));
        article.querySelectorAll('[data-a11y-font]').forEach(button=>button.setAttribute('aria-pressed',String(button.classList.contains('is-active'))));
      });
      if(!panel.hidden && !panelWasOpen) panel.querySelector('[data-a11y-close]')?.focus();
      else if(!panel.hidden && lastControl && !lastControl.node.isConnected && lastControl.values.length) {
        const replacement=[...panel.querySelectorAll('button,input,select')].find(el=>lastControl.values.every(([a,v])=>el.getAttribute(a)===v) && el.getAttribute('data-step')===lastControl.step);
        replacement?.focus({preventScroll:true});
      }
      if(panel.hidden && panelWasOpen) toggle.focus();
      panelWasOpen=!panel.hidden;
    }
    new MutationObserver(syncAccessibilityPanel).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
    syncAccessibilityPanel();
    document.addEventListener('keydown', event=>{
      const panel=document.querySelector('[data-a11y-panel]:not([hidden])');
      if(!panel) return;
      if(event.key==='Escape') { event.preventDefault(); event.stopImmediatePropagation(); panel.hidden=true; syncAccessibilityPanel(); }
      if(event.key==='Tab' && panel.contains(document.activeElement)) {
        const controls=[...panel.querySelectorAll('button,input,select')].filter(el=>!el.disabled && el.getClientRects().length);
        const first=controls[0], last=controls.at(-1);
        if(event.shiftKey && document.activeElement===first) { event.preventDefault(); last.focus(); }
        else if(!event.shiftKey && document.activeElement===last) { event.preventDefault(); first.focus(); }
      }
    },true);

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
