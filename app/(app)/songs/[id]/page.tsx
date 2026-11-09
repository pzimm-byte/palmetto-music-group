import { notFound } from 'next/navigation';
import { requireMember } from '@/lib/auth/session';
import {
  averageRatings,
  myRatings,
  newCommentsThisWeek,
  songDetail,
  songVersions,
  versionComments,
} from '@/lib/data/queries';
import { formatShortDate } from '@/lib/format';
import { SongView } from '@/components/song/SongView';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const song = await songDetail(id);
  return { title: song?.title ?? 'Song' };
}

export default async function SongPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string }> }) {
  const me = await requireMember();
  const { id } = await params;
  const { v } = await searchParams;
  const song = await songDetail(id);
  if (!song) notFound();
  const versions = await songVersions(song.id);
  if (versions.length === 0) notFound();
  const latest = versions[versions.length - 1];
  const requested = Number(v);
  const current = versions.find((x) => x.version_number === requested) ?? latest;
  const isWriter = song.writer_id === me.id;

  const [comments, mine, avg, newCount] = await Promise.all([
    versionComments(current.id, song.writer_id, me.id),
    myRatings(current.id, me.id),
    averageRatings(current.id),
    isWriter ? newCommentsThisWeek(latest.id, song.writer_id) : Promise.resolve(0),
  ]);
  const commentCount = comments.reduce((n, c) => n + 1 + c.replies.length, 0);

  return (
    <SongView
      key={`${song.id}-${current.version_number}`}
      song={{
        id: song.id,
        title: song.title,
        key: song.key,
        tempo: song.tempo,
        lyrics: song.lyrics,
        feedbackFocus: song.feedback_focus,
        status: song.status,
        chordChartName: song.chord_chart_name,
        chordChartPages: song.chord_chart_pages,
        writerFirst: song.writer_first,
        writerLast: song.writer_last,
        uploaded: formatShortDate(new Date(latest.created_at)),
      }}
      versions={versions.map((x) => ({ number: x.version_number, date: formatShortDate(new Date(x.created_at)) }))}
      current={{ id: current.id, number: current.version_number, duration: current.duration_seconds, date: formatShortDate(new Date(current.created_at)) }}
      latestNumber={latest.version_number}
      isWriter={isWriter}
      newCount={newCount}
      comments={JSON.parse(JSON.stringify(comments))}
      commentCount={commentCount}
      myRatings={mine}
      avgRatings={avg}
    />
  );
}
