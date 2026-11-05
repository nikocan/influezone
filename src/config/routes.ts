/**
 * Complete screen inventory (113 screens) mapped to routes, shells and implementation status.
 * `status: 'live'` = functional screen in this build. `planned` screens render a status page
 * inside the correct shell (no fake data, no dead buttons) until their phase ships.
 */
export type Shell = 'public' | 'auth' | 'app' | 'studio' | 'brand' | 'admin';
export type ScreenStatus = 'live' | 'partial' | 'planned';

export interface ScreenDef {
  no: number;
  key: string;
  path: string;
  shell: Shell;
  phase: number;
  status: ScreenStatus;
  /** 'modal' screens are presented as sheets over another route */
  presentation?: 'page' | 'modal';
}

const s = (no: number, key: string, path: string, shell: Shell, phase: number, status: ScreenStatus, presentation: ScreenDef['presentation'] = 'page'): ScreenDef => ({ no, key, path, shell, phase, status, presentation });

export const SCREENS: ScreenDef[] = [
  // PUBLIC / ONBOARDING
  s(1, 'splash', '/ (boot)', 'public', 1, 'live'),
  s(2, 'landing', '/welcome', 'public', 1, 'live'),
  s(3, 'localeSelect', '/welcome/locale', 'public', 1, 'live'),
  s(4, 'signIn', '/auth/sign-in', 'auth', 1, 'live'),
  s(5, 'register', '/auth/register', 'auth', 1, 'live'),
  s(6, 'socialSignIn', '/auth/sign-in#social', 'auth', 1, 'partial'),
  s(7, 'emailVerify', '/auth/verify', 'auth', 1, 'live'),
  s(8, 'passwordReset', '/auth/reset', 'auth', 1, 'live'),
  s(9, 'roleOnboarding', '/onboarding', 'auth', 1, 'live'),
  s(10, 'creatorOnboarding', '/onboarding/creator', 'auth', 1, 'live'),
  s(11, 'brandRegistration', '/onboarding/brand', 'auth', 5, 'planned'),
  s(12, 'legal', '/legal/:doc', 'public', 1, 'live'),
  // SOCIAL
  s(13, 'forYou', '/', 'app', 2, 'live'),
  s(14, 'following', '/?feed=following', 'app', 2, 'live'),
  s(15, 'reels', '/reels', 'app', 2, 'live'),
  s(16, 'photoCarousel', '/p/:postId (carousel)', 'app', 2, 'live'),
  s(17, 'postDetail', '/p/:postId', 'app', 2, 'live'),
  s(18, 'comments', '/p/:postId#comments', 'app', 2, 'live', 'modal'),
  s(19, 'likes', '/p/:postId#likes', 'app', 2, 'live', 'modal'),
  s(20, 'share', '(share sheet)', 'app', 2, 'live', 'modal'),
  s(21, 'saveToCollection', '(save sheet)', 'app', 2, 'live', 'modal'),
  s(22, 'collections', '/saved', 'app', 2, 'live'),
  s(23, 'exploreHome', '/explore', 'app', 2, 'live'),
  s(24, 'searchResults', '/search?q=', 'app', 2, 'live'),
  s(25, 'searchFilters', '/search (filters)', 'app', 2, 'live', 'modal'),
  s(26, 'trendingProducts', '/explore/trending/products', 'app', 2, 'live'),
  s(27, 'trendingCreators', '/explore/trending/creators', 'app', 2, 'live'),
  s(28, 'trendingBrands', '/explore/trending/brands', 'app', 2, 'live'),
  s(29, 'category', '/explore/c/:slug', 'app', 2, 'live'),
  s(30, 'hashtag', '/tag/:tag', 'app', 2, 'live'),
  s(31, 'creatorProfile', '/@:username', 'app', 2, 'live'),
  s(32, 'brandProfile', '/@:username (brand)', 'app', 2, 'live'),
  s(33, 'followers', '/@:username/followers', 'app', 2, 'live'),
  s(34, 'inbox', '/messages', 'app', 2, 'live'),
  s(35, 'conversation', '/messages/:id', 'app', 2, 'live'),
  s(36, 'notifications', '/activity', 'app', 2, 'live'),
  s(37, 'report', '(report dialog)', 'app', 2, 'live', 'modal'),
  // SHOPPING
  s(38, 'productQuickView', '(product sheet)', 'app', 3, 'live', 'modal'),
  s(39, 'productDetail', '/product/:id', 'app', 3, 'live'),
  s(40, 'offerComparison', '/product/:id#offers', 'app', 3, 'live'),
  s(41, 'merchantInfo', '/merchant/:id', 'app', 3, 'partial'),
  s(42, 'productReviews', '/product/:id/reviews', 'app', 3, 'planned'),
  s(43, 'productCreatorContent', '/product/:id#creators', 'app', 3, 'live'),
  s(44, 'similarProducts', '/product/:id#similar', 'app', 3, 'live'),
  s(45, 'savedProducts', '/saved?tab=products', 'app', 3, 'live'),
  s(46, 'priceAlerts', '/settings/price-alerts', 'app', 3, 'live'),
  s(47, 'outboundConfirm', '(outbound dialog)', 'app', 3, 'live', 'modal'),
  s(48, 'purchaseTracking', '/orders', 'app', 4, 'planned'),
  // CREATOR
  s(49, 'studioDashboard', '/studio', 'studio', 4, 'live'),
  s(50, 'createPhoto', '/create?type=photo', 'app', 2, 'live'),
  s(51, 'createVideo', '/create?type=video', 'app', 2, 'live'),
  s(52, 'mediaEditor', '/create (media step)', 'app', 2, 'live'),
  s(53, 'taggingCanvas', '/create (tag step)', 'app', 2, 'live'),
  s(54, 'catalogSearch', '/create (product search)', 'app', 2, 'live', 'modal'),
  s(55, 'externalProductLink', '/create (propose product)', 'app', 2, 'live', 'modal'),
  s(56, 'productMatchConfirm', '/create (match confirm)', 'app', 3, 'partial', 'modal'),
  s(57, 'captionEditor', '/create (caption step)', 'app', 2, 'live'),
  s(58, 'aiAssistant', '/studio/ai', 'studio', 7, 'planned'),
  s(59, 'drafts', '/studio/drafts', 'studio', 2, 'live'),
  s(60, 'scheduled', '/studio/scheduled', 'studio', 2, 'live'),
  s(61, 'contentLibrary', '/studio/content', 'studio', 2, 'live'),
  s(62, 'postAnalytics', '/studio/analytics', 'studio', 4, 'live'),
  s(63, 'productPerformance', '/studio/products', 'studio', 4, 'live'),
  s(64, 'affiliateLinks', '/studio/links', 'studio', 4, 'partial'),
  s(65, 'campaignOpportunities', '/studio/campaigns', 'studio', 5, 'planned'),
  s(66, 'campaignApplications', '/studio/campaigns/applications', 'studio', 5, 'planned'),
  s(67, 'brandCollaborations', '/studio/collaborations', 'studio', 5, 'planned'),
  s(68, 'earnings', '/studio/earnings', 'studio', 4, 'live'),
  s(69, 'commissionTransactions', '/studio/earnings/transactions', 'studio', 4, 'live'),
  s(70, 'earningsStatus', '/studio/earnings/status', 'studio', 4, 'live'),
  s(71, 'payoutOnboarding', '/studio/payouts/setup', 'studio', 4, 'partial'),
  s(72, 'payoutRequest', '/studio/payouts/request', 'studio', 4, 'live'),
  s(73, 'payoutHistory', '/studio/payouts', 'studio', 4, 'live'),
  s(74, 'creatorSettings', '/studio/settings', 'studio', 2, 'live'),
  // BRAND
  s(75, 'brandDashboard', '/brand', 'brand', 5, 'planned'),
  s(76, 'brandOrgSettings', '/brand/settings', 'brand', 5, 'planned'),
  s(77, 'brandCatalog', '/brand/catalog', 'brand', 5, 'planned'),
  s(78, 'brandProductEdit', '/brand/catalog/:id', 'brand', 5, 'planned'),
  s(79, 'brandOffers', '/brand/offers', 'brand', 5, 'planned'),
  s(80, 'brandCommissionRules', '/brand/commissions', 'brand', 5, 'planned'),
  s(81, 'campaignList', '/brand/campaigns', 'brand', 5, 'planned'),
  s(82, 'campaignCreate', '/brand/campaigns/new', 'brand', 5, 'planned'),
  s(83, 'campaignBudget', '/brand/campaigns/new/budget', 'brand', 5, 'planned'),
  s(84, 'creatorDiscovery', '/brand/creators', 'brand', 5, 'planned'),
  s(85, 'creatorComparison', '/brand/creators/compare', 'brand', 5, 'planned'),
  s(86, 'invitations', '/brand/invitations', 'brand', 5, 'planned'),
  s(87, 'applications', '/brand/applications', 'brand', 5, 'planned'),
  s(88, 'deliverables', '/brand/deliverables', 'brand', 5, 'planned'),
  s(89, 'collabInbox', '/brand/inbox', 'brand', 5, 'planned'),
  s(90, 'campaignPerformance', '/brand/performance', 'brand', 5, 'planned'),
  s(91, 'roiReporting', '/brand/roi', 'brand', 5, 'planned'),
  s(92, 'brandBilling', '/brand/billing', 'brand', 5, 'planned'),
  s(93, 'teamPermissions', '/brand/team', 'brand', 5, 'planned'),
  // ADMIN
  s(94, 'adminDashboard', '/admin', 'admin', 6, 'planned'),
  s(95, 'adminUsers', '/admin/users', 'admin', 6, 'planned'),
  s(96, 'creatorVerification', '/admin/verification/creators', 'admin', 6, 'planned'),
  s(97, 'brandVerification', '/admin/verification/brands', 'admin', 6, 'planned'),
  s(98, 'productModeration', '/admin/moderation/products', 'admin', 6, 'planned'),
  s(99, 'contentModeration', '/admin/moderation/content', 'admin', 6, 'planned'),
  s(100, 'affiliateRegistry', '/admin/affiliates', 'admin', 6, 'planned'),
  s(101, 'marketplaceIntegrations', '/admin/marketplaces', 'admin', 6, 'planned'),
  s(102, 'trackingHealth', '/admin/tracking', 'admin', 6, 'planned'),
  s(103, 'reconciliation', '/admin/reconciliation', 'admin', 6, 'planned'),
  s(104, 'adminCommissionRules', '/admin/commissions', 'admin', 6, 'planned'),
  s(105, 'payoutReview', '/admin/payouts', 'admin', 6, 'planned'),
  s(106, 'disputes', '/admin/disputes', 'admin', 6, 'planned'),
  s(107, 'fraudSignals', '/admin/fraud', 'admin', 6, 'planned'),
  s(108, 'adminReports', '/admin/reports', 'admin', 6, 'planned'),
  s(109, 'localizationSettings', '/admin/localization', 'admin', 7, 'planned'),
  s(110, 'featureFlags', '/admin/flags', 'admin', 6, 'planned'),
  s(111, 'auditLog', '/admin/audit', 'admin', 6, 'planned'),
  s(112, 'supportTickets', '/admin/support', 'admin', 6, 'planned'),
  s(113, 'systemSettings', '/admin/system', 'admin', 6, 'planned'),
];

