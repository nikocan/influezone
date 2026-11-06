/**
 * End-to-end smoke test (demo mode). Requires a running dev server:
 *   npm run dev   (in another terminal)   then   node e2e/smoke.cjs [baseUrl] [screenshotDir]
 * Uses the preinstalled Playwright/Chromium.
 */
const { chromium } = require('playwright');
const zlib = require('zlib');
const fs = require('fs');

const BASE = process.argv[2] || 'http://localhost:5173';
const OUT = process.argv[3] || null;

function png(w, h, rgb) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = rgb[0] * (1 - y / h) + 40; raw[o + 1] = rgb[1]; raw[o + 2] = rgb[2] * (x / w); } }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const results = [];
async function step(name, fn) {
  try { await fn(); results.push(['PASS', name]); }
  catch (e) { results.push(['FAIL', name, e.message.split('\n')[0]]); }
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'tr-TR' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const shot = async (n) => { if (OUT) await page.screenshot({ path: `${OUT}/${n}.png` }); };
  const user = 'test' + Date.now().toString(36).slice(-5);

  await step('first visit shows landing', async () => {
    await page.goto(BASE + '/');
    await page.getByRole('heading', { name: /Etkinin gelire/ }).waitFor();
  });
  await step('register with consents', async () => {
    await page.getByRole('link', { name: /Ücretsiz katıl/ }).click();
    await page.getByLabel('Ad Soyad', { exact: true }).fill('Test Kullanıcı');
    await page.getByLabel('Kullanıcı adı', { exact: true }).fill(user);
    await page.getByLabel('E-posta', { exact: true }).fill(`${user}@example.com`);
    await page.getByLabel('Şifre', { exact: true }).fill('Guclu!Sifre123');
    await page.getByRole('checkbox').nth(0).check();
    await page.getByRole('checkbox').nth(1).check();
    await shot('e01-register');
    await page.getByRole('button', { name: 'Hesap oluştur' }).click();
    await page.getByRole('heading', { name: /E-postanızı doğrulayın/ }).waitFor();
  });
  await step('verify email with demo code', async () => {
    const code = (await page.locator('strong.font-mono').innerText()).trim();
    await page.getByLabel('Doğrulama kodu').fill(code);
    await shot('e02-verify');
    await page.getByRole('button', { name: 'Doğrula' }).click();
    await page.getByRole('heading', { name: /Sizi tanıyalım/ }).waitFor();
  });
  await step('role + interest onboarding (creator)', async () => {
    await page.getByRole('radio', { name: /^İçerik üretici/ }).click();
    await page.getByRole('button', { name: /Moda/ }).click();
    await page.getByRole('button', { name: /Aksesuar/ }).click();
    await shot('e03-onboarding');
    await page.getByRole('button', { name: 'Devam et' }).click();
    await page.getByRole('heading', { name: /İçerik üretici profili/ }).waitFor();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Profili tamamla' }).click();
    await page.getByRole('heading', { name: /Merhaba/ }).waitFor();
    await shot('e04-studio');
  });
  await step('home feed renders posts', async () => {
    await page.goto(BASE + '/');
    await page.locator('article').first().waitFor();
    await shot('e05-home');
  });
  await step('like a post (optimistic + persisted)', async () => {
    const like = page.locator('article').first().getByRole('button', { name: 'Beğen', exact: true });
    await like.click();
    await page.locator('article').first().getByRole('button', { name: 'Beğeniyi geri al' }).waitFor();
  });
  await step('comment on a post', async () => {
    await page.locator('article').first().getByRole('button', { name: 'Yorumlar' }).click();
    await page.getByRole('textbox', { name: 'Yorum ekle…' }).fill('Harika görünüyor! #test');
    await page.getByRole('button', { name: 'Gönder' }).click();
    await page.getByText('Harika görünüyor!').waitFor();
    await shot('e06-comments');
    await page.keyboard.press('Escape');
  });
  await step('follow creator', async () => {
    await page.locator('article').first().getByRole('button', { name: 'Takip et' }).click();
    await page.locator('article').first().getByRole('button', { name: 'Takiptesin' }).waitFor();
  });
  await step('save post to new collection', async () => {
    await page.locator('article').first().getByRole('button', { name: 'Kaydet' }).click();
    await page.getByRole('button', { name: /Yeni koleksiyon/ }).click();
    await page.getByLabel('Koleksiyon adı').fill('Favoriler');
    await page.getByRole('button', { name: 'Oluştur ve kaydet' }).click();
    await page.getByText('Koleksiyona kaydedildi').first().waitFor();
    await page.keyboard.press('Escape');
    await page.goto(BASE + '/saved');
    await page.getByText('Favoriler').waitFor();
  });
  await step('product tag opens quick view with offers', async () => {
    await page.goto(BASE + '/');
    await page.locator('article').first().getByRole('button', { name: /^Aurelia|Classic|ürününü görüntüle/ }).first().click();
    await page.getByText(/için teklifler/).waitFor();
    await shot('e07-product-sheet');
    await page.getByRole('button', { name: /Mağazaya git|mağazasında satın al/ }).first().click();
    await page.getByText(/henüz yapılandırılmadı/).waitFor();
    await shot('e08-outbound');
    await page.keyboard.press('Escape');
  });
  await step('product detail: offer comparison & best-price rule', async () => {
    await page.goto(BASE + '/product/pr_watch');
    await page.getByRole('heading', { name: 'Satıcı teklifleri' }).waitFor();
    await page.getByText('En iyi fiyat', { exact: true }).first().waitFor();
    await shot('e09-product-detail');
  });
  await step('create post: upload, alt text, tag product, disclose, publish', async () => {
    await page.goto(BASE + '/create');
    await page.locator('#file').setInputFiles({ name: 'look.png', mimeType: 'image/png', buffer: png(400, 500, [200, 120, 255]) });
    await page.getByLabel('1. medya için alternatif metin').fill('Mor arka planda test görseli');
    await shot('e10-create-media');
    await page.getByRole('button', { name: 'İleri' }).click();
    await page.getByRole('application').click({ position: { x: 150, y: 200 } });
    await page.getByRole('textbox', { name: /Katalogda ara/ }).fill('Aurelia');
    await page.getByRole('button', { name: /Aurelia Classic 38/ }).click();
    await page.getByText('Etiketlenen ürünler (1)').waitFor();
    await shot('e11-create-tag');
    await page.getByRole('button', { name: 'İleri' }).click();
    await page.getByLabel('Açıklama').fill(`Yeni kombin @elif.stil #e2e${user}`);
    await page.getByText('Affiliate bağlantı', { exact: true }).click();
    await shot('e12-create-details');
    await page.getByRole('button', { name: 'Paylaş' }).click();
    await page.getByRole('heading', { name: 'Gönderi' }).waitFor();
    await page.getByText(`#e2e${user}`).waitFor();
    await shot('e13-post');
  });
  await step('hashtag page lists new post', async () => {
    await page.goto(BASE + `/tag/e2e${user}`);
    await page.getByText('1 gönderi').waitFor();
  });
  await step('direct message to creator', async () => {
    await page.goto(BASE + '/@elif.stil');
    await page.getByRole('button', { name: 'Mesaj' }).click();
    await page.getByRole('textbox', { name: 'Mesaj yazın…' }).fill('Merhaba! Saat hangi beden?');
    await page.getByRole('button', { name: 'Gönder' }).click();
    await page.getByText('Merhaba! Saat hangi beden?').waitFor();
    await shot('e14-dm');
  });
  await step('search with filter', async () => {
    await page.goto(BASE + '/search?q=lumora');
    await page.getByText('Lumora Daily Serum').first().waitFor();
  });
  await step('report a post', async () => {
    await page.goto(BASE + '/p/po_4');
    await page.getByRole('button', { name: 'Daha fazla' }).first().click();
    await page.getByRole('menuitem', { name: 'Bildir' }).click();
    await page.getByText('Spam veya sahte etkileşim').click();
    await page.getByRole('button', { name: 'Bildirimi gönder' }).click();
    await page.getByText('Bildiriminiz alındı').waitFor();
    await page.keyboard.press('Escape');
  });
  await step('switch language to English + dark theme', async () => {
    await page.goto(BASE + '/settings/preferences');
    await page.getByLabel('Dil').selectOption('en');
    await page.getByRole('radio', { name: 'Dark' }).click();
    await page.goto(BASE + '/');
    await page.getByRole('radio', { name: 'For You' }).waitFor();
    await shot('e15-home-en-dark');
  });
  await step('earnings: import sample report, idempotent re-import, balances per currency', async () => {
    await page.goto(BASE + '/studio/earnings');
    await page.getByRole('button', { name: /Import sample network report/ }).click();
    await page.getByText(/5 new · 0 duplicates/).waitFor();
    await page.getByRole('button', { name: /Import sample network report/ }).click();
    await page.getByText(/0 new · 7 duplicates/).waitFor();
    await page.getByText('USD', { exact: true }).first().waitFor();
    await shot('e17-earnings');
  });
  await step('transactions list shows rejected self-purchase', async () => {
    await page.goto(BASE + '/studio/earnings/transactions');
    await page.getByRole('button', { name: 'Rejected' }).click();
    await page.getByText('Purchase through your own link').waitFor();
    await shot('e18-transactions');
  });
  await step('payout request is blocked without verified account', async () => {
    await page.goto(BASE + '/studio/payouts/request');
    await page.getByText(/verified payout account, KYC and tax document are required/).waitFor();
    await shot('e19-payout');
  });
  await step('affiliate link creation shows tracking inactive', async () => {
    await page.goto(BASE + '/studio/links');
    await page.getByText('Tracking inactive — no authorised programme').first().waitFor();
  });
  await step('admin area is blocked for normal users', async () => {
    await page.goto(BASE + '/admin');
    await page.getByText(/don’t have permission/).waitFor();
  });
  await step('brand registration', async () => {
    await page.goto(BASE + '/brand');
    await page.getByRole('link', { name: 'Register brand' }).click();
    await page.getByLabel('Brand name', { exact: true }).fill('Test Brand ' + user);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Register brand' }).click();
    await page.getByText(/Test Brand .* dashboard/).waitFor();
    await shot('e20-brand-dashboard');
  });
  await step('create campaign and submit for approval (cannot self-approve)', async () => {
    await page.goto(BASE + '/brand/campaigns/new');
    await page.getByLabel('Campaign name').fill('Winter capsule');
    await page.getByLabel('Fixed fee (per creator)').fill('3000');
    await page.getByLabel('Brief').fill('Show 3 outfits with our product. No medical claims.');
    await shot('e21-campaign-builder');
    await page.getByRole('button', { name: 'Submit for approval' }).click();
    await page.getByText('Pending approval').first().waitFor();
    if (await page.getByRole('button', { name: /Approve & publish/ }).count()) throw new Error('brand should not see approve');
  });
  await step('platform approval (demo admin role) publishes campaign', async () => {
    const url = page.url();
    await page.goto(BASE + '/settings/about');
    await page.getByRole('button', { name: /Grant admin role/ }).click();
    await page.getByText(/Admin role granted/).waitFor();
    await page.goto(url);
    await page.getByRole('button', { name: /Approve & publish/ }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByText('Open for applications').first().waitFor();
    await shot('e22-campaign-open');
  });
  await step('creator discovery → invite', async () => {
    await page.goto(BASE + '/brand/creators');
    const card = page.locator('li', { hasText: 'Elif Aydın' }).first();
    await card.getByRole('button', { name: 'Invite' }).click();
    await page.getByRole('button', { name: 'Send invitation' }).click();
    await page.getByText('Invitation sent').first().waitFor();
    await shot('e23-discovery');
    await page.goto(BASE + '/brand/invitations');
    await page.getByText('Elif Aydın').waitFor();
  });
  await step('creator applies to a sample campaign', async () => {
    await page.goto(BASE + '/studio/campaigns');
    const card = page.locator('li', { hasText: 'Aurelia Classic 38' }).first();
    await card.getByRole('button', { name: 'Apply' }).click();
    await page.getByLabel('Why you?').fill('I style watches daily for my audience.');
    await page.getByRole('button', { name: 'Send application' }).click();
    await page.getByText('Application sent').first().waitFor();
    await shot('e24-opportunities');
  });
  await step('desktop layout renders left rail', async () => {
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.goto(BASE + '/');
    await page.getByRole('complementary').getByRole('link', { name: 'Explore' }).waitFor();
    await shot('e16-desktop');
  });

  await browser.close();
  for (const r of results) console.log(r.join(' | '));
  if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
  const failed = results.filter((r) => r[0] === 'FAIL').length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed || errors.length ? 1 : 0);
})();
