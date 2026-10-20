/* Tribeca Aula v258 · liquidaciones individuales por clase.
   Sin conexiones ni escrituras automaticas: solo una accion docente explicita.
   Las clases previamente cobradas conservan su importe y fecha. */
(() => {
  'use strict';
  const state = () => window.TribecaAuth || {};
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = v => Number(v || 0).toLocaleString('es-ES', {
    style:'currency', currency:'EUR', minimumFractionDigits:2, maximumFractionDigits:2
  });
  const localToday = () => {
    const d = new Date();
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),
      String(d.getDate()).padStart(2,'0')].join('-');
  };
  const isTracked = userId => (state().data?.billing || []).some(b =>
    String(b.user_id) === String(userId) &&
    b.tariff_type === 'individual' && b.attendance_policy === 'confirmed_only' &&
    b.session_settlement_enabled === true);

  function sessions(userId,month) {
    const db = state().data || {};
    const settlements = (db.individualClassSettlements || []).filter(p =>
      String(p.user_id) === String(userId));
    const settledByAttendance = new Map(settlements.map(p => [String(p.attendance_id),p]));
    return (db.attendance || []).filter(a =>
      String(a.user_id) === String(userId) &&
      String(a.class_date || '').startsWith(String(month)) &&
      String(a.class_type || '') === 'individual' &&
      (a.status === 'present' || settledByAttendance.has(String(a.id)))
    ).map(a => ({
      attendance:a,
      payment:settledByAttendance.get(String(a.id)) || null,
      pending:a.status === 'present' && !settledByAttendance.has(String(a.id))
    })).sort((a,b) => String(a.attendance.class_date).localeCompare(String(b.attendance.class_date)) ||
      String(a.attendance.scheduled_start).localeCompare(String(b.attendance.scheduled_start)));
  }

  function summary(userId,month) {
    if(!isTracked(userId)) return null;
    const bill = (state().data?.billing || []).find(b => String(b.user_id) === String(userId));
    const rate = Number(bill?.class_rate || 0);
    const rows = sessions(userId,month);
    const collected = rows.reduce((sum,row) => sum + (row.payment ? Number(row.payment.paid_amount||0) : 0),0);
    const pendingClasses = rows.filter(row => row.pending).length;
    const pending = Math.round(pendingClasses * rate * 100)/100;
    return {rows,collected,pending,expected:collected+pending,
      pendingClasses,paidClasses:rows.filter(row => !!row.payment).length,rate};
  }

  function labelDate(date) {
    const s=String(date||'');
    const parts=s.slice(0,10).split('-');
    return parts.length===3 ? parts[2]+'/'+parts[1]+'/'+parts[0] : s;
  }

  function editor(student, month) {
    const stats=summary(student.id,month);
    if(!stats) return '';
    const rows=stats.rows.map(row => {
      const a=row.attendance, p=row.payment;
      const heading=`${labelDate(a.class_date)} · ${String(a.scheduled_start||'').slice(0,5)}–${String(a.scheduled_end||'').slice(0,5)}`;
      return `<article class="tribeca-session-row-v258 ${p?'is-paid':'is-pending'}">
        <div class="tribeca-session-name-v258"><strong>${escapeHTML(heading)}</strong>
          <span>${p?'Clase abonada':'Asistencia confirmada · pendiente de cobro'}</span></div>
        <strong class="tribeca-session-amount-v258">${money(p?Number(p.paid_amount):stats.rate)}</strong>
        <div class="tribeca-session-actions-v258">
        ${p
          ? `<span class="tribeca-session-paid-v258">Pagada el ${escapeHTML(labelDate(p.paid_date))} · ${escapeHTML(({cash:'Efectivo',bizum:'Bizum',bank_transfer:'Transferencia',other:'Otro'})[p.payment_method]||'Registrado')}</span>`
          : `<label>Fecha de cobro<input type="date" value="${localToday()}" max="${localToday()}" data-tribeca-session-date-v258></label>
            <label>Forma de pago<select data-tribeca-session-method-v258><option value="cash">Efectivo</option><option value="bizum">Bizum</option><option value="bank_transfer">Transferencia</option><option value="other">Otra</option></select></label>
            <button type="button" class="primary-btn" data-tribeca-mark-session-v258="${escapeHTML(a.id)}">Marcar clase como pagada</button>`}
        </div>
      </article>`;
    }).join('');
    return `<section class="tribeca-session-finance-v258" aria-label="Cobros individuales por clase">
      <header class="window-panel"><p class="eyebrow">Cobro por asistencia</p>
        <h3>Clases y pagos · ${escapeHTML(month)}</h3>
        <p>Cada clase asistida se liquida por separado. Lo pagado queda cerrado y las nuevas asistencias se añaden como pendientes.</p></header>
      <div class="tribeca-session-totals-v258" aria-live="polite">
        <div><small>Clases cobradas</small><strong>${stats.paidClasses}</strong></div>
        <div><small>Ya cobrado</small><strong>${money(stats.collected)}</strong></div>
        <div><small>Pendiente (${stats.pendingClasses} clases)</small><strong>${money(stats.pending)}</strong></div>
      </div>
      <div class="tribeca-session-list-v258">
        ${rows || '<p class="window-panel">No hay clases con asistencia confirmada en este mes. Los horarios previstos no generan deuda por sí solos.</p>'}
      </div><p class="tribeca-session-note-v258">Tarifa actual por clase: ${money(stats.rate)}. Los importes ya abonados son históricos y no cambian si se modifica la tarifa posteriormente.</p>
    </section>`;
  }

  function history(userId) {
    const records = (state().data?.individualClassSettlements || [])
      .filter(p => String(p.user_id) === String(userId))
      .slice().sort((a,b)=>String(b.paid_date).localeCompare(String(a.paid_date)));
    return `<table class="premium-table compact"><thead><tr><th>Cobro</th><th>Importe</th><th>Fecha</th><th>Forma</th></tr></thead><tbody>${records.map(p => {
      const a=(state().data?.attendance||[]).find(x=>String(x.id)===String(p.attendance_id));
      return `<tr><td>Clase ${escapeHTML(labelDate(a?.class_date||''))}</td><td>${money(p.paid_amount)}</td><td>${escapeHTML(labelDate(p.paid_date))}</td><td>${escapeHTML(p.payment_method||'')}</td></tr>`;
    }).join('')||'<tr><td colspan="4">Sin cobros registrados</td></tr>'}</tbody></table>`;
  }

  window.TribecaSessionPaymentsV258 = {isTracked,sessions,summary,editor,history};

  document.addEventListener('click', async event => {
    const btn=event.target.closest?.('[data-tribeca-mark-session-v258]');
    if(!btn) return;
    event.preventDefault(); event.stopPropagation();
    const client=state().client, profile=state().profile;
    if(!client || profile?.role!=='teacher') return;
    const row=btn.closest('.tribeca-session-row-v258');
    const date=row?.querySelector('[data-tribeca-session-date-v258]')?.value;
    const method=row?.querySelector('[data-tribeca-session-method-v258]')?.value;
    const id=btn.getAttribute('data-tribeca-mark-session-v258');
    if(!id||!date||!method||date>localToday()) {
      window.alert('Indica una fecha de cobro válida.'); return;
    }
    if(!window.confirm('¿Confirmas que has recibido el pago de esta clase?')) return;
    btn.disabled=true;
    const oldText=btn.textContent;
    btn.textContent='Guardando…';
    try {
      const {error}=await client.rpc('tribeca_mark_individual_class_paid_v258',{
        p_attendance_id:id,p_paid_date:date,p_payment_method:method
      });
      if(error) throw error;
      const fresh=await client.from('individual_class_settlements_v258').select('*');
      if(fresh.error) throw new Error('Cobro guardado. No se pudo actualizar el listado: '+fresh.error.message);
      state().data.individualClassSettlements=fresh.data||[];
      window.rerenderOpenWindows?.();
    } catch(error) {
      window.alert(error?.message||'No se ha podido guardar el cobro.');
      btn.disabled=false;
      btn.textContent=oldText;
    }
  });
})();