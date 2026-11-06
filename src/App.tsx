import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigationType, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PreferencesProvider, usePreferences } from '@/providers/PreferencesProvider';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { I18nProvider, useI18n } from '@/i18n/I18nProvider';
import { ToastProvider } from '@/components/ui/toast';
import { AuthPromptProvider } from '@/components/common/AuthPrompt';
import { SheetsProvider } from '@/components/social/Sheets';
import { AppShell } from '@/components/shell/AppShell';
import { PortalShell } from '@/components/shell/PortalShell';
import { ADMIN_NAV, BRAND_NAV, STUDIO_NAV } from '@/config/routes';
import { BootScreen, LandingPage, LegalPage, LocaleSelectPage } from '@/pages/public/PublicPages';
import { CreatorOnboardingPage, OnboardingPage, RegisterPage, ResetPasswordPage, SignInPage, VerifyEmailPage } from '@/pages/public/AuthPages';
import { HomePage } from '@/pages/social/HomePage';
import { ReelsPage } from '@/pages/social/ReelsPage';
import { PostDetailPage } from '@/pages/social/PostDetailPage';
import { ExplorePage } from '@/pages/social/ExplorePage';
import { SearchPage } from '@/pages/social/SearchPage';
import { CategoryPage, HashtagPage, TrendingBrandsPage, TrendingCreatorsPage, TrendingProductsPage } from '@/pages/social/TrendingPages';
import { FollowListPage, ProfilePage } from '@/pages/social/ProfilePage';
import { ConversationPage, InboxPage } from '@/pages/social/MessagesPages';
import { ActivityPage } from '@/pages/social/ActivityPage';
import { CollectionPage, SavedPage } from '@/pages/social/SavedPages';
import { CreatePage } from '@/pages/social/CreatePage';
import { ProductDetailPage } from '@/pages/shop/ProductDetailPage';
import { PriceAlertsPage } from '@/pages/shop/PriceAlertsPage';
import { AboutPage, EditProfilePage, NotFoundPage, PreferencesPage, PrivacyPage, SettingsHome } from '@/pages/settings/SettingsPages';
import { UpdatesPage } from '@/pages/settings/UpdatesPage';
import { PlannedScreen } from '@/pages/studio/PlannedScreen';
import { AffiliateLinksPage, EarningsPage, PayoutHistoryPage, PayoutOnboardingPage, PayoutRequestPage, PostAnalyticsPage, ProductPerformancePage, TransactionsPage } from '@/pages/studio/MonetizationPages';
import { BrandGate } from '@/pages/brand/brandCommon';
import { BrandCommissionRulesPage, BrandDashboard, BrandOffersPage, BrandRegistrationPage, CatalogPage, OrgSettingsPage, ProductEditPage, TeamPage } from '@/pages/brand/BrandOrgPages';
import { ApplicationsPage, CampaignDetailPage, CampaignEditorPage, CampaignListPage, CampaignPerformancePage, CollabInboxPage, CreatorComparePage, CreatorDiscoveryPage, DeliverablesPage, InvitationsPage } from '@/pages/brand/BrandCampaignPages';
import { CollaborationsPage, MyApplicationsPage, OpportunitiesPage } from '@/pages/studio/CreatorCampaignPages';
import { ContentLibraryPage, CreatorSettingsPage, DraftsPage, StudioDashboard } from '@/pages/studio/StudioPages';
import { EmptyState } from '@/components/common/States';
import { ShieldOff } from 'lucide-react';
import type { AuthService } from '@/data/auth/types';
import type { Repository } from '@/data/repository';

function ScrollManager() {
  const { pathname } = useLocation();
  const type = useNavigationType();
  useEffect(() => {
    if (type !== 'POP') window.scrollTo(0, 0);
  }, [pathname, type]);
  return null;
}

