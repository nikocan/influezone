# Kimlik bilgisi, onay veya ticari sözleşme gerektiren entegrasyonlar

| Entegrasyon | Gerekli | Durum |
|---|---|---|
| Supabase projesi (Auth, Postgres, Storage) | Proje URL + anon anahtar; migration'ların uygulanması | ⛔ Bağlı değil (demo modu) |
| Supabase Auth OAuth (Google, Apple) | Google Cloud OAuth istemcisi, Apple Developer hesabı | ⛔ |
| E-posta gönderimi (doğrulama, sıfırlama) | Supabase SMTP / Resend vb. | ⛔ |
| Satıcı ürün akışları / partner API'leri (ör. Trendyol, Hepsiburada, Amazon PA-API) | Her satıcı/ağ ile ayrı sözleşme ve API erişimi; scraping yapılmaz | ⛔ |
| Affiliate ağları (ör. Admitad, Awin, Impact, CJ, Amazon Associates) | Yayıncı hesabı, program onayları, postback/webhook imza anahtarları | ⛔ (şema hazır: `affiliate_networks/programs/links`) |
| Dönüşüm içe aktarma & mutabakat | Ağ raporu API'si veya imzalı webhook | ⛔ Faz 4 |
| Ödeme sağlayıcı (Stripe Connect / Wise / Payoneer) | Platform hesabı, KYC, vergi formları | ⛔ Faz 4 — ödeme yürütme kapalı |
| Kimlik doğrulama (KYC) | Sağlayıcı sözleşmesi (ör. Stripe Identity, Sumsub) | ⛔ Faz 4 |
| AI sağlayıcı (Claude API) | Sunucu tarafı API anahtarı (Edge Function), içerik politikası | ⛔ Faz 7 |
| Push bildirimleri | Web Push VAPID / FCM / APNs | ⛔ |
| Video transcoding & altyazı | Mux / Cloudflare Stream vb. | ⛔ (şimdilik ham dosya) |
| Analitik | Çerez onayı + sağlayıcı | ⛔ |
| Azure Web App dağıtımı (`.github/workflows/azure-webapps-node.yml`) | `AZURE_WEBAPP_PUBLISH_PROFILE` sırrı, uygulama adı, SPA yönlendirme | ⚠️ İş akışı şablon halinde |

Kurallar: service-role anahtarı istemciye asla konmaz; satış/komisyon yalnızca satıcı/ağ onaylı dönüşümle yazılır; tıklama satış sayılmaz.
