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
| Çift dönüşüm engelleme | — | ⏳ Faz 4 |
| İade ve komisyon ters kaydı | — | ⏳ Faz 4 |
| Komisyon dağıtımı | — | ⏳ Faz 4 |
| Ödeme onay yetkisi | — | ⏳ Faz 4 |
| Marka organizasyon izolasyonu | RLS: üyelik, rol yükseltme, marka adına paylaşım | ✅ |
| Admin yetkilendirme | RLS: kendine rol verememe, `admin_set_role`; e2e: /admin engeli | ✅ |
| RLS politika uygulaması | `supabase/tests/10_rls_tests.sql` — 46 kontrol | ✅ |
| Yerelleştirme ve para birimi | `format.test.ts` (TR/EN anahtar eşitliği, biçimler, RTL yedekleme) + e2e dil değişimi | ✅ |
| Mobil/tablet/masaüstü | e2e 390px + 1280px ekran görüntüleri | ✅ (tablet manuel) |
| Yükleniyor ve ağ hataları | Tüm sorgularda skeleton/ErrorState + yeniden dene | 🟡 manuel |
| Video oynatma ve erişilebilirlik | Görünürlükte oynat/duraklat, sessiz, altyazı, azaltılmış hareket | 🟡 manuel (sandbox video ağı kapalı) |

Son çalıştırma (2026-10-31): Vitest 52/52 ✅ · RLS 46/46 ✅ · E2E 19/19 ✅ · `tsc` ✅ · `vite build` ✅
