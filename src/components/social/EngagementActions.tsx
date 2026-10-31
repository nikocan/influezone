import { useState } from 'react';
import { Bookmark, Heart, MessageCircle, Send } from 'lucide-react';
import type { Post } from '@/data/types';
import { useLikedSet, useLikeToggle, useRequireAuth, useSavedPostIds } from '@/data/hooks';
import { useSheets } from './Sheets';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';

export function useLikeAction(post: Post) {
  const { data: liked } = useLikedSet();
  const toggle = useLikeToggle();
  const guard = useRequireAuth();
  const isLiked = liked?.has(post.id) ?? false;
  return { isLiked, toggle: guard(() => toggle.mutate({ postId: post.id, like: !isLiked })), likeOnly: guard(() => { if (!isLiked) toggle.mutate({ postId: post.id, like: true }); }) };
}

export function EngagementActions({ post, layout = 'row', onDark }: { post: Post; layout?: 'row' | 'column'; onDark?: boolean }) {
  const { t, compact } = useI18n();
  const sheets = useSheets();
  const guard = useRequireAuth();
  const saved = useSavedPostIds();
  const { isLiked, toggle } = useLikeAction(post);
  const [pop, setPop] = useState(false);
  const isSaved = saved.has(post.id);
  const btn = cn('inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full transition-colors', onDark ? 'text-white' : 'text-fg hover:text-muted', layout === 'column' && 'flex-col gap-0.5 text-xs font-semibold');
  const count = (n: number) => <span className={cn('text-sm font-semibold tabular-nums', layout === 'column' && 'text-xs')}>{compact(n)}</span>;
  return (
    <div className={cn('flex items-center', layout === 'column' ? 'flex-col gap-3' : 'gap-1')}>
      <button type="button" className={btn} aria-pressed={isLiked} aria-label={isLiked ? t('social.unlike') : t('social.like')} onClick={() => { toggle(); setPop(true); setTimeout(() => setPop(false), 250); }}>
        <Heart className={cn('h-6 w-6', isLiked && 'fill-danger text-danger', pop && 'animate-pop', onDark && 'drop-shadow')} />
        {count(post.likeCount)}
      </button>
      <button type="button" className={btn} aria-label={t('social.comments')} onClick={() => sheets.openComments(post.id)}>
        <MessageCircle className={cn('h-6 w-6', onDark && 'drop-shadow')} />
        {count(post.commentCount)}
      </button>
      <button type="button" className={btn} aria-label={t('social.share')} onClick={() => sheets.openShare(post)}>
        <Send className={cn('h-6 w-6', onDark && 'drop-shadow')} />
        {layout === 'column' && count(post.shareCount)}
      </button>
      <button type="button" className={cn(btn, layout === 'row' && 'ms-auto')} aria-pressed={isSaved} aria-label={isSaved ? t('social.saved') : t('social.save')} onClick={guard(() => sheets.openSave('post', post.id))}>
        <Bookmark className={cn('h-6 w-6', isSaved && 'fill-current', onDark && 'drop-shadow')} />
        {layout === 'column' && count(post.saveCount)}
      </button>
    </div>
  );
}
