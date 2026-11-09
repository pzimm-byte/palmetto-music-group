import Link from 'next/link';
import { MessageCircle, Music, User } from 'lucide-react';
import { STATUS_LABEL, avatarTone, formatTime, initials, type SongStatus } from '@/lib/format';

export function StatusTag({ status, large = false }: { status: SongStatus; large?: boolean }) {
  return <span className={`tag tag-${status}${large ? ' tag-lg' : ''}`}>{STATUS_LABEL[status]}</span>;
}

export function Avatar({ id, first, last, size = 36, writer = false }: { id: string | null; first: string | null; last: string | null; size?: 28 | 32 | 36; writer?: boolean }) {
  if (!id || !first) {
    return (
      <span className={`avatar avatar-${size} tone-anon`} aria-hidden="true">
        <User size={size === 36 ? 18 : 16} strokeWidth={2} />
      </span>
    );
  }
  return (
    <span className={`avatar avatar-${size} ${writer ? 'tone-writer' : avatarTone(id)}`} aria-hidden="true">
      {initials(first, last ?? '')}
    </span>
  );
}

const TILE_TONES = ['tone-a', 'tone-b', 'tone-a', 'tone-c'] as const;

export function SongTile({ index }: { index: number }) {
  return (
    <span className={`tile ${TILE_TONES[index % TILE_TONES.length]}`} aria-hidden="true">
      <Music size={22} strokeWidth={2} />
    </span>
  );
}

export type SongRowData = {
  id: string;
  title: string;
  status: SongStatus;
  writer_first: string;
  writer_last: string;
  latest_version: number;
  duration_seconds: number;
  comment_count: number;
};

/** Library row: title, writer · latest version, status tag, length, comment count. */
export function SongRowCard({ song, index }: { song: SongRowData; index: number }) {
  return (
    <Link href={`/songs/${song.id}`} className="song-row" data-testid="song-row">
      <SongTile index={index} />
      <span className="min0 stack" style={{ gap: 2 }}>
        <span className="song-row-title ellipsis">{song.title}</span>
        <span className="meta ellipsis">
          {song.writer_first} {song.writer_last} · v{song.latest_version}
        </span>
        <span style={{ alignSelf: 'flex-start', marginTop: 2 }}>
          <StatusTag status={song.status} />
        </span>
      </span>
      <span className="song-row-side tabular">
        <span>{formatTime(song.duration_seconds)}</span>
        <span className="row" style={{ gap: 4 }} aria-label={`${song.comment_count} comments`}>
          <MessageCircle size={14} strokeWidth={2} aria-hidden="true" />
          {song.comment_count}
        </span>
      </span>
    </Link>
  );
}

/** Home "needs your feedback" row: writer · version · comment count, "In review" tag. */
export function FeedbackRowCard({ song, index }: { song: SongRowData; index: number }) {
  const n = song.comment_count;
  return (
    <Link href={`/songs/${song.id}`} className="song-row" data-testid="feedback-row">
      <SongTile index={index} />
      <span className="min0 stack">
        <span className="song-row-title ellipsis">{song.title}</span>
        <span className="meta ellipsis">
          {song.writer_first} {song.writer_last} · v{song.latest_version} · {n} {n === 1 ? 'comment' : 'comments'}
        </span>
      </span>
      <StatusTag status={song.status} />
    </Link>
  );
}
