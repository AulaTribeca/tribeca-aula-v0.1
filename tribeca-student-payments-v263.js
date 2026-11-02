/* Tribeca Aula v264 — acceso discreto, consulta privada y sin notas docentes. */
(function buildStudentPaymentsV263(){
  'use strict';
  const escape = v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(n));
  const monthText=m=>{
    const match=/^(\d{4})-(\d{2})$/.exec(String(m||''));
    if(!match)return 'Mes';
    return new Intl.DateTimeFormat('es-ES',{year:'numeric',month:'long',timeZone:'Europe/Madrid'}).format(
      new Date(Date.UTC(Number(match[1]),Number(match[2])-1,1)));
  };
  const dateText=d=>{
    const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d||''));
    return match ? [match[3],match[2],match[1]].join('/') : 'Sin fecha registrada';
  };
  const filtered=raw=>{
    if(!Array.isArray(raw))return null;
    return raw.filter(r=>r&&/^\d{4}-(0[1-9]|1[0-2])$/.test(String(r.month||''))&&
      r.amount!==null&&r.amount!==undefined&&r.amount!==''&&
      Number.isFinite(Number(r.amount))&&Number(r.amount)>=0&&
      ['paid','pending'].includes(r.status)
    ).sort((a,b)=>String(b.month).localeCompare(String(a.month)));
  };
  // El inicio del aula NO muestra ni cifras ni estados económicos.
  function home(){
    return '<nav class="student-monthly-summary-v263" aria-label="Información administrativa personal">' +
      '<button type="button" data-t16-tool="myPayments" aria-label="Consultar mis mensualidades y pagos">Mensualidades</button>' +
      '</nav>';
  }
  function detail(raw){
    if(raw && !Array.isArray(raw)) return '<section class="window-panel student-monthly-detail-v263"><h2>Mis mensualidades</h2><p role="alert">No se ha podido consultar el estado de los pagos. Inténtalo de nuevo más tarde.</p></section>';
    const rows=filtered(raw);
    if(!rows)return '<section class="window-panel student-monthly-detail-v263"><h2>Mis mensualidades</h2><p role="status">Cargando datos…</p></section>';
    if(!rows.length)return '<section class="window-panel student-monthly-detail-v263"><h2>Mis mensualidades</h2><p>No hay mensualidades registradas.</p></section>';
    return `<section class="window-panel student-monthly-detail-v263"><h2>Mis mensualidades</h2>
      <p class="student-monthly-help-v263">Consulta personal. Si observas alguna diferencia, comunícasela a la profesora.</p>
      <ul class="student-monthly-list-v263">${rows.map(r=>`<li class="student-monthly-item-v263">
        <div class="student-monthly-item-head-v263"><strong>${escape(monthText(r.month))}</strong>
        <span class="student-monthly-status-v263 ${r.status==='paid'?'is-paid':'is-pending'}">${r.status==='paid'?'Pagado':'Pendiente'}</span></div>
        <div class="student-monthly-item-foot-v263"><span>Importe: <strong>${money(r.amount)}</strong></span>
        ${r.status==='paid'?'<span>Fecha de pago: '+escape(dateText(r.paid_date))+'</span>':''}</div>
      </li>`).join('')}</ul></section>`;
  }
  window.TribecaStudentPaymentsV263=Object.freeze({home,detail});
})();