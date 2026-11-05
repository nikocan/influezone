# Uygulama Durumu / Implementation Status — v0.3.0 (2026-11-05)

## Denetim (mevcut proje)
- `project 2/`: Router'sız, Supabase'siz, sahte girişli Vite + React prototipi (statik paneller). Gerçek veri/altyapı yoktu; **referans olarak dokunulmadan korundu**.
- `asistan_satcom.jsx`: bağımsız demo bileşeni; korundu.
- `.github/workflows/azure-webapps-node.yml`: şablon; artık kökteki `package.json` ile `npm run build` / `npm test` çalışır. Uygulama adı ve yayın profili sırrı hâlâ gerekli.

## Faz durumu
| Faz | Durum | Not |
|---|---|---|
| 1 Temel | ✅ Tamam (demo) / 🟡 Supabase'te canlı doğrulanmadı | Tasarım sistemi, kabuklar, i18n, auth akışları, onboarding, profil modeli, RLS |
| 2 Sosyal | ✅ Tamam (demo) | Akışlar, keşfet, arama, profiller, gönderi/medya, etkileşimler, ürün etiketleri, DM, bildirimler, raporlama |
| 3 Ticaret | 🟡 Kısmi | Kanonik ürün, teklif karşılaştırma, adil “en iyi fiyat”, fiyat alarmı, yönlendirme onayı + tıklama kaydı. Gerçek satıcı akışları/linkler yok |
| 4 Gelir | ✅ Tamam (demo + SQL) / ⛔ entegrasyon yok | Dönüşüm alımı (idempotent), atıf, komisyon kuralları, değiştirilemez defter, iade, ödeme talebi/onayı. Ödeme gönderimi `payout_execution` bayrağıyla kapalı |
| 5 Marka | ⏳ | Kabuk + rota haritası hazır |
| 6 Admin | ⏳ | Kabuk + sunucu taraflı rol koruması hazır |
| 7 AI & i18n | 🟡 | TR/EN tam, AR RTL önizleme; AI yok |
| 8 Sağlamlaştırma | 🟡 | Testler, erişilebilirlik temelleri; performans/güvenlik denetimi sürecek |

## Bilinen sınırlamalar
- **Demo modu güvenlik sınırı değildir**: kurallar tarayıcıda taklit edilir; gerçek yetkilendirme Supabase RLS'tedir.
- Supabase adaptörü (`src/data/supabase`) tip denetiminden geçer, SQL tarafı yerel PostgreSQL'de test edildi; **canlı Supabase projesine karşı uçtan uca çalıştırılmadı**.
- Demo'da yüklenen videolar yalnızca oturum boyunca oynar (blob URL); görseller tarayıcı depolama sınırına tabidir.
- Zamanlanmış gönderilerin otomatik yayını için sunucu zamanlayıcısı (pg_cron / Edge Function) gerekli.
- Supabase modunda içerik üretici platform hesapları (`creator_profiles.platforms`) henüz yazılmıyor.
- Gizli hesap medyası public bucket'ta tahmin edilemez yollarla korunuyor; üretimden önce imzalı URL'e geçilmeli.
- Ürün değerlendirmeleri, satıcı sayfası, sipariş takibi entegrasyon bekliyor.
- Görseller örnek veri için Unsplash'ten yüklenir; erişilemezse erişilebilir renkli yedek gösterilir.

## Faz 4 notları
- Defter: `ledger_entries` güncellenemez/silinemez (trigger), her `txn_id` sıfıra dengelenir (deferred constraint trigger).
- Para birimleri asla toplanmaz/çevrilmez; `fx_rate_snapshot` yalnızca bilgi amaçlıdır.
- Dönüşüm alımı, durum ilerletme ve ödeme işaretleme yalnızca service role veya admin ile çalışır. İçerik üreticiler yalnızca okur ve ödeme talep eder.
- Demo modunda dönüşümler yalnızca "Örnek ağ raporu" düğmesiyle, etiketli kurgusal kayıt olarak oluşur.
- Tahmini (reported) tutarlar bakiyeye yazılmaz; Supabase modunda tahmin varsayılan %70 pay ile gösterilir.

## Sonraki öncelikler
1. Supabase projesini bağlayıp migration + RLS testlerini canlı ortamda doğrulamak; Storage yükleme akışını test etmek.
2. Zamanlanmış yayın için sunucu görevi; scheduled → published geçişi.
3. Faz 3: ilk satıcı/affiliate ağı sözleşmesi → teklif içe aktarma (Edge Function), imzalı yönlendirme.
4. Faz 4 tamamlayıcı: imzalı webhook Edge Function'ı (ağ başına), bloke çözme için pg_cron, ödeme sağlayıcı entegrasyonu.
5. Faz 6 öncesi: moderasyon kuyruğu ekranı (rapor tablosu hazır).
