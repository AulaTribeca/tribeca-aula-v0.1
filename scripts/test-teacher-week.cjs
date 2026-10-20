const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
process.env.TZ = 'Europe/Madrid';
const source = fs.readFileSync(require('node:path').join(__dirname, '../supabase-auth.js'), 'utf8');
const helpers = source.split('\n').filter(line => /^  const (toIso|addDays) =/.test(line)).join('\n');
const functions = source.slice(source.indexOf('  function teacherWeekBounds('), source.indexOf('  function classColorPalette('));
function select(now, events) {
  const context = vm.createContext({ events, now });
  return JSON.parse(vm.runInContext(`${helpers}\n${functions}\nfunction relevantEvents(){return events;}\nJSON.stringify({bounds:teacherWeekBounds(new Date(now)), events:weekEventsForTeacher(new Date(now))})`, context));
}
const cases = [
  ['martes observado', '2026-10-20T16:00:00', '2026-10-19', '2026-10-25'],
  ['lunes a medianoche', '2026-10-19T00:01:00', '2026-10-19', '2026-10-25'],
  ['domingo y cambio de hora', '2026-10-25T23:59:00', '2026-10-19', '2026-10-25'],
  ['cambio de mes', '2026-11-01T12:00:00', '2026-10-26', '2026-11-01'],
  ['cambio de año', '2027-01-01T12:00:00', '2026-12-28', '2027-01-03'],
];
for (const [label, now, start, end] of cases) test(label, () => {
  const events = [{date:end,title:'Último'}, {date:start,title:'Primero'}, {date:'2000-01-01',title:'Fuera'}, {date:'2099-12-31',title:'Fuera'}, {title:'Sin fecha'}];
  const result = select(now, events);
  assert.deepEqual(result.bounds,{start,end});
  assert.deepEqual(result.events.map(e=>e.title),['Primero','Último']);
});
test('excluye la semana siguiente y conserva todos los eventos del mismo día',()=>{
  const events = [26,27,20,19,25,20].map((d,i)=>({date:`2026-10-${d}`,title:`Evento ${i}`}));
  const before = JSON.stringify(events);
  const result = select('2026-10-20T16:00:00',events);
  assert.deepEqual(result.events.map(e=>e.date),['2026-10-19','2026-10-20','2026-10-20','2026-10-25']);
  assert.equal(JSON.stringify(events),before);
});
test('semana sin eventos',()=>assert.deepEqual(select('2026-10-20T16:00:00',[]).events,[]));
