const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../resource-progress.js'),'utf8');
function setup(){
  let listener;const pending=new Map(),writes=[];let id=0;
  const frames=['','/qa/page2.html'].map(page=>({dataset:{tribecaProgressMaterial:'material',tribecaProgressPage:page},contentWindow:{},hasAttribute:()=>true}));
  const state={profile:{id:'student-a',role:'student'},data:{resourceProgress:[]},client:{from:()=>({upsert:row=>({select:()=>({single:async()=>{writes.push(row);return {data:row};}})})})}};
  const window={TribecaAuth:state,addEventListener:(name,fn)=>{if(name==='message')listener=fn;}};
  vm.runInNewContext(source,{window,document:{querySelectorAll:()=>frames},Map,Set,console,setTimeout:fn=>{pending.set(++id,fn);return id;},clearTimeout:id=>pending.delete(id)});
  return {state,window,frames,writes,send:(i,value,origin)=>listener({source:origin||frames[i].contentWindow,data:{type:'TRIBECA_RESOURCE_PROGRESS_SAVE',materialId:'material',state:{storage:{answer:value},dom:{controls:[]}}}}),flush:async()=>{for(const fn of pending.values())fn();pending.clear();await new Promise(resolve=>setImmediate(resolve));}};
}
test('El guardado rápido de dos páginas conserva respuestas separadas',async()=>{
  const s=setup();s.send(0,'primera');s.send(1,'segunda');await s.flush();
  assert.equal(s.writes.length,1);
  assert.equal(s.writes[0].state.bridge.storage.answer,'primera');
  assert.equal(s.writes[0].state.pages['/qa/page2.html'].storage.answer,'segunda');
  const html=s.window.TribecaProgress.injectBridgeIntoHtml('<html><head></head></html>','material','/qa/page2.html');
  assert.ok(html.includes('segunda'));assert.ok(!html.includes('primera'));
});
test('Los mensajes ajenos al iframe no guardan respuestas',async()=>{
  const s=setup();s.send(0,'falsa',{});await s.flush();assert.equal(s.writes.length,0);
});
test('Cambiar de alumno no recupera las respuestas en memoria del anterior',()=>{
  const s=setup();s.send(1,'respuesta-privada');s.state.profile.id='student-b';
  const html=s.window.TribecaProgress.injectBridgeIntoHtml('<html><head></head></html>','material','/qa/page2.html');
  assert.ok(!html.includes('respuesta-privada'));
});
