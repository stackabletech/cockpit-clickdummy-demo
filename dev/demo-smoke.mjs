// Smoke test of the static demo in Chromium: the main flows, the contact modal
// for everything that would change data, and every console problem on the way.
//
//   npm run build:demo && PORT=4181 npm run serve:demo &
//   node dev/demo-smoke.mjs http://localhost:4181 [screenshot-dir]
//
// Pass the full origin including the base path, e.g.
// http://localhost:4181/cockpit-clickdummy-demo. Exits non-zero on failure.

import { chromium } from '@playwright/test';

const [origin = 'http://localhost:4181', out] = process.argv.slice(2);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const problems = [];
page.on(
  'console',
  (m) => ['error', 'warning'].includes(m.type()) && problems.push(`${m.type()}: ${m.text()}`)
);
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${r.url()}`));

const gate = page.getByRole('dialog').filter({ hasText: /get in contact|interested/i });
async function expectGate(label) {
  await gate.waitFor({ timeout: 5000 });
  const contact = await gate.getByRole('link', { name: /contact/i }).getAttribute('href');
  if (!new URL(contact).searchParams.get('subject')?.includes('Stackable Web UI')) {
    problems.push(`Contact link without the subject: ${contact}`);
  }
  console.log(`ok  ${label}: contact modal`);
  await page.getByRole('button', { name: /keep exploring/i }).click();
  await gate.waitFor({ state: 'hidden' });
}
async function screenshot(name) {
  if (out) await page.screenshot({ path: `${out}/${name}.png` });
}

try {
  await page.goto(origin + '/');
  await page.getByRole('button', { name: 'User menu' }).waitFor();
  console.log('ok  dashboard with user menu');
  await screenshot('1-dashboard');

  await page
    .getByRole('link', { name: /Spark History Server/ })
    .first()
    .click();
  await expectGate('bookmark');

  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByRole('link', { name: /sign out/i }).click();
  await expectGate('sign out');

  await page.goto(origin + '/trino');
  const run = page.getByRole('button', { name: /^run/i }).first();
  await page.locator('.monaco-editor').waitFor({ timeout: 15000 });
  await page.waitForFunction((el) => !el.disabled, await run.elementHandle(), { timeout: 15000 });
  await run.click();
  await page
    .getByText(/FINISHED|Finished/)
    .first()
    .waitFor({ timeout: 15000 });
  console.log('ok  trino example queries finish');
  await screenshot('2-trino');

  const pagesBefore = page.context().pages().length;
  await page
    .getByRole('link', { name: /view in trino/i })
    .first()
    .click();
  await expectGate('view in trino');
  if (page.context().pages().length !== pagesBefore) problems.push('View in Trino opened a tab');

  // A new tab starts like the real app, with a query the demo can run.
  await page.getByRole('button', { name: 'New Tab' }).click();
  await page.locator('.monaco-editor').getByText('SELECT 1').first().waitFor();
  if ((await page.locator('.monaco-editor').first().innerText()).includes('Welcome')) {
    problems.push('New tab contains the welcome script');
  }
  await run.click();
  await page
    .getByText(/FINISHED|Finished/)
    .first()
    .waitFor({ timeout: 15000 });
  console.log('ok  new tab runs SELECT 1');

  await page.locator('.monaco-editor').first().click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('SELECT 42');
  await run.click();
  await expectGate('own SQL');

  await page.goto(origin + '/storage');
  await page.getByText('lakehouse').first().click();
  await page.getByText('exports').first().click();
  await page.getByText('orders-2026-03.csv').first().waitFor();
  console.log('ok  storage browse');
  await screenshot('3-storage');

  // Parquet: schema and statistics first, rows on the Data tab.
  await page.goto(`${origin}/storage/browse/s3.demo.example/lakehouse/warehouse/customers/data`);
  await page.getByText('00000-0-data.parquet').first().click();
  await page.getByRole('button', { name: /^preview$/i }).click();
  const previewDialog = page.getByRole('dialog').filter({ hasText: '00000-0-data.parquet' });
  await previewDialog.getByText('mktsegment').first().waitFor();
  await screenshot('4-parquet-schema');
  await previewDialog.getByRole('tab', { name: 'Data', exact: true }).click();
  // Not row 1: its name is also the column's minimum on the hidden Metadata tab.
  await previewDialog.getByText('Customer#000000002').first().waitFor();
  console.log('ok  parquet preview: schema and rows');
  await screenshot('5-parquet-data');
  await page.keyboard.press('Escape');

  // Other binary files: the "cannot be displayed" fallback, not an empty editor.
  await page.goto(`${origin}/storage/browse/s3.demo.example/ml-models/churn/v3`);
  await page.getByText('model.onnx').first().click();
  await page.getByRole('button', { name: /^preview$/i }).click();
  await page
    .getByRole('dialog')
    .getByText(/binary/i)
    .first()
    .waitFor();
  console.log('ok  binary preview: fallback');
  await screenshot('6-binary');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /download full file/i })
    .click();
  await expectGate('download full file');
  await page.keyboard.press('Escape');

  // The toolbar's Download button for the selected file.
  await page.getByRole('button', { name: /^download$/i }).click();
  await expectGate('download toolbar');

  await page.goto(origin + '/settings/connections');
  await page.getByText('Demo object store').first().waitFor();
  console.log('ok  settings connections');
} catch (err) {
  problems.push(`failed: ${err.message.split('\n')[0]}`);
  await screenshot('failure');
}

await browser.close();
console.log(problems.join('\n') || 'no console problems');
process.exit(problems.length ? 1 : 0);
