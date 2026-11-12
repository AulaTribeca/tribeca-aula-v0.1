import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const resource='recursos/english-6-primaria-unit-2-interactive-v265.html';
const corrected=await readFile(new URL('../'+resource,import.meta.url),'utf8');

test('English 6P Unit 2: Start muestra vocabulario y permite completar las nueve etapas', async({page})=>{
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./'+resource,{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('button',{name:'Start',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Start',exact:true}).click();
  await expect(page.locator('.screen.active .vocabCard')).toHaveCount(26);
  await expect(page.locator('.screen.active .speak')).toHaveCount(26);
  for(let i=0;i<9;i++){
    const screen=page.locator('.screen.active');
    await expect(screen).toBeVisible();
    if(i===5){
      const correct=[
        'The park is more relaxing than the city.',
        'The castle is older than the cinema.',
        'This café is better than that restaurant.',
        'This is the most beautiful park in the town.',
        'That cave is the most frightening place here.',
        'The countryside is less crowded than the city.'
      ];
      for(let j=0;j<correct.length;j++){
        const row=screen.locator('.q').nth(j);
        await row.locator('input').fill(correct[j]);
        await row.getByRole('button',{name:'Check'}).click();
        await expect(row.locator('.feedback.good')).not.toBeEmpty();
      }
    }else{
      const rows=screen.locator('.q');
      const count=await rows.count();
      expect(count).toBeGreaterThan(0);
      for(let j=0;j<count;j++){
        const row=rows.nth(j);
        await row.locator('.opt').first().click();
        await expect(row.locator('.feedback.good')).not.toBeEmpty();
      }
    }
    const next=page.locator('.screen.active .actions .btn.orange');
    await expect(next).toBeVisible();
    await next.click();
  }
  await expect(page.getByText('Unit 2 complete')).toBeVisible();
  await expect(page.locator('.end .big')).toHaveText('54');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(3);
  expect(errors).toEqual([]);
});

test('English 6P Unit 2: el botón Start funciona en iframe sandbox sin localStorage',async({page})=>{
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<iframe id="sandboxed" title="Unit 2" sandbox="allow-scripts" style="width:100%;height:900px;border:0"></iframe>');
  await page.evaluate(html=>{document.querySelector('#sandboxed').srcdoc=html;},corrected);
  const frame=page.frameLocator('#sandboxed');
  await expect(frame.getByRole('button',{name:'Start',exact:true})).toBeVisible();
  await frame.getByRole('button',{name:'Start',exact:true}).click();
  await expect(frame.locator('.screen.active .vocabCard')).toHaveCount(26);
  await frame.locator('.screen.active .q').first().locator('.opt').first().click();
  await expect(frame.locator('.screen.active .feedback.good')).toHaveCount(1);
  expect(errors).toEqual([]);
});
