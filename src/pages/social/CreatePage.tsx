import { useMemo, useRef, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Film, X, Search, Plus, Tag, ChevronLeft, ChevronRight, Link2, Check, AlertCircle } from 'lucide-react';
import { useI18n, type TKey } from '@/i18n/I18nProvider';
import { useAuth, useRepo } from '@/providers/AuthProvider';
import { useErrorToast } from '@/data/hooks';
import type { Disclosure, Media, NewPostInput, Product } from '@/data/types';
import { TopNavigation } from '@/components/shell/TopNavigation';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/dialog';
import { Switch, Badge } from '@/components/ui/misc';
import { useToast } from '@/components/ui/toast';
import { SmartImage } from '@/components/common/SmartImage';
import { EmptyState, ListSkeleton } from '@/components/common/States';
import { toNormalized, fitTransform } from '@/lib/tagging';
import { extractHashtags, cn, uid } from '@/lib/utils';
import { CATEGORIES } from '@/data/demo/seed';
import { dataMode } from '@/lib/env';

type Draft = Omit<Media, 'id'> & { key: string };
type DraftTag = { key: string; productId: string; mediaIndex: number; x: number; y: number };

const MAX_IMAGES = 10;
const MAX_VIDEO_MB = 100;

async function loadImage(file: File): Promise<Draft> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await img.decode();
  // downscale to max 1440px & re-encode (keeps demo storage small, strips EXIF location data)
  const scale = Math.min(1, 1440 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(url);
  return { key: uid('m'), type: 'image', url: canvas.toDataURL('image/jpeg', dataMode === 'demo' ? 0.72 : 0.88), width: w, height: h, alt: '' };
}

async function loadVideo(file: File): Promise<Draft> {
  const url = URL.createObjectURL(file);
  const v = document.createElement('video');
  v.preload = 'metadata';
  v.src = url;
  await new Promise<void>((res, rej) => { v.onloadedmetadata = () => res(); v.onerror = () => rej(new Error('video')); });
  // poster from first frame
  v.currentTime = Math.min(0.5, v.duration / 2 || 0);
  await new Promise<void>((res) => { v.onseeked = () => res(); setTimeout(res, 1500); });
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 720 / Math.max(v.videoWidth, v.videoHeight));
  canvas.width = Math.round(v.videoWidth * scale);
  canvas.height = Math.round(v.videoHeight * scale);
  let poster: string | null = null;
  try { canvas.getContext('2d')!.drawImage(v, 0, 0, canvas.width, canvas.height); poster = canvas.toDataURL('image/jpeg', 0.7); } catch { poster = null; }
  return { key: uid('m'), type: 'video', url, posterUrl: poster, width: v.videoWidth || 720, height: v.videoHeight || 1280, alt: '' };
}

