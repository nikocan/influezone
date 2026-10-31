import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = ''): string {
  const r = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix ? `${prefix}_${r}` : r;
}

export function extractHashtags(text: string): string[] {
  const set = new Set<string>();
  for (const m of text.matchAll(/#([\p{L}\p{N}_]{2,40})/gu)) set.add(m[1].toLowerCase());
  return [...set];
}

export function extractMentions(text: string): string[] {
  const set = new Set<string>();
  for (const m of text.matchAll(/@([a-z0-9_.]{2,30})/giu)) set.add(m[1].toLowerCase());
  return [...set];
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
}