export function screenByPath(path: string) {
  return SCREENS.find((x) => x.path === path);
}

export const STUDIO_NAV = [
  { to: '/studio', key: 'studioDashboard', icon: 'LayoutDashboard', end: true },
  { to: '/studio/content', key: 'contentLibrary', icon: 'Images' },
  { to: '/studio/drafts', key: 'drafts', icon: 'FilePen' },
  { to: '/studio/scheduled', key: 'scheduled', icon: 'CalendarClock' },
  { to: '/studio/analytics', key: 'postAnalytics', icon: 'BarChart3' },
  { to: '/studio/products', key: 'productPerformance', icon: 'ShoppingBag' },
  { to: '/studio/links', key: 'affiliateLinks', icon: 'Link2' },
  { to: '/studio/campaigns', key: 'campaignOpportunities', icon: 'Megaphone' },
  { to: '/studio/earnings', key: 'earnings', icon: 'Wallet' },
  { to: '/studio/payouts', key: 'payoutHistory', icon: 'Banknote' },
  { to: '/studio/ai', key: 'aiAssistant', icon: 'Sparkles' },
  { to: '/studio/settings', key: 'creatorSettings', icon: 'Settings' },
] as const;

export const BRAND_NAV = [
  { to: '/brand', key: 'brandDashboard', icon: 'LayoutDashboard', end: true },
  { to: '/brand/catalog', key: 'brandCatalog', icon: 'Package' },
  { to: '/brand/offers', key: 'brandOffers', icon: 'Store' },
  { to: '/brand/campaigns', key: 'campaignList', icon: 'Megaphone' },
  { to: '/brand/creators', key: 'creatorDiscovery', icon: 'Users' },
  { to: '/brand/applications', key: 'applications', icon: 'Inbox' },
  { to: '/brand/deliverables', key: 'deliverables', icon: 'ClipboardCheck' },
  { to: '/brand/performance', key: 'campaignPerformance', icon: 'BarChart3' },
  { to: '/brand/commissions', key: 'brandCommissionRules', icon: 'Percent' },
  { to: '/brand/billing', key: 'brandBilling', icon: 'Receipt' },
  { to: '/brand/team', key: 'teamPermissions', icon: 'ShieldCheck' },
  { to: '/brand/settings', key: 'brandOrgSettings', icon: 'Settings' },
] as const;

