import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, Users, BadgeCheck } from 'lucide-react';
import { useRepo, useAuth } from '@/providers/AuthProvider';
import { useI18n, type TKey } from '@/i18n/I18nProvider';
import type { Campaign, CampaignStatus, OrgMembership, OrgRole } from '@/data/types';
import { Badge } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { EmptyState, ListSkeleton } from '@/components/common/States';
import { Select } from '@/components/ui/input';
import { CurrencyDisplay } from '@/components/common/Selectors';
import { SampleBadge } from '@/components/common/Labels';

const RANK: OrgRole[] = ['member', 'analyst', 'manager', 'admin', 'owner'];
export const atLeast = (role: OrgRole | undefined, min: OrgRole) => !!role && RANK.indexOf(role) >= RANK.indexOf(min);

interface BrandCtx { membership: OrgMembership; memberships: OrgMembership[]; select: (id: string) => void; canManage: boolean; isAdmin: boolean }
const Ctx = createContext<BrandCtx | null>(null);
export const useBrand = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('BrandGate missing');
  return c;
};

export const bqk = {
  orgs: ['brand', 'orgs'] as const,
  campaigns: (org: string) => ['brand', org, 'campaigns'] as const,
  campaign: (id: string) => ['brand', 'campaign', id] as const,
  apps: (org: string) => ['brand', org, 'applications'] as const,
  invs: (org: string) => ['brand', org, 'invitations'] as const,
  dels: (org: string) => ['brand', org, 'deliverables'] as const,
  products: (org: string) => ['brand', org, 'products'] as const,
  members: (org: string) => ['brand', org, 'members'] as const,
};

/** Resolves the organisation the user is acting for; offers brand registration when there is none. */
export function BrandGate() {
  const repo = useRepo();
  const { session } = useAuth();
  const { t } = useI18n();
  const q = useQuery({ queryKey: [...bqk.orgs, session?.userId], queryFn: () => repo.listMyOrganizations() });
  const [selected, setSelected] = useState<string | null>(() => { try { return localStorage.getItem('sf.brand.org'); } catch { return null; } });
  useEffect(() => { if (selected) try { localStorage.setItem('sf.brand.org', selected); } catch { /* ignore */ } }, [selected]);
  if (q.isLoading) return <ListSkeleton />;
  const ms = q.data ?? [];
  if (!ms.length) {
    return (
      <EmptyState icon={<Building2 />} title={t('brand.noOrg')} description={t('brand.noOrgDesc')}
        action={<Button asChild><Link to="/onboarding/brand">{t('brand.register')}</Link></Button>} />
    );
  }
  const membership = ms.find((m) => m.organization.id === selected) ?? ms[0]!;
  return (
    <Ctx.Provider value={{ membership, memberships: ms, select: setSelected, canManage: atLeast(membership.role, 'manager'), isAdmin: atLeast(membership.role, 'admin') }}>
      <Outlet />
    </Ctx.Provider>
  );
}

export function OrgSwitcher() {
  const { membership, memberships, select } = useBrand();
  const { t } = useI18n();
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
      <Building2 className="h-4 w-4 text-gold" aria-hidden />
      {memberships.length > 1 ? (
        <Select value={membership.organization.id} onChange={(e) => select(e.currentTarget.value)} aria-label={t('brand.organization')} className="h-9 w-auto">
          {memberships.map((m) => <option key={m.organization.id} value={m.organization.id}>{m.organization.name}</option>)}
        </Select>
      ) : <span className="font-semibold">{membership.organization.name}</span>}
      <VerificationBadge status={membership.organization.verificationStatus} />
      <Badge tone="outline"><Users className="h-3 w-3" />{t(`brand.roles.${membership.role}` as TKey)}</Badge>
    </div>
  );
}

export function VerificationBadge({ status }: { status: string }) {
  const { t } = useI18n();
  return <Badge tone={status === 'verified' ? 'success' : status === 'pending' ? 'warning' : status === 'rejected' ? 'danger' : 'neutral'}>{status === 'verified' && <BadgeCheck className="h-3 w-3" />}{t(`brand.verification.${status}` as TKey)}</Badge>;
}

const STATUS_TONE: Record<CampaignStatus, 'neutral' | 'warning' | 'success' | 'primary' | 'danger' | 'gold'> = {
  draft: 'neutral', pending_approval: 'warning', open: 'success', in_progress: 'primary', completed: 'gold', paused: 'warning', cancelled: 'danger',
};
export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const { t } = useI18n();
  return <Badge tone={STATUS_TONE[status]}>{t(`campaigns.status.${status}` as TKey)}</Badge>;
}

export function CampaignTerms({ c }: { c: Campaign }) {
  const { t, locale } = useI18n();
  const pct = (bps: number) => (locale === 'tr' ? `%${bps / 100}` : `${bps / 100}%`);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
      <Badge tone="outline">{t(`campaigns.types.${c.type}` as TKey)}</Badge>
      {c.fixedFee !== null && <span>{t('campaigns.fee')}: <CurrencyDisplay amount={c.fixedFee} currency={c.currency} className="font-semibold text-fg" /></span>}
      {c.commissionBps !== null && <span>{t('campaigns.commission')}: <span className="font-semibold text-fg">{pct(c.commissionBps)}</span></span>}
      {c.minFollowers > 0 && <span>{t('campaigns.minFollowersShort', { n: c.minFollowers.toLocaleString() })}</span>}
      {c.isSample && <SampleBadge />}
    </span>
  );
}

export function PageHead({ title, desc, action }: { title: ReactNode; desc?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><h1 className="text-2xl font-bold">{title}</h1>{desc && <p className="mt-1 max-w-2xl text-sm text-muted">{desc}</p>}</div>
      {action}
    </div>
  );
}

export function ReadOnlyNote() {
  const { t } = useI18n();
  const { canManage } = useBrand();
  if (canManage) return null;
  return <p className="mb-4 rounded-sm bg-surface p-2 text-xs text-muted">{t('brand.readOnly')}</p>;
}
