# Shopfluence — Where Influence Becomes Income

Küresel içerik üretici ticaret platformu. Türkçe (varsayılan) ve İngilizce arayüz.
*Global creator-commerce platform. Turkish (default) and English UI.*

## Hızlı başlangıç / Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

`.env` dosyası yoksa uygulama **DEMO modunda** çalışır: kurgusal örnek veriler (“Örnek” etiketli) ve tarayıcıda saklanan hesaplar.
Without `.env` the app runs in **DEMO mode** with fictional, clearly labelled sample data stored in the browser.

### Supabase'e bağlama / Connecting Supabase
1. Supabase projesi oluşturun, `supabase/migrations/*.sql` dosyalarını sırayla uygulayın (`supabase db push`).
2. `.env.example` → `.env`; `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` (yalnızca anon anahtar!) girin.
3. Auth → URL Configuration: `…/auth/verify` ve `…/auth/reset` yönlendirme adreslerini ekleyin. Google/Apple için OAuth sağlayıcılarını açın.

## Komutlar / Scripts
| Komut | Açıklama |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Tip denetimi + production build |
| `npm test` | Vitest birim + entegrasyon testleri |
| `npm run db:test` | Migration'ları geçici PostgreSQL'e uygular ve RLS testlerini çalıştırır |
| `node e2e/smoke.cjs` | Uçtan uca Playwright senaryosu (dev sunucusu açıkken) |

## Yapı / Structure
```
src/
  config/        routes.ts (113 ekran envanteri), changelog.ts (uygulama içi Güncellemeler)
  i18n/          tr.ts (kaynak), en.ts, ar.ts (RTL önizleme), I18nProvider
  data/          types, repository arayüzü, demo/ (yerel adaptör + örnek veri), supabase/ (adaptör), auth/
  lib/           tagging (normalize etiket koordinatları), commerce (adil “en iyi fiyat”), ranking, format
  components/    ui/ (tasarım sistemi), shell/, social/, commerce/, common/
  pages/         public/, social/, shop/, studio/, settings/
supabase/
  migrations/    şema + RLS (Faz 1–3 alt kümesi)
  tests/         RLS test paketi
docs/            ROUTES, DESIGN_SYSTEM, IMPLEMENTATION_STATUS, INTEGRATIONS, TEST_CHECKLIST
project 2/       önceki prototip (referans olarak korunuyor)
```

Güncellemeleri uygulama içinden takip edin: **Ayarlar → Güncellemeler** veya `/updates`.
