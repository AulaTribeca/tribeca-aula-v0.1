import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('../tribeca-session-payments-v258.js', import.meta.url), 'utf8');

async function loadSynthetic(page) {
  await page.goto('about:blank');
  await page.evaluate(() => {
    const user='qa-sofia';
    window.TribecaAuth = {
      profile:{role:'teacher'},
      data:{
        billing:[{user_id:user,tariff_type:'individual',attendance_policy:'confirmed_only',
          session_settlement_enabled:true,class_rate:14}],
        attendance:[
          {id:'a1',user_id:user,class_date:'2026-10-06',status:'present',class_type:'individual',scheduled_start:'16:30',scheduled_end:'17:30'},
          {id:'a2',user_id:user,class_date:'2026-10-13',status:'present',class_type:'individual',scheduled_start:'16:30',scheduled_end:'17:30'}
        ],
        individualClassSettlements:[
          {attendance_id:'a1',user_id:user,paid_date:'2026-10-20',paid_amount:14,payment_method:'cash'},
          {attendance_id:'a2',user_id:user,paid_date:'2026-10-20',paid_amount:14,payment_method:'cash'}
        ]
      }
    };
  });
  await page.addScriptTag({content:source});
}

test('Sofía: dos sesiones históricas suman 28 euros sin deuda nueva', async ({page}) => {
  await loadSynthetic(page);
  const result=await page.evaluate(() => window.TribecaSessionPaymentsV258.summary('qa-sofia','2026-10'));
  expect(result.paidClasses).toBe(2);
  expect(result.collected).toBe(28);
  expect(result.pending).toBe(0);
  expect(result.pendingClasses).toBe(0);
  expect(result.expected).toBe(28);
});

test('Una tercera asistencia confirmada se cobra por separado, sin modificar lo anterior', async ({page}) => {
  await loadSynthetic(page);
  const result=await page.evaluate(() => {
    const state=window.TribecaAuth.data;
    state.attendance.push({id:'a3',user_id:'qa-sofia',class_date:'2026-10-15',
      status:'present',class_type:'individual',scheduled_start:'16:30',scheduled_end:'17:30'});
    const before=window.TribecaSessionPaymentsV258.summary('qa-sofia','2026-10');
    state.individualClassSettlements.push({attendance_id:'a3',user_id:'qa-sofia',
      paid_date:'2026-10-20',paid_amount:14,payment_method:'cash'});
    const after=window.TribecaSessionPaymentsV258.summary('qa-sofia','2026-10');
    return {
      before:{collected:before.collected,pending:before.pending,expected:before.expected,pendingClasses:before.pendingClasses},
      after:{collected:after.collected,pending:after.pending,expected:after.expected,pendingClasses:after.pendingClasses}
    };
  });
  expect(result.before).toEqual({collected:28,pending:14,expected:42,pendingClasses:1});
  expect(result.after).toEqual({collected:42,pending:0,expected:42,pendingClasses:0});
});

test('Pago independiente usa RPC docente y se actualiza solo después de respuesta válida', async ({page}) => {
  await loadSynthetic(page);
  await page.evaluate(() => {
    const s=window.TribecaAuth.data;
    s.attendance.push({id:'a3',user_id:'qa-sofia',class_date:'2026-10-15',
      status:'present',class_type:'individual',scheduled_start:'16:30',scheduled_end:'17:30'});
    window.confirm=()=>true;
    window.__qaRPC=[];
    window.TribecaAuth.client={
      rpc:async (name,params)=>{
        window.__qaRPC.push({name,params});
        s.individualClassSettlements.push({attendance_id:'a3',user_id:'qa-sofia',
          paid_amount:14,paid_date:params.p_paid_date,payment_method:params.p_payment_method});
        return {data:{},error:null};
      },
      from:()=>({select:async()=>({data:s.individualClassSettlements,error:null})})
    };
    window.rerenderOpenWindows=()=>document.body.innerHTML=window.TribecaSessionPaymentsV258.editor({id:'qa-sofia'},'2026-10');
    window.rerenderOpenWindows();
  });
  const btn=page.locator('[data-tribeca-mark-session-v258="a3"]');
  await expect(btn).toBeVisible();
  await btn.click();
  await expect.poll(()=>page.evaluate(() => window.__qaRPC.length)).toBe(1);
  expect(await page.evaluate(()=>window.__qaRPC[0].name)).toBe('tribeca_mark_individual_class_paid_v258');
  await expect.poll(()=>page.evaluate(()=>window.TribecaSessionPaymentsV258.summary('qa-sofia','2026-10').pending)).toBe(0);
  expect(await page.locator('.tribeca-session-row-v258.is-paid').count()).toBe(3);
});
