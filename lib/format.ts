export type SongStatus = 'draft' | 'in_review' | 'review_complete' | 'archived';

export const STATUS_LABEL: Record<SongStatus, string> = {
  in_review: 'In review',
  review_complete: 'Review complete',
  draft: 'Draft',
  archived: 'Archived',
};

export const STATUS_ORDER: SongStatus[] = ['in_review', 'review_complete', 'draft', 'archived'];

export function isStatus(v: unknown): v is SongStatus {
  return typeof v === 'string' && (STATUS_ORDER as string[]).includes(v);
}

/** 102 -> "1:42" */
export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? '0' : ''}${r}`;
}

export function formatMB(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb < 10 ? mb.toFixed(1) : String(Math.round(mb));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatShortDate(d: Date): string {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "Today", "Yesterday", "3 days ago", or "Oct 14" for older dates. */
export function timeAgo(d: Date, now: Date = new Date()): string {
  const ms = now.getTime() - d.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24 && now.getUTCDate() === d.getUTCDate()) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.floor(ms / 86400000);
  if (days <= 1) return now.getUTCDate() === d.getUTCDate() ? 'Today' : 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatShortDate(d);
}

export function initials(first: string, last: string): string {
  return `${first.trim()[0] ?? ''}${last.trim()[0] ?? ''}`.toUpperCase();
}

export function greeting(now: Date = new Date(), timeZone = 'America/New_York'): string {
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone }).format(now)) % 24;
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Deterministic pseudo-waveform for a version (real peaks come from audio in Phase 2). */
export function waveformBars(seed: string, count = 60): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const phase = ((h >>> 0) % 1000) / 1000;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const v = Math.abs(Math.sin(i * 0.55 + phase * 6) * Math.cos(i * 0.17 + phase * 3));
    out.push(12 + Math.round(40 * v + 8 * (((i * 7 + Math.floor(phase * 10)) % 5) / 5)));
  }
  return out;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Avatar colour pairs as token references (never raw colours). */
const AVATAR_TONES = ['tone-a', 'tone-b', 'tone-c', 'tone-d'] as const;
export function avatarTone(id: string): (typeof AVATAR_TONES)[number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

export const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
export const AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/wave'];