export const ADMIN_NAV = [
  { to: '/admin', key: 'adminDashboard', icon: 'LayoutDashboard', end: true },
  { to: '/admin/users', key: 'adminUsers', icon: 'Users' },
  { to: '/admin/verification/creators', key: 'creatorVerification', icon: 'BadgeCheck' },
  { to: '/admin/verification/brands', key: 'brandVerification', icon: 'Building2' },
  { to: '/admin/moderation/content', key: 'contentModeration', icon: 'ShieldAlert' },
  { to: '/admin/moderation/products', key: 'productModeration', icon: 'PackageSearch' },
  { to: '/admin/affiliates', key: 'affiliateRegistry', icon: 'Network' },
  { to: '/admin/marketplaces', key: 'marketplaceIntegrations', icon: 'Plug' },
  { to: '/admin/tracking', key: 'trackingHealth', icon: 'Activity' },
  { to: '/admin/reconciliation', key: 'reconciliation', icon: 'Scale' },
  { to: '/admin/payouts', key: 'payoutReview', icon: 'Banknote' },
  { to: '/admin/fraud', key: 'fraudSignals', icon: 'Siren' },
  { to: '/admin/audit', key: 'auditLog', icon: 'ScrollText' },
  { to: '/admin/flags', key: 'featureFlags', icon: 'ToggleRight' },
  { to: '/admin/system', key: 'systemSettings', icon: 'Settings' },
] as const;
