/* Tribeca Aula v263 — solo resumen privado; nunca notas de la profesora. */
(function buildStudentPaymentsV263(){
  'use strict';
  const escape = v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(n||0));
  const monthText=m=>{
    const match=/^(\d{4})-(\d{2})$/.exec(String(m||''));
    if(!match)return 'Mes';
    return new Intl.DateTimeFormat('es-ES',{year:'numeric',month:'long',timeZone:'Europe/Madrid'}).format(
      new Date(Date.UTC(Number(match[1]),Number(match[2])-1,1)));
  };
  const dateText=d=>{
    const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d||''));
    return match ? [match[3],match[2],match[1]].join('/') : '—';
  };
  const filtered=raw=>{
    if(!Array.isArray(raw))return null;
    return raw.filter(r=>r&&/^\d{4}-(0[1-9]|1[0-2])$/.test(String(r.month||''))&&
      Number.isFinite(Number(r.amount))&&Number(r.amount)>=0&&
      ['paid','pending'].includes(r.status)
    ).sort((a,b)=>String(b.month).localeCompare(String(a.month)));
  };
  function home(raw){
    const rows=filtered(raw);
    const today=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',
      year:'numeric',month:'2-digit'}).formatToParts(new Date());
    const m=today.find(p=>p.type==='month')?.value;
    const y=today.find(p=>p.type==='year')?.value;
    const current=rows?.find(r=>r.month===y+'-'+m)||rows?.[0]||null;
    const paid=current?.status==='paid';
    const state=rows===null?'Cargando…':current?(paid?'Pagado':'Pendiente'):'Sin datos';
    const date=paid && current.paid_date ? ' · '+dateText(current.paid_date) : '';
    // La pedagogía va primero: una sola línea informativa al final de las materias.
    // No se renderizan tarjetas financieras, avisos ni notas internas.
    return '<aside class="student-monthly-summary-v263" aria-label="Consulta privada de mensualidad">'+
      '<span class="student-monthly-label-v263">Mensualidad'+(current?' · '+escape(monthText(current.month)):'')+'</span>'+
      '<span class="student-monthly-amount-v263">'+(rows===null||!current?'—':money(current.amount))+'</span>'+
      '<span class="student-monthly-state-v263'+(paid?' is-paid':'')+'">'+
        escape(state+date)+'</span>'+
      '<button type="button" class="student-monthly-link-v263" data-t16-tool="myPayments" aria-label="Consultar mis mensualidades">Ver meses</button>'+
    '</aside>';
  }
    function detail(raw){
    const rows=filtered(raw);
    if(!rows)return '<section class="window-panel student-monthly-detail-v263"><h2>Mis mensualidades</h2><p role="status">Cargando…</p></section>';
    if(!rows.length)return '<section class="window-panel student-monthly-detail-v263"><h2>Mis mensualidades</h2><p>No hay mensualidades registradas.</p></section>';
    return `<section class="window-panel student-monthly-detail-v263"><h2>Mis mensualidades</h2>
      <div class="student-monthly-table-wrap-v263"><table class="student-monthly-table-v263">
      <thead><tr><th scope="col">Mes</th><th scope="col">Importe</th><th scope="col">Estado</th><th scope="col">Fecha de pago</th></tr></thead>
      <tbody>${rows.map(r=>`<tr><th scope="row">${escape(monthText(r.month))}</th>
        <td class="is-money">${money(r.amount)}</td>
        <td><span class="student-monthly-status-v263 ${r.status==='paid'?'is-paid':'is-pending'}">${r.status==='paid'?'Pagado':'Pendiente'}</span></td>
        <td>${r.status==='paid'?escape(dateText(r.paid_date)):'—'}</td></tr>`).join('')}</tbody>
      </table></div></section>`;
  }
  window.TribecaStudentPaymentsV263=Object.freeze({home,detail});
})();
