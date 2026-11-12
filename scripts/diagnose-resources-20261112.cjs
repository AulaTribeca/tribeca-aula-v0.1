/* Diagnóstico sin credenciales ni escritura: dos recursos HTML públicos, 12-11-2026. */
'use strict';
const { chromium }=require('@playwright/test');
const base='https://fuhkvjyfwkggjaqxfsgv.supabase.co/storage/v1/object/public/tribeca-public-assets/interactive-packages/622c9a46-320d-4027-b82d-f4d5304e78fe/';
const entries=[
 {name:'Naturais 6P Unidade 2',url:base+'1794496459435-3zpq9i-naturais2-html/naturais2.html'},
 {name:'English 6P Unit 2',url:base+'1794496587463-yxahb8-unit-2-interactive-intermediate-tribeca-aula-html/Unit_2_Interactive_Intermediate_Tribeca_Aula.html'}
];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const item of entries){
  console.log('\n## '+item.name);
  try{
   const response=await fetch(item.url,{signal:AbortSignal.timeout(15000)});
   const html=await response.text();
   const srcs=Array.from(html.matchAll(/<(?:script|link|img)\b[^>]*(?:src|href)=[\"']([^\"']+)/gi)).slice(0,30).map(x=>x[1]);
   console.log('RESOURCE',JSON.stringify({status:response.status,type:response.headers.get('content-type'),disposition:response.headers.get('content-disposition'),csp:response.headers.get('content-security-policy'),cors:response.headers.get('access-control-allow-origin'),bytes:html.length,doctype:/<!doctype html/i.test(html),title:html.match(/<title[^>]*>([^<]+)/i)?.[1]?.slice(0,100),externalRefs:srcs.filter(x=>!x.startsWith('data:')).slice(0,16)}));
  }catch(err){console.log('RESOURCE_FETCH_ERROR',String(err))}
  for(const viewport of [{width:390,height:844},{width:1365,height:900}]){
   const page=await browser.newPage({viewport});
   const errors=[];
   page.on('pageerror',e=>errors.push('JS '+String(e.message).slice(0,250)));
   page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text().slice(0,250))});
   page.on('requestfailed',req=>errors.push('REQUEST '+new URL(req.url()).hostname+' '+(req.failure()?.errorText||'')));
   const link='http://127.0.0.1:4173/tribeca-package-viewer.html?url='+encodeURIComponent(item.url)+'&title='+encodeURIComponent(item.name);
   try{
    await page.goto(link,{waitUntil:'domcontentloaded',timeout:16000});
    await page.waitForFunction(()=>document.querySelector('.resource-frame')||!document.querySelector('#viewerStatus')?.hidden,{timeout:14000}).catch(()=>{});
    await page.waitForTimeout(1400);
    const state=await page.evaluate(()=>({loaderHidden:document.getElementById('loader')?.hidden,statusText:document.getElementById('viewerStatus')?.innerText.slice(0,250),frames:document.querySelectorAll('.resource-frame').length,bodyScrollWidth:document.body.scrollWidth,viewportWidth:innerWidth}));
    let inner=null;
    try{const f=page.frameLocator('.resource-frame').locator('body');inner=await f.evaluate(el=>({length:el.innerText.length,buttons:el.querySelectorAll('button').length,inputs:el.querySelectorAll('input').length,images:el.querySelectorAll('img').length,visible:!!el.getClientRects().length}),{timeout:4500})}catch(e){inner={error:String(e).slice(0,180)}}
    console.log('VIEWER',JSON.stringify({viewport:viewport.width,state,inner,errors:errors.slice(0,12)}));
   }catch(e){console.log('VIEWER_ERROR',viewport.width,String(e).slice(0,300),errors.slice(0,8))}
   await page.close();
  }
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