/** Create flow: media → product tagging canvas → caption, disclosure, schedule. */
export function CreatePage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const repo = useRepo();
  const qc = useQueryClient();
  const toast = useToast();
  const onError = useErrorToast();
  const { profile } = useAuth();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [media, setMedia] = useState<Draft[]>([]);
  const [tags, setTags] = useState<DraftTag[]>([]);
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState<string>(profile?.interests[0] ?? '');
  const [disclosure, setDisclosure] = useState<Disclosure | null>(null);
  const [schedule, setSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isVideo = media[0]?.type === 'video';

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setFileError(null);
    setLoadingFiles(true);
    try {
      const list = Array.from(files);
      const videos = list.filter((f) => f.type.startsWith('video/'));
      if (videos.length) {
        const f = videos[0]!;
        if (f.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(t('create.videoTooLarge', { mb: MAX_VIDEO_MB }));
        setMedia([await loadVideo(f)]);
        setTags([]);
      } else {
        const imgs = list.filter((f) => f.type.startsWith('image/'));
        if (!imgs.length) throw new Error(t('create.unsupported'));
        const loaded = await Promise.all(imgs.slice(0, MAX_IMAGES - (isVideo ? 0 : media.length)).map(loadImage));
        setMedia((m) => (isVideo ? loaded : [...m, ...loaded]).slice(0, MAX_IMAGES));
        if (isVideo) setTags([]);
      }
    } catch (e) {
      setFileError(e instanceof Error && e.message !== 'video' ? e.message : t('create.unsupported'));
    } finally {
      setLoadingFiles(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeMedia = (i: number) => {
    setMedia((m) => m.filter((_, j) => j !== i));
    setTags((tg) => tg.filter((x) => x.mediaIndex !== i).map((x) => (x.mediaIndex > i ? { ...x, mediaIndex: x.mediaIndex - 1 } : x)));
  };

  const hashtags = useMemo(() => extractHashtags(caption), [caption]);
  const missingAlt = media.some((m) => !m.alt.trim());
  const needsDisclosure = tags.length > 0 && disclosure === null;
  const scheduleInvalid = schedule && (!scheduledAt || new Date(scheduledAt).getTime() < Date.now() + 5 * 60_000);

  const submit = useMutation({
    mutationFn: (status: NewPostInput['status']) => repo.createPost({
      type: isVideo ? 'video' : media.length > 1 ? 'carousel' : 'photo',
      media: media.map(({ key: _k, ...m }) => m),
      caption: caption.trim(),
      tags: tags.map(({ key: _k, ...x }) => x),
      disclosure: disclosure ?? 'none',
      category: category || null,
      status,
      scheduledAt: status === 'scheduled' ? new Date(scheduledAt).toISOString() : null,
    }),
    onSuccess: (post, status) => {
      qc.invalidateQueries();
      toast({ variant: 'success', title: t(status === 'published' ? 'create.published' : status === 'scheduled' ? 'create.scheduled' : 'create.draftSaved') });
      nav(status === 'published' ? `/p/${post.id}` : status === 'scheduled' ? '/studio/scheduled' : '/studio/drafts', { replace: true });
    },
    onError,
  });

  const steps = [t('create.stepMedia'), t('create.stepTag'), t('create.stepDetails')];

  return (
    <div className="mx-auto max-w-[720px]">
      <TopNavigation
        title={t('nav.create')}
        onBack={step > 0 ? () => setStep((s) => (s - 1) as 0 | 1) : undefined}
        actions={step < 2 ? (
          <Button size="sm" disabled={media.length === 0 || missingAlt} onClick={() => setStep((s) => (s + 1) as 1 | 2)}>{t('common.next')}<ChevronRight className="h-4 w-4 rtl:rotate-180" /></Button>
        ) : null}
      >
        <ol className="flex gap-1 px-4 pb-3" aria-label={t('create.progress')}>
          {steps.map((s, i) => (
            <li key={s} className="flex-1" aria-current={i === step ? 'step' : undefined}>
              <div className={cn('h-1 rounded-full', i <= step ? 'bg-primary' : 'bg-line')} />
              <span className={cn('mt-1 block text-[11px] font-medium', i === step ? 'text-fg' : 'text-muted')}>{i + 1}. {s}</span>
            </li>
          ))}
        </ol>
      </TopNavigation>

      <div className="p-4">
        {step === 0 && (
          <div className="space-y-4">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" multiple className="sr-only" id="file" onChange={(e) => onFiles(e.target.files)} />
            {media.length === 0 ? (
              <label htmlFor="file" className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-line bg-surface p-6 text-center hover:border-primary">
                <div className="flex gap-3 text-primary"><ImagePlus className="h-10 w-10" /><Film className="h-10 w-10" /></div>
                <span className="text-base font-semibold">{loadingFiles ? t('common.loading') : t('create.pick')}</span>
                <span className="max-w-sm text-sm text-muted">{t('create.pickHint', { n: MAX_IMAGES, mb: MAX_VIDEO_MB })}</span>
              </label>
            ) : (
              <>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {media.map((m, i) => (
                    <li key={m.key} className="space-y-2">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-surface">
                        {m.type === 'video' ? <video src={m.url} poster={m.posterUrl ?? undefined} className="h-full w-full object-cover" muted playsInline /> : <img src={m.url} alt="" className="h-full w-full object-cover" />}
                        <button type="button" onClick={() => removeMedia(i)} className="absolute end-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white" aria-label={t('create.removeMedia', { n: i + 1 })}><X className="h-4 w-4" /></button>
                        <span className="absolute start-2 top-2 rounded-full bg-black/60 px-2 text-xs font-bold text-white">{i + 1}</span>
                      </div>
                      <Input value={m.alt} onChange={(e) => setMedia((all) => all.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} placeholder={t('create.altPlaceholder')} aria-label={t('create.altLabel', { n: i + 1 })} maxLength={300} aria-invalid={!m.alt.trim()} className="h-10 text-xs" />
                    </li>
                  ))}
                  {!isVideo && media.length < MAX_IMAGES && (
                    <li><label htmlFor="file" className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-line text-sm text-muted hover:border-primary"><Plus className="h-6 w-6" />{t('create.addMore')}</label></li>
                  )}
                </ul>
                {missingAlt && <p className="flex items-center gap-1.5 text-xs text-warning"><AlertCircle className="h-4 w-4" />{t('create.altRequired')}</p>}
              </>
            )}
            {fileError && <p role="alert" className="text-sm text-danger">{fileError}</p>}
            {dataMode === 'demo' && isVideo && <p className="rounded-sm bg-warning/10 p-2 text-xs text-muted">{t('create.demoVideoNote')}</p>}
          </div>
        )}

        {step === 1 && <TaggingStep media={media} tags={tags} setTags={setTags} />}

        {step === 2 && (
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (!needsDisclosure && !scheduleInvalid) submit.mutate(schedule ? 'scheduled' : 'published'); }}>
            <div className="flex gap-3">
              <SmartImage src={media[0]?.type === 'video' ? media[0].posterUrl ?? undefined : media[0]?.url} alt="" className="h-24 w-20 shrink-0 rounded-sm object-cover" />
              <div className="flex-1">
                <Field label={t('create.caption')} hint={t('create.captionHint', { n: caption.length, max: 2200 })}>{(p) => <Textarea {...p} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={2200} rows={5} placeholder={t('create.captionPlaceholder')} />}</Field>
              </div>
            </div>
            {hashtags.length > 0 && <div className="flex flex-wrap gap-1.5">{hashtags.map((h) => <Badge key={h} tone="primary">#{h}</Badge>)}</div>}
            <Field label={t('create.category')}>{(p) => (
              <Select {...p} value={category} onChange={(e) => setCategory(e.currentTarget.value)}>
                <option value="">{t('create.noCategory')}</option>
                {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{t(`categories.${c.slug}` as TKey)}</option>)}
              </Select>
            )}</Field>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t('create.disclosure')}</legend>
              <p className="text-xs text-muted">{t('create.disclosureHint')}</p>
              {(['none', 'affiliate', 'sponsored', 'gifted'] as Disclosure[]).map((d) => (
                <label key={d} className={cn('flex min-h-[48px] cursor-pointer items-center gap-3 rounded-sm border px-3', disclosure === d ? 'border-primary bg-primary-soft/50' : 'border-line')}>
                  <input type="radio" name="disclosure" checked={disclosure === d} onChange={() => setDisclosure(d)} className="h-4 w-4 accent-[#7047EB]" />
                  <span className="text-sm"><span className="font-semibold">{t(`create.disclosureOptions.${d}` as TKey)}</span><span className="block text-xs text-muted">{t(`create.disclosureDesc.${d}` as TKey)}</span></span>
                </label>
              ))}
              {needsDisclosure && <p role="alert" className="text-xs text-danger">{t('create.disclosureRequired')}</p>}
            </fieldset>
            <div className="rounded-md border border-line p-3">
              <Switch checked={schedule} onCheckedChange={setSchedule} label={t('create.schedule')} description={t('create.scheduleDesc')} />
              {schedule && (
                <Field label={t('create.scheduleAt')} error={scheduleInvalid && scheduledAt ? t('create.scheduleInvalid') : undefined} className="mt-2">{(p) => <Input {...p} type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />}</Field>
              )}
              {schedule && <p className="mt-2 text-xs text-muted">{t('create.schedulerNote')}</p>}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => submit.mutate('draft')} loading={submit.isPending && submit.variables === 'draft'}>{t('create.saveDraft')}</Button>
              <Button type="submit" className="flex-1" disabled={needsDisclosure || scheduleInvalid || media.length === 0} loading={submit.isPending && submit.variables !== 'draft'}>{schedule ? t('create.scheduleBtn') : t('create.publish')}</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function TaggingStep({ media, tags, setTags }: { media: Draft[]; tags: DraftTag[]; setTags: (fn: (t: DraftTag[]) => DraftTag[]) => void }) {
  const { t } = useI18n();
  const repo = useRepo();
  const [index, setIndex] = useState(0);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const m = media[index]!;
  const productIds = [...new Set(tags.map((x) => x.productId))];
  const products = useQuery({ queryKey: ['products', 'tagging', productIds.join(',')], queryFn: async () => new Map((await repo.getProducts(productIds)).map((p) => [p.id, p])), enabled: productIds.length > 0 });

  const place = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const n = toNormalized(e.clientX - rect.left, e.clientY - rect.top, { width: rect.width, height: rect.height }, { width: m.width, height: m.height }, 'contain');
    if (n) setPending(n);
  };

  const box = frame.current ? { width: frame.current.clientWidth, height: frame.current.clientHeight } : null;
  const pos = (x: number, y: number) => {
    if (!box) return { left: `${x * 100}%`, top: `${y * 100}%` };
    const { scale, offsetX, offsetY } = fitTransform(box, { width: m.width, height: m.height }, 'contain');
    return { left: offsetX + x * m.width * scale, top: offsetY + y * m.height * scale };
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t('create.tagHint')}</p>
      <div className="relative">
        <div ref={frame} onClick={place} className="relative aspect-[4/5] w-full cursor-crosshair overflow-hidden rounded-md bg-black" role="application" aria-label={t('create.tagCanvas')}>
          {m.type === 'video' ? <video src={m.url} poster={m.posterUrl ?? undefined} className="pointer-events-none h-full w-full object-contain" muted playsInline /> : <img src={m.url} alt={m.alt} className="pointer-events-none h-full w-full object-contain" />}
          {tags.filter((x) => x.mediaIndex === index).map((x) => {
            const p = products.data?.get(x.productId);
            return (
              <span key={x.key} style={pos(x.x, x.y)} className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-white/95 py-1 pe-2.5 ps-1 text-xs font-semibold text-[#111] shadow">
                <span className="h-4 w-4 rounded-full bg-primary" />{p?.title ?? '…'}
              </span>
            );
          })}
          {pending && <span style={pos(pending.x, pending.y)} className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow-lg" />}
        </div>
        {media.length > 1 && (
          <div className="mt-2 flex items-center justify-center gap-3">
            <Button variant="secondary" size="icon-sm" disabled={index === 0} onClick={() => setIndex((i) => i - 1)} aria-label={t('common.previous')}><ChevronLeft className="h-4 w-4 rtl:rotate-180" /></Button>
            <span className="text-sm font-medium">{index + 1} / {media.length}</span>
            <Button variant="secondary" size="icon-sm" disabled={index === media.length - 1} onClick={() => setIndex((i) => i + 1)} aria-label={t('common.next')}><ChevronRight className="h-4 w-4 rtl:rotate-180" /></Button>
          </div>
        )}
      </div>
      <Button variant="outline" block onClick={() => setPending({ x: 0.5, y: 0.5 })}><Tag className="h-4 w-4" />{t('create.tagCenter')}</Button>
      <div>
        <h3 className="mb-2 text-sm font-semibold">{t('create.taggedList', { n: tags.length })}</h3>
        {tags.length === 0 ? <p className="text-sm text-muted">{t('create.noTags')}</p> : (
          <ul className="space-y-2">
            {tags.map((x) => {
              const p = products.data?.get(x.productId);
              return (
                <li key={x.key} className="flex items-center gap-3 rounded-sm border border-line p-2">
                  <SmartImage src={p?.images[0]} alt="" className="h-10 w-10 rounded-[8px] object-cover" />
                  <span className="min-w-0 flex-1 text-sm"><span className="block truncate font-semibold">{p?.title ?? '…'}</span><span className="text-xs text-muted">{t('create.onMedia', { n: x.mediaIndex + 1 })}</span></span>
                  <Button variant="ghost" size="icon-sm" onClick={() => setTags((all) => all.filter((y) => y.key !== x.key))} aria-label={t('create.removeTag')}><X className="h-4 w-4" /></Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {pending && (
        <ProductPicker
          onOpenChange={(o) => { if (!o) setPending(null); }}
          onPick={(p) => { setTags((all) => [...all, { key: uid('tg'), productId: p.id, mediaIndex: index, x: pending.x, y: pending.y }]); setPending(null); }}
        />
      )}
    </div>
  );
}

function ProductPicker({ onPick, onOpenChange }: { onPick: (p: Product) => void; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const repo = useRepo();
  const toast = useToast();
  const onError = useErrorToast();
  const [q, setQ] = useState('');
  const [proposing, setProposing] = useState(false);
  const res = useQuery({ queryKey: ['products', 'picker', q], queryFn: () => repo.searchProducts(q) });
  const [form, setForm] = useState({ brandName: '', title: '', variant: '', url: '', gtin: '', category: 'fashion', note: '' });
  const propose = useMutation({
    mutationFn: () => repo.proposeProduct({ ...form, variant: form.variant || null, gtin: form.gtin || null }),
    onSuccess: () => { toast({ variant: 'success', title: t('create.proposalSent'), description: t('create.proposalSentDesc') }); setProposing(false); },
    onError,
  });
  return (
    <Modal open onOpenChange={onOpenChange} title={proposing ? t('create.proposeTitle') : t('create.pickProduct')} variant="sheet">
      {!proposing ? (
        <div className="space-y-3">
          <div className="relative"><Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('create.searchCatalog')} className="ps-9" autoFocus aria-label={t('create.searchCatalog')} /></div>
          {res.isLoading ? <ListSkeleton rows={3} /> : !res.data?.length ? <EmptyState title={t('create.noCatalogMatch')} description={t('create.noCatalogMatchDesc')} /> : (
            <ul className="space-y-1">
              {res.data.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => onPick(p)} className="flex min-h-[56px] w-full items-center gap-3 rounded-sm px-2 text-start hover:bg-surface">
                    <SmartImage src={p.images[0]} alt="" className="h-12 w-12 rounded-[8px] object-cover" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-xs text-muted">{p.brandName}</span><span className="block truncate text-sm font-semibold">{p.title}</span>{p.variant && <span className="block truncate text-xs text-muted">{p.variant}</span>}</span>
                    <Check className="h-4 w-4 text-primary opacity-0" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button variant="outline" block onClick={() => setProposing(true)}><Link2 className="h-4 w-4" />{t('create.proposeCta')}</Button>
        </div>
      ) : (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); propose.mutate(); }}>
          <p className="text-xs text-muted">{t('create.proposeDesc')}</p>
          <Field label={t('create.pBrand')}>{(p) => <Input {...p} required value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} />}</Field>
          <Field label={t('create.pTitle')}>{(p) => <Input {...p} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />}</Field>
          <Field label={t('create.pVariant')} hint={t('create.pVariantHint')}>{(p) => <Input {...p} value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value })} />}</Field>
          <Field label={t('create.pUrl')} hint={t('create.pUrlHint')}>{(p) => <Input {...p} required type="url" inputMode="url" placeholder="https://" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />}</Field>
          <Field label="GTIN / EAN / UPC" hint={t('create.pGtinHint')}>{(p) => <Input {...p} inputMode="numeric" pattern="[0-9]{8,14}" value={form.gtin} onChange={(e) => setForm({ ...form, gtin: e.target.value })} />}</Field>
          <Field label={t('create.category')}>{(p) => (
            <Select {...p} value={form.category} onChange={(e) => setForm({ ...form, category: e.currentTarget.value })}>
              {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{t(`categories.${c.slug}` as TKey)}</option>)}
            </Select>
          )}</Field>
          <div className="flex gap-2"><Button type="button" variant="ghost" className="flex-1" onClick={() => setProposing(false)}>{t('common.back')}</Button><Button type="submit" className="flex-1" loading={propose.isPending}>{t('create.proposeSubmit')}</Button></div>
        </form>
      )}
    </Modal>
  );
}
