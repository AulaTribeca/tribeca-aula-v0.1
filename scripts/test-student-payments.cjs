// v264. Financial display regression, always synthetic data; no student credentials.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'tribeca-student-payments-v263.js'),'utf8');
const css=fs.readFileSync(path.join(root,'tribeca-student-payments-v263.css'),'utf8');
const auth=fs.readFileSync(path.join(root,'supabase-auth.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sql=fs.readFileSync(path.join(root,'supabase/sql/tribeca-student-monthly-v264-season-and-pause.sql'),'utf8');
const sandbox={window:{},Intl,Date};
vm.runInNewContext(source,sandbox,{filename:'student-payments.js'});
const view=sandbox.window.TribecaStudentPaymentsV263;
test('Portada: cobros no dominan la pantalla, acceso compacto después de las materias',()=>{
  const home=view.home();
  assert.match(home,/data-t16-tool="myPayments"/);
  assert.doesNotMatch(home,/200|420|€|Pendiente|Pagado|importe/i);
  assert.match(css,/width:max-content!important/);
  assert.match(css,/min-height:44px/);
  assert.match(css,/font:500 11px/);
  assert.ok(auth.includes('${videoClassesHomePanel()}${classHtml}${window.TribecaStudentPaymentsV263?.home'));
  assert.ok(auth.includes('${videoClassesHomePanel()}${learningArea}${window.TribecaStudentPaymentsV263?.home'));
  assert.match(html,/tribeca-student-payments-v263\.js\?v=264/);
});
test('Sólo la cuenta privada muestra estado, cuota y fecha de pago',()=>{
  const data=[{month:'2026-10',amount:200,status:'paid',paid_date:'2026-10-30',notes:'CONFIDENCIAL'}];
  const detail=view.detail(data);
  assert.match(detail,/200,00/);
  assert.match(detail,/Pagado/);
  assert.match(detail,/30\/10\/2026/);
  assert.doesNotMatch(detail,/CONFIDENCIAL/);
});
test('Mensualidad pendiente y ausencia de registros sin datos ficticios',()=>{
  const detail=view.detail([{month:'2026-11',amount:30,status:'pending',paid_date:null}]);
  assert.match(detail,/30,00/);
  assert.match(detail,/Pendiente/);
  assert.doesNotMatch(detail,/Fecha de pago/);
  assert.match(view.detail({error:'unavailable'}),/No se ha podido consultar/);
  assert.match(view.detail(null),/Cargando/);
});
test('No se admiten importes inválidos ni texto arbitrario',()=>{
  const detail=view.detail([
    {month:'2026-10',amount:null,status:'paid'},
    {month:'2026-10',amount:-1,status:'paid'},
    {month:'2026-13',amount:200,status:'paid'},
    {month:'2026-11',amount:5,status:'pending',paid_date:'2026-11-02'}
  ]);
  assert.match(detail,/5,00/);
  assert.doesNotMatch(detail,/200,00/);
});
test('RPC: temporadas excluyentes, pagos cerrados inmutables y autorización por identidad',()=>{
  assert.match(sql,/preferred_ss\.user_id=v_uid/);
  assert.match(sql,/schedule_season/);
  assert.match(sql,/whole_pause\.start_date<=v_start/);
  assert.match(sql,/v_amount:=v_payment\.amount_due_snapshot/);
  assert.match(sql,/v_uid uuid := auth\.uid\(\)/);
  assert.match(sql,/REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION[\s\S]*TO authenticated/);
});

test('Los pagos nuevos se validan y los pagos cerrados se muestran sin recalcular',()=>{
 assert.ok(auth.includes('if(paidDateRaw>nowIso) throw new Error'));
 assert.ok(auth.includes('if(Math.abs(year-Number(month.slice(0,4)))>1)'));
 assert.ok(auth.includes('const displayAmount=paymentFinancialAmountV222(s.id,month,calc)'));
 assert.ok(auth.includes('const displayDetail=pay.paid?paymentSnapshotDetailV222(pay,calc):calc.detail'));
});

test('Mes histórico pagado sin snapshot: importe por verificar, nunca 0 inventado',()=>{
 const viewHtml=view.detail([{month:'2026-07',amount:null,status:'paid',paid_date:'2026-07-31'}]);
 assert.match(viewHtml,/Por verificar/);
 assert.match(viewHtml,/Pagado/);
 assert.doesNotMatch(viewHtml,/0,00/);
});
