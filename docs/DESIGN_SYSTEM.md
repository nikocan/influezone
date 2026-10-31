# Tasarım Sistemi / Design System

Tokenlar `src/index.css` (CSS değişkenleri, açık/koyu) ve `tailwind.config.ts` içinde tanımlıdır.

| Token | Açık | Koyu | Tailwind |
|---|---|---|---|
| Arka plan | #FFFFFF | #0B0B0F | `bg-bg` |
| Yüzey | #F7F8FA | #18181F | `bg-surface` |
| Metin | #111111 | #F5F5F8 | `text-fg` |
| Kenarlık | #E8E8EF | #2C2C38 | `border-line` |
| Birincil | #7047EB | — | `bg-primary` |
| Premium altın | #D4AF37 | — | `text-gold` (yalnızca vurgu) |
| Başarı / Uyarı / Hata | #16A36B / #E5A100 / #E14D57 | — | `success / warning / danger` |

- Yazı tipi: Inter (yedek: sistem sans-serif). Köşe: 12 / 16 / 24 px (`rounded-sm/md/lg`). 4 px ızgara.
- Animasyon 150–250 ms; `prefers-reduced-motion` ve uygulama içi “Hareketi azalt” ayarına uyar.
- Dokunma hedefleri ≥ 44 px, görünür odak halkası, tüm ikon butonlarında erişilebilir ad.
- Mantıksal yön sınıfları (`ms-/me-/start-/end-`) ile RTL desteği.

## Bileşenler (spec §15 eşlemesi)
| Spec | Dosya |
|---|---|
| AppShell, MobileBottomNav, DesktopSidebar | `components/shell/AppShell.tsx` |
| TopNavigation | `components/shell/TopNavigation.tsx` |
| Portal kabukları (Studio/Marka/Admin) | `components/shell/PortalShell.tsx` |
| CreatorAvatar (+VerifiedBadge) | `components/common/CreatorAvatar.tsx` |
| PostCard, PostGridTile, ProductRail | `components/social/PostCard.tsx` |
| VideoPlayer | `components/social/VideoPlayer.tsx` |
| PhotoCarousel | `components/social/PhotoCarousel.tsx` |
| ProductTag / TagOverlay | `components/social/ProductTag.tsx`, `MediaFrame.tsx` |
| ProductBottomSheet | `components/commerce/ProductSheet.tsx` |
| ProductCard, OfferComparisonCard, MarketplaceBadge | `components/commerce/*` |
| FollowButton, EngagementActions | `components/social/*` |
| CreatorProfileHeader | `pages/social/ProfilePage.tsx` |
| NotificationItem | `pages/social/ActivityPage.tsx` |
| ConversationList, MessageThread | `pages/social/MessagesPages.tsx` |
| SearchFilterBar | `pages/social/SearchPage.tsx` (filtre sayfası) |
| CountrySelector, CurrencyDisplay, LanguageSelector | `components/common/Selectors.tsx` |
| EmptyState, ErrorState, SkeletonLoader | `components/common/States.tsx` |
| ConfirmationDialog | `components/common/ConfirmationDialog.tsx` |
| ModerationNotice, DisclosureLabel, SampleBadge | `components/common/Labels.tsx` |
| Yorum/Beğeni/Paylaş/Kaydet/Bildir sayfaları | `components/social/Sheets.tsx` |
| CreatorAnalyticsCard, EarningsSummary, CommissionStatus, PayoutTimeline, BrandCampaignCard, CampaignBuilder, CreatorDiscoveryCard, AnalyticsChart | **Faz 4–5** (henüz yok) |
