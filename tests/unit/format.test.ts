import { describe, expect, it } from 'vitest';
import { STATUS_LABEL, avatarTone, clamp, formatMB, formatTime, greeting, initials, isStatus, timeAgo, waveformBars } from '@/lib/format';
import { isPublicPath } from '@/lib/auth/mode';

describe('formatTime', () => {
  it('formats seconds as m:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(58)).toBe('0:58');
    expect(formatTime(102)).toBe('1:42');
    expect(formatTime(258)).toBe('4:18');
    expect(formatTime(3600)).toBe('60:00');
  });
  it('floors fractions and clamps negatives', () => {
    expect(formatTime(101.9)).toBe('1:41');
    expect(formatTime(-5)).toBe('0:00');
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-11-09T15:00:00Z');
  it('handles recent and older dates', () => {
    expect(timeAgo(new Date('2026-11-09T14:59:40Z'), now)).toBe('Just now');
    expect(timeAgo(new Date('2026-11-09T14:30:00Z'), now)).toBe('30 min ago');
    expect(timeAgo(new Date('2026-11-09T10:00:00Z'), now)).toBe('5 hours ago');
    expect(timeAgo(new Date('2026-11-08T12:00:00Z'), now)).toBe('Yesterday');
    expect(timeAgo(new Date('2026-11-05T12:00:00Z'), now)).toBe('4 days ago');
    expect(timeAgo(new Date('2026-10-14T12:00:00Z'), now)).toBe('Oct 14');
  });
});

describe('status helpers', () => {
  it('labels every status', () => {
    expect(STATUS_LABEL.in_review).toBe('In review');
    expect(STATUS_LABEL.review_complete).toBe('Review complete');
    expect(isStatus('draft')).toBe(true);
    expect(isStatus('published')).toBe(false);
    expect(isStatus(undefined)).toBe(false);
  });
});

describe('misc', () => {
  it('initials, clamp, MB', () => {
    expect(initials('Sarah', 'Mitchell')).toBe('SM');
    expect(initials('Jonathan Alexander', 'Montgomery-Whitfield')).toBe('JM');
    expect(clamp(300, 0, 258)).toBe(258);
    expect(clamp(-3, 0, 258)).toBe(0);
    expect(formatMB(6.8 * 1024 * 1024)).toBe('6.8');
    expect(formatMB(100 * 1024 * 1024)).toBe('100');
  });
  it('greeting follows Greenville time', () => {
    expect(greeting(new Date('2026-11-09T13:00:00Z'))).toBe('Good morning'); // 8 AM ET
    expect(greeting(new Date('2026-11-09T19:00:00Z'))).toBe('Good afternoon'); // 2 PM ET
    expect(greeting(new Date('2026-11-10T01:00:00Z'))).toBe('Good evening'); // 8 PM ET
  });
  it('waveform is deterministic and in range', () => {
    const a = waveformBars('abc');
    expect(a).toHaveLength(60);
    expect(waveformBars('abc')).toEqual(a);
    expect(waveformBars('xyz')).not.toEqual(a);
    for (const h of a) expect(h >= 12 && h <= 60).toBe(true);
  });
  it('avatar tone is stable', () => {
    expect(avatarTone('member-1')).toBe(avatarTone('member-1'));
  });
});

describe('public paths', () => {
  it('only auth screens are public', () => {
    expect(isPublicPath('/sign-in')).toBe(true);
    expect(isPublicPath('/forgot-password')).toBe(true);
    expect(isPublicPath('/reset-password')).toBe(true);
    expect(isPublicPath('/api/auth/get-session')).toBe(true);
    expect(isPublicPath('/')).toBe(false);
    expect(isPublicPath('/songs')).toBe(false);
    expect(isPublicPath('/upload')).toBe(false);
    expect(isPublicPath('/sign-in-evil')).toBe(false);
  });
});
