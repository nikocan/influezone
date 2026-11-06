# Test Kontrol Listesi / Test Checklist

Komutlar: `npm test` (Vitest) · `npm run db:test` (PostgreSQL + RLS) · `node e2e/smoke.cjs` (Playwright, dev sunucusu açıkken)

| Gereksinim (spec §18) | Kapsam | Sonuç |
|---|---|---|
| Alışverişçi kaydı ve onboarding | e2e: kayıt → doğrulama kodu → rol/ilgi → profil; birim: DemoAuth | ✅ |
| İçerik üretici kaydı ve paylaşım | e2e: içerik üretici onboarding → yükleme → etiket → beyan → paylaş | ✅ |
| Farklı medya oranlarında ürün etiketi | `tagging.test.ts` (contain/cover, kırpılma, gidiş-dönüş) | ✅ |
| Takip/beğeni/yorum/kaydet | e2e + `DemoRepository.test.ts` + RLS (sayaç, tekil beğeni) | ✅ |
| Pazaryeri filtreleme | `commerce.test.ts` (ülke, para birimi, adil en iyi fiyat) + entegrasyon testi | ✅ |
| Yetkili affiliate yönlendirme | RLS: `outbound_redirect` yalnız onaylı ürün + yetkili URL; UI: yapılandırılmamışsa yönlendirme yok | ✅ (gerçek link yok) |
| Tıklama olayı oluşturma | RLS + demo testi; kendi tıklaması işaretlenir/atfedilmez | ✅ |
| Çift dönüşüm engelleme | SQL: aynı provider_event_id tek kayıt, onay tek kez; demo: tekrar içe aktarma 7 tekrar | ✅ |
| İade ve komisyon ters kaydı | SQL + demo: kısmi/tam iade, beklemede/onaylı kovadan düşüm, aşırı iade engeli | ✅ |
| Komisyon dağıtımı | SQL + birim: %70/%30 varsayılan, en özel kural, kuruş yuvarlama eşitliği, defter dengesi | ✅ |
| Ödeme onay yetkisi | SQL: doğrulanmamış hesap engeli, bakiye üstü engeli, kendi ödemesini onaylayamama, bayrak kapalıyken gönderim engeli | ✅ |
| Marka organizasyon izolasyonu | RLS: üyelik, rol yükseltme, marka adına paylaşım; kampanya/başvuru/teslimat izolasyonu (30_campaign_tests.sql); demo birim testleri | ✅ |
| Admin yetkilendirme | RLS: kendine rol verememe, `admin_set_role`; e2e: /admin engeli | ✅ |
| RLS politika uygulaması | `10_rls_tests.sql` (46) + `20_ledger_tests.sql` (30) + `30_campaign_tests.sql` (22) | ✅ |
| Yerelleştirme ve para birimi | `format.test.ts` (TR/EN anahtar eşitliği, biçimler, RTL yedekleme) + e2e dil değişimi | ✅ |
| Mobil/tablet/masaüstü | e2e 390px + 1280px ekran görüntüleri | ✅ (tablet manuel) |
| Yükleniyor ve ağ hataları | Tüm sorgularda skeleton/ErrorState + yeniden dene | 🟡 manuel |
| Video oynatma ve erişilebilirlik | Görünürlükte oynat/duraklat, sessiz, altyazı, azaltılmış hareket | 🟡 manuel (sandbox video ağı kapalı) |

Son çalıştırma (2026-11-06): Vitest 70/70 ✅ · SQL 98/98 ✅ · E2E 28/28 ✅ · `tsc` ✅ · `vite build` ✅