function RequireAuth({ children }: { children?: ReactNode }) {
  const { session, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <BootScreen />;
  if (!session) return <Navigate to="/auth/sign-in" replace state={{ from: loc.pathname + loc.search }} />;
  return <>{children ?? <Outlet />}</>;
}

function RequireStaff() {
  const { isModerator, loading } = useAuth();
  const { t } = useI18n();
  if (loading) return <BootScreen />;
  if (!isModerator) return <EmptyState icon={<ShieldOff />} className="min-h-[60dvh]" title={t('errors.forbidden')} description={t('admin.staffOnly')} />;
  return <Outlet />;
}

/** Sends first-time visitors to the landing page and unfinished accounts to onboarding. */
function Gates() {
  const { session, profile, loading } = useAuth();
  const { prefs } = usePreferences();
  const { pathname } = useLocation();
  if (loading) return <BootScreen />;
  if (session && profile && !profile.onboardingCompleted) return <Navigate to="/onboarding" replace />;
  if (!session && !prefs.chosen && pathname === '/') return <Navigate to="/welcome" replace />;
  return <Outlet />;
}

function UsernameRoute({ sub }: { sub?: 'followers' | 'following' }) {
  const { handle = '' } = useParams();
  if (!handle.startsWith('@')) return <NotFoundPage />;
  if (sub) return <FollowListPage kind={sub} />;
  return <ProfilePage />;
}

function MeRedirect() {
  const { profile } = useAuth();
  return profile ? <Navigate to={`/@${profile.username}`} replace /> : <Navigate to="/auth/sign-in" replace />;
}

function planned(key: string) {
  return <PlannedScreen screenKey={key} />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/welcome" element={<LandingPage />} />
      <Route path="/welcome/locale" element={<LocaleSelectPage />} />
      <Route path="/auth/sign-in" element={<SignInPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route path="/auth/verify" element={<VerifyEmailPage />} />
      <Route path="/auth/reset" element={<ResetPasswordPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/onboarding/creator" element={<CreatorOnboardingPage />} />
        <Route path="/onboarding/brand" element={<BrandRegistrationPage />} />
      </Route>

      <Route element={<Gates />}>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="/reels" element={<ReelsPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/explore/trending/creators" element={<TrendingCreatorsPage />} />
          <Route path="/explore/trending/products" element={<TrendingProductsPage />} />
          <Route path="/explore/trending/brands" element={<TrendingBrandsPage />} />
          <Route path="/explore/c/:slug" element={<CategoryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/tag/:tag" element={<HashtagPage />} />
          <Route path="/p/:postId" element={<PostDetailPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/product/:id/reviews" element={planned('productReviews')} />
          <Route path="/merchant/:id" element={planned('merchantInfo')} />
          <Route path="/legal/:doc" element={<LegalPage />} />
          <Route path="/updates" element={<UpdatesPage />} />
          <Route path="/settings" element={<SettingsHome />} />
          <Route path="/settings/preferences" element={<PreferencesPage />} />
          <Route path="/settings/about" element={<AboutPage />} />
          <Route path="/me" element={<MeRedirect />} />
          <Route path="/:handle" element={<UsernameRoute />} />
          <Route path="/:handle/followers" element={<UsernameRoute sub="followers" />} />
          <Route path="/:handle/following" element={<UsernameRoute sub="following" />} />
          <Route element={<RequireAuth />}>
            <Route path="/create" element={<CreatePage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/messages" element={<InboxPage />} />
            <Route path="/messages/:id" element={<ConversationPage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/saved/:id" element={<CollectionPage />} />
            <Route path="/orders" element={planned('purchaseTracking')} />
            <Route path="/settings/profile" element={<EditProfilePage />} />
            <Route path="/settings/privacy" element={<PrivacyPage />} />
            <Route path="/settings/price-alerts" element={<PriceAlertsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/studio" element={<PortalShell titleKey="nav.studio" nav={STUDIO_NAV} tone="studio" />}>
            <Route index element={<StudioDashboard />} />
            <Route path="content" element={<ContentLibraryPage />} />
            <Route path="drafts" element={<DraftsPage kind="draft" />} />
            <Route path="scheduled" element={<DraftsPage kind="scheduled" />} />
            <Route path="settings" element={<CreatorSettingsPage />} />
            <Route path="ai" element={planned('aiAssistant')} />
            <Route path="analytics" element={<PostAnalyticsPage />} />
            <Route path="products" element={<ProductPerformancePage />} />
            <Route path="links" element={<AffiliateLinksPage />} />
            <Route path="campaigns" element={<OpportunitiesPage />} />
            <Route path="campaigns/applications" element={<MyApplicationsPage />} />
            <Route path="collaborations" element={<CollaborationsPage />} />
            <Route path="earnings" element={<EarningsPage />} />
            <Route path="earnings/transactions" element={<TransactionsPage />} />
            <Route path="earnings/status" element={<TransactionsPage initial="confirmed" />} />
            <Route path="payouts" element={<PayoutHistoryPage />} />
            <Route path="payouts/setup" element={<PayoutOnboardingPage />} />
            <Route path="payouts/request" element={<PayoutRequestPage />} />
          </Route>

          <Route path="/brand" element={<PortalShell titleKey="nav.brandPortal" nav={BRAND_NAV} tone="brand" />}>
            <Route element={<BrandGate />}>
              <Route index element={<BrandDashboard />} />
              <Route path="settings" element={<OrgSettingsPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="catalog" element={<CatalogPage />} />
              <Route path="catalog/new" element={<ProductEditPage />} />
              <Route path="catalog/:id" element={<ProductEditPage />} />
              <Route path="offers" element={<BrandOffersPage />} />
              <Route path="commissions" element={<BrandCommissionRulesPage />} />
              <Route path="campaigns" element={<CampaignListPage />} />
              <Route path="campaigns/new" element={<CampaignEditorPage />} />
              <Route path="campaigns/new/budget" element={<CampaignEditorPage />} />
              <Route path="campaigns/:id" element={<CampaignDetailPage />} />
              <Route path="campaigns/:id/edit" element={<CampaignEditorPage />} />
              <Route path="creators" element={<CreatorDiscoveryPage />} />
              <Route path="creators/compare" element={<CreatorComparePage />} />
              <Route path="invitations" element={<InvitationsPage />} />
              <Route path="applications" element={<ApplicationsPage />} />
              <Route path="deliverables" element={<DeliverablesPage />} />
              <Route path="inbox" element={<CollabInboxPage />} />
              <Route path="performance" element={<CampaignPerformancePage />} />
              <Route path="roi" element={<CampaignPerformancePage roi />} />
              <Route path="billing" element={planned('brandBilling')} />
            </Route>
          </Route>

          <Route element={<RequireStaff />}>
            <Route path="/admin" element={<PortalShell titleKey="nav.admin" nav={ADMIN_NAV} tone="admin" />}>
              <Route index element={planned('adminDashboard')} />
              {([
                ['users', 'adminUsers'], ['verification/creators', 'creatorVerification'], ['verification/brands', 'brandVerification'], ['moderation/products', 'productModeration'],
                ['moderation/content', 'contentModeration'], ['affiliates', 'affiliateRegistry'], ['marketplaces', 'marketplaceIntegrations'], ['tracking', 'trackingHealth'],
                ['reconciliation', 'reconciliation'], ['commissions', 'adminCommissionRules'], ['payouts', 'payoutReview'], ['disputes', 'disputes'], ['fraud', 'fraudSignals'],
                ['reports', 'adminReports'], ['localization', 'localizationSettings'], ['flags', 'featureFlags'], ['audit', 'auditLog'], ['support', 'supportTickets'], ['system', 'systemSettings'],
              ] as const).map(([path, key]) => <Route key={path} path={path} element={planned(key)} />)}
            </Route>
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

function Localized({ children }: { children: ReactNode }) {
  const { prefs } = usePreferences();
  return <I18nProvider locale={prefs.locale}>{children}</I18nProvider>;
}

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: (n, e) => n < 2 && !(e instanceof Error && /forbidden|not_found|auth_required/.test(e.message)), refetchOnWindowFocus: false, staleTime: 10_000 },
      mutations: { retry: 0 },
    },
  });
}

/** Provider stack shared by the app and tests. */
export function AppProviders({ children, client, auth, repo }: { children: ReactNode; client?: QueryClient; auth?: AuthService; repo?: Repository }) {
  const qc = client ?? makeQueryClient();
  return (
    <QueryClientProvider client={qc}>
      <PreferencesProvider>
        <Localized>
          <ToastProvider>
            <AuthProvider auth={auth} repo={repo}>
              <AuthPromptProvider>
                <SheetsProvider>{children}</SheetsProvider>
              </AuthPromptProvider>
            </AuthProvider>
          </ToastProvider>
        </Localized>
      </PreferencesProvider>
    </QueryClientProvider>
  );
}

const client = makeQueryClient();

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppProviders client={client}>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-[100] focus:rounded-sm focus:bg-primary focus:px-3 focus:py-2 focus:text-white">Skip to content</a>
        <ScrollManager />
        <AppRoutes />
      </AppProviders>
    </BrowserRouter>
  );
}
