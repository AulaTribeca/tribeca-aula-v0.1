/* Tribeca Aula v234 · progreso persistente por alumno y recurso */
(() => {
  'use strict';
  if (window.TribecaProgress) return;

  const timers = new Map();
  const boundRoots = new Map();

  const state = () => window.TribecaAuth || null;
  const profile = () => state()?.profile || null;
  const client = () => state()?.client || null;
  const rows = () => state()?.data?.resourceProgress || [];

  function rowFor(materialId){
    const uid=profile()?.id;
    if(!uid || !materialId) return null;
    return rows().find(r=>String(r.user_id)===String(uid) && String(r.material_id)===String(materialId)) || null;
  }
  function getState(materialId){
    const row=rowFor(materialId);
    return row?.state && typeof row.state==='object' ? row.state : {};
  }
  function updateLocal(row){
    const s=state();
    if(!s?.data || !row) return;
    const list=Array.isArray(s.data.resourceProgress) ? s.data.resourceProgress : [];
    const idx=list.findIndex(x=>String(x.user_id)===String(row.user_id) && String(x.material_id)===String(row.material_id));
    if(idx>=0) list[idx]={...list[idx],...row};
    else list.push(row);
    s.data.resourceProgress=list;
  }
  async function save(materialId, payload={}, meta={}){
    const s=state(), p=profile(), db=client();
    if(!db || !p?.id || p.role==='teacher' || !materialId) return null;
    const previous=rowFor(materialId);
    const now=new Date().toISOString();
    const row={
      user_id:p.id,
      material_id:materialId,
      state:payload && typeof payload==='object' ? payload : {},
      progress_percent:Number.isFinite(Number(meta.progressPercent)) ? Math.max(0,Math.min(100,Math.round(Number(meta.progressPercent)))) : Number(previous?.progress_percent||0),
      completed:meta.completed===true ? true : !!previous?.completed,
      last_position:meta.lastPosition==null ? (previous?.last_position||null) : String(meta.lastPosition),
      last_seen_at:now,
      updated_at:now
    };
    const res=await db.from('student_resource_progress').upsert(row,{onConflict:'user_id,material_id'}).select('*').single();
    if(res.error){ console.warn('[Tribeca Aula] No se pudo guardar progreso:',res.error.message||res.error); return null; }
    updateLocal(res.data||row);
    return res.data||row;
  }
  function queueSave(materialId,payload,meta={}){
    if(!materialId || profile()?.role==='teacher') return;
    const key=String(materialId);
    clearTimeout(timers.get(key));
    timers.set(key,setTimeout(()=>{ timers.delete(key); save(materialId,payload,meta).catch(()=>{}); },550));
  }

  function fieldKey(el,index){
    const id=el.id ? 'id:'+el.id : '';
    const name=el.name ? 'name:'+el.name : '';
    const key=el.getAttribute?.('data-progress-key') ? 'data:'+el.getAttribute('data-progress-key') : '';
    return key || id || name || 'idx:'+index;
  }
  function captureDom(root){
    if(!root?.querySelectorAll) return {};
    const controls=[...root.querySelectorAll('input,textarea,select,[contenteditable="true"]')].map((el,index)=>{
      const type=String(el.type||el.tagName||'').toLowerCase();
      return {
        key:fieldKey(el,index),index,type,
        value:el.isContentEditable ? el.textContent : (type==='checkbox'||type==='radio' ? String(el.value??'') : String(el.value??'')),
        checked:type==='checkbox'||type==='radio' ? !!el.checked : undefined,
        selectedIndex:el.tagName==='SELECT' ? el.selectedIndex : undefined
      };
    });
    const details=[...root.querySelectorAll('details')].map((el,index)=>({index,open:!!el.open}));
    const schemaZones=[...root.querySelectorAll('[data-t133-zone]')].map(z=>({
      id:String(z.dataset.t133Zone||''),
      itemId:String(z.dataset.itemId||''),
      itemText:String(z.dataset.itemText||''),
      value:String(z.querySelector('input,textarea')?.value||''),
      classes:[...z.classList].filter(x=>/correct|wrong|empty|selected|used/i.test(x))
    }));
    const view=root.ownerDocument?.defaultView || window;
    return {controls,details,schemaZones,scrollY:Number(view.scrollY||0),savedAt:new Date().toISOString()};
  }
  function restoreDom(root,saved){
    const dom=saved?.dom || saved?.bridge?.dom || saved;
    if(!root?.querySelectorAll || !dom || typeof dom!=='object') return;
    const controls=[...root.querySelectorAll('input,textarea,select,[contenteditable="true"]')];
    (dom.controls||[]).forEach(rec=>{
      let el=null;
      if(rec.key?.startsWith('id:')) el=root.querySelector('#'+CSS.escape(rec.key.slice(3)));
      if(!el && rec.key?.startsWith('data:')) el=root.querySelector('[data-progress-key="'+String(rec.key.slice(5)).replace(/"/g,'\\\"')+'"]');
      if(!el && rec.key?.startsWith('name:')){
        const same=controls.filter(x=>String(x.name||'')===rec.key.slice(5));
        el=same.find(x=>String(x.value??'')===String(rec.value??'')) || same[0] || null;
      }
      if(!el && Number.isInteger(rec.index)) el=controls[rec.index]||null;
      if(!el) return;
      const type=String(el.type||el.tagName||'').toLowerCase();
      if(type==='checkbox'||type==='radio') el.checked=!!rec.checked;
      else if(el.isContentEditable) el.textContent=rec.value??'';
      else if(el.tagName==='SELECT' && Number.isInteger(rec.selectedIndex)) el.selectedIndex=rec.selectedIndex;
      else el.value=rec.value??'';
    });
    (dom.details||[]).forEach(rec=>{ const el=root.querySelectorAll('details')[rec.index]; if(el) el.open=!!rec.open; });
    (dom.schemaZones||[]).forEach(rec=>{
      const zone=[...root.querySelectorAll('[data-t133-zone]')].find(z=>String(z.dataset.t133Zone||'')===String(rec.id||''));
      if(!zone) return;
      const input=zone.querySelector('input,textarea');
      if(input) input.value=rec.value||'';
      if(rec.itemId){
        zone.dataset.itemId=rec.itemId;
        zone.dataset.itemText=rec.itemText||'';
        if(!input) zone.innerHTML='<span>'+String(rec.itemText||'').replace(/[&<>]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]))+'</span>';
      }
      (rec.classes||[]).forEach(cls=>zone.classList.add(cls));
    });
    const used=new Set((dom.schemaZones||[]).map(z=>z.itemId).filter(Boolean));
    root.querySelectorAll('[data-t133-item]').forEach(btn=>btn.classList.toggle('is-used',used.has(String(btn.dataset.t133Item||''))));
    if(Number(dom.scrollY)>0){
      const view=root.ownerDocument?.defaultView || window;
      setTimeout(()=>{ try{ view.scrollTo({top:Number(dom.scrollY),behavior:'auto'}); }catch(_e){ view.scrollTo(0,Number(dom.scrollY)); } },80);
    }
  }
  function progressPercent(root){
    const controls=[...root.querySelectorAll('input:not([type="hidden"]),textarea,select')].filter(x=>!x.disabled);
    if(!controls.length) return 0;
    let done=0;
    const radios=new Set();
    controls.forEach(el=>{
      const type=String(el.type||'').toLowerCase();
      if(type==='radio'){
        if(radios.has(el.name)) return;
        radios.add(el.name);
        if(root.querySelector('input[type="radio"][name="'+CSS.escape(el.name)+'"]:checked')) done++;
      } else if(type==='checkbox'){ if(el.checked) done++; }
      else if(String(el.value||'').trim()) done++;
    });
    const total=controls.filter(x=>String(x.type||'').toLowerCase()!=='radio').length + radios.size;
    return total ? Math.round((done/total)*100) : 0;
  }
  function bindRoot(root,materialId,kind='activity'){
    if(!root || !materialId || profile()?.role==='teacher') return;
    const key=String(materialId);
    if(root.dataset.tribecaProgressBound==='1') return;
    root.dataset.tribecaProgressBound='1';
    boundRoots.set(key,root);
    restoreDom(root,getState(key));
    const persist=()=>queueSave(key,{kind,dom:captureDom(root)},{progressPercent:progressPercent(root)});
    root.addEventListener('input',persist,true);
    root.addEventListener('change',persist,true);
    root.addEventListener('click',()=>setTimeout(persist,0),true);
    const mo=new MutationObserver(()=>persist());
    mo.observe(root,{subtree:true,attributes:true,attributeFilter:['class','hidden','open','aria-pressed','aria-selected','aria-expanded']});
    window.addEventListener('pagehide',()=>{ try{ save(key,{kind,dom:captureDom(root)},{progressPercent:progressPercent(root)}); }catch(_e){} },{once:false});
  }
  async function markCompleted(materialId){
    const key=String(materialId||'');
    if(!key) return;
    const root=boundRoots.get(key);
    const current=getState(key);
    const payload=root ? {...current,dom:captureDom(root)} : current;
    await save(key,payload,{completed:true,progressPercent:100});
  }

  function childBridgeSource(materialId,initialState,userId){
    const initial=initialState?.bridge || {};
    const mid=JSON.stringify(String(materialId||''));
    const uid=JSON.stringify(String(userId||''));
    const init=JSON.stringify(initial);
    return `(function(){
'use strict';
var MID=${mid}, UID=${uid}, INITIAL=${init}||{}, timer=null, tracked=new Set(Object.keys((INITIAL.storage)||{}));
var prefix='tribeca-resource:'+UID+':'+MID+':';
try{
  var ls=window.localStorage, proto=Object.getPrototypeOf(ls);
  var nativeGet=proto.getItem, nativeSet=proto.setItem, nativeRemove=proto.removeItem, nativeClear=proto.clear, nativeKey=proto.key;
  Object.entries(INITIAL.storage||{}).forEach(function(pair){nativeSet.call(ls,prefix+pair[0],String(pair[1]));});
  proto.getItem=function(k){if(this===ls){tracked.add(String(k));return nativeGet.call(this,prefix+String(k));}return nativeGet.call(this,k);};
  proto.setItem=function(k,v){if(this===ls){tracked.add(String(k));nativeSet.call(this,prefix+String(k),String(v));schedule();return;}return nativeSet.call(this,k,v);};
  proto.removeItem=function(k){if(this===ls){tracked.add(String(k));nativeRemove.call(this,prefix+String(k));schedule();return;}return nativeRemove.call(this,k);};
  proto.clear=function(){if(this===ls){var keys=[];for(var i=0;i<this.length;i++){var k=nativeKey.call(this,i);if(k&&k.indexOf(prefix)===0)keys.push(k);}keys.forEach(function(k){nativeRemove.call(ls,k);});tracked.clear();schedule();return;}return nativeClear.call(this);};
}catch(e){}
function controls(){
 return Array.prototype.map.call(document.querySelectorAll('input,textarea,select,[contenteditable="true"]'),function(el,i){
  var type=String(el.type||el.tagName||'').toLowerCase();
  return {index:i,id:el.id||'',name:el.name||'',type:type,value:el.isContentEditable?el.textContent:String(el.value==null?'':el.value),checked:(type==='checkbox'||type==='radio')?!!el.checked:null,selectedIndex:el.tagName==='SELECT'?el.selectedIndex:null};
 });
}
function storage(){var out={};try{tracked.forEach(function(k){var v=localStorage.getItem(k);if(v!==null)out[k]=v;});}catch(e){}return out;}
function collect(){
 return {dom:{controls:controls(),details:Array.prototype.map.call(document.querySelectorAll('details'),function(d,i){return {index:i,open:!!d.open};}),scrollY:Number(window.scrollY||0)},storage:storage(),hash:location.hash||'',savedAt:new Date().toISOString()};
}
function restore(){
 var dom=INITIAL.dom||{}, all=document.querySelectorAll('input,textarea,select,[contenteditable="true"]');
 (dom.controls||[]).forEach(function(r){var el=null;if(r.id)el=document.getElementById(r.id);if(!el&&r.name){var same=document.getElementsByName(r.name);for(var i=0;i<same.length;i++){if(String(same[i].value||'')===String(r.value||'')){el=same[i];break;}}el=el||same[0];}el=el||all[r.index];if(!el)return;var t=String(el.type||el.tagName||'').toLowerCase();if(t==='checkbox'||t==='radio')el.checked=!!r.checked;else if(el.isContentEditable)el.textContent=r.value||'';else if(el.tagName==='SELECT'&&Number.isInteger(r.selectedIndex))el.selectedIndex=r.selectedIndex;else el.value=r.value||'';});
 (dom.details||[]).forEach(function(r){var d=document.querySelectorAll('details')[r.index];if(d)d.open=!!r.open;});
 if(INITIAL.hash){try{history.replaceState(null,'',INITIAL.hash);}catch(e){}}
 if(Number(dom.scrollY)>0)setTimeout(function(){window.scrollTo(0,Number(dom.scrollY));},120);
}
function send(){try{parent.postMessage({type:'TRIBECA_RESOURCE_PROGRESS_SAVE',materialId:MID,state:collect()},'*');}catch(e){}}
function schedule(){clearTimeout(timer);timer=setTimeout(send,450);}
document.addEventListener('input',schedule,true);document.addEventListener('change',schedule,true);document.addEventListener('click',function(){setTimeout(schedule,0);},true);
window.addEventListener('pagehide',send);window.addEventListener('beforeunload',send);
document.addEventListener('DOMContentLoaded',function(){restore();setTimeout(restore,150);schedule();});
try{new MutationObserver(schedule).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class','hidden','open','aria-pressed','aria-selected','aria-expanded']});}catch(e){}
})();`;
  }
  function injectBridgeIntoHtml(html,materialId){
    const p=profile();
    if(!p?.id || p.role==='teacher' || !materialId) return String(html||'');
    const raw=String(html||'');
    const script='<script>'+childBridgeSource(materialId,getState(materialId),p.id).replace(/<\/script/gi,'<\\/script')+'<\\/script>';
    if(/<head[^>]*>/i.test(raw)) return raw.replace(/<head[^>]*>/i,m=>m+script);
    if(/<html[^>]*>/i.test(raw)) return raw.replace(/<html[^>]*>/i,m=>m+'<head>'+script+'</head>');
    return '<!doctype html><html><head><meta charset="utf-8">'+script+'</head><body>'+raw+'</body></html>';
  }
  window.addEventListener('message',ev=>{
    const d=ev.data||{};
    if(d.type!=='TRIBECA_RESOURCE_PROGRESS_SAVE' || !d.materialId || profile()?.role==='teacher') return;
    const frames=[...document.querySelectorAll('iframe[data-tribeca-progress-material]')];
    const valid=frames.some(f=>String(f.dataset.tribecaProgressMaterial||'')===String(d.materialId) && f.contentWindow===ev.source);
    if(!valid) return;
    const pct=(()=>{const cs=d.state?.dom?.controls||[];if(!cs.length)return 0;const done=cs.filter(x=>x.checked===true || (x.type!=='checkbox'&&x.type!=='radio'&&String(x.value||'').trim())).length;return Math.round((done/cs.length)*100);})();
    queueSave(d.materialId,{kind:'embedded',bridge:d.state},{progressPercent:pct});
  });

  window.TribecaProgress={rowFor,getState,save,queueSave,bindRoot,markCompleted,injectBridgeIntoHtml};
})();