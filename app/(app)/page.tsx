import Link from 'next/link';
import { ArrowRight, Pin } from 'lucide-react';
import { requireMember } from '@/lib/auth/session';
import { pinnedAnnouncement, recentActivity, songsNeedingFeedback } from '@/lib/data/queries';
import { formatTime, greeting, timeAgo } from '@/lib/format';
import { Avatar, FeedbackRowCard } from '@/components/bits';
import { NotificationBell } from '@/components/NotificationBell';

export const metadata = { title: 'Home' };

const TZ = 'America/New_York';

function dateTile(d: Date) {
  const day = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: TZ }).format(d).toUpperCase();
  const parts = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ }).formatToParts(d);
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  const ampm = (parts.find((p) => p.type === 'dayPeriod')?.value ?? '').toUpperCase();
  return { day, time: `${hour}${minute === '00' ? '' : ':' + minute} ${ampm}` };
}

export default async function HomePage() {
  const me = await requireMember();
  const [announcement, feedback, activity] = await Promise.all([pinnedAnnouncement(), songsNeedingFeedback(me), recentActivity()]);
  const tile = announcement?.event_at ? dateTile(new Date(announcement.event_at)) : null;

  return (
    <div className="screen">
      <header className="app-header">
        <div className="min0">
          <div className="eyebrow">Palmetto Baptist Church</div>
          <h1 className="screen-title">Songwriters</h1>
          <p className="meta break">
            {greeting(new Date(), TZ)}, {me.first_name}
          </p>
        </div>
        <NotificationBell />
      </header>

      <main className="stack gap-22" style={{ paddingTop: 4 }}>
        {announcement && (
          <section aria-label="Pinned announcement" className="card pad-16 stack gap-12">
            <div className="eyebrow row" style={{ gap: 6 }}>
              <Pin size={14} strokeWidth={2} aria-hidden="true" />
              Pinned announcement
            </div>
            <div className="row" style={{ gap: 14 }}>
              {tile && (
                <div className="date-tile" aria-hidden="true">
                  <span className="date-tile-day">{tile.day}</span>
                  <span className="date-tile-time">{tile.time}</span>
                </div>
              )}
              <div className="min0 stack" style={{ gap: 2 }}>
                <h2 style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.25 }} className="break">
                  {announcement.title}
                </h2>
                {announcement.details && <p className="meta break">{announcement.details}</p>}
              </div>
            </div>
            {announcement.body && (
              <p className="break" style={{ fontSize: 14, color: 'var(--text2)' }}>
                {announcement.body}
              </p>
            )}
            <Link href="/announcements" className="text-link" style={{ alignSelf: 'flex-end' }}>
              See all announcements <ArrowRight size={16} strokeWidth={2.4} aria-hidden="true" />
            </Link>
          </section>
        )}

        <section aria-labelledby="needs" className="stack gap-10">
          <div className="row between" style={{ alignItems: 'baseline' }}>
            <h2 id="needs" className="section-heading">Needs your feedback</h2>
            <Link href="/songs?status=in_review" className="text-link" style={{ fontWeight: 500 }}>
              See all
            </Link>
          </div>
          {feedback.length === 0 ? (
            <p className="card card-14 pad-16 meta">You&apos;re all caught up. New songs in review will show up here.</p>
          ) : (
            <div className="stack gap-10">
              {feedback.map((s, i) => (
                <FeedbackRowCard key={s.id} song={s} index={i} />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="activity" className="stack gap-10">
          <h2 id="activity" className="section-heading">Recent activity</h2>
          {activity.length === 0 ? (
            <p className="card card-14 pad-16 meta">No activity yet.</p>
          ) : (
            <ul className="card card-14 activity-list">
              {activity.map((a, i) => {
                const name = a.actor_first ? `${a.actor_first} ${a.actor_last}` : 'Anonymous';
                return (
                  <li key={`${a.kind}-${a.song_id}-${i}`}>
                    <Avatar id={a.actor_first ? a.actor_id : null} first={a.actor_first} last={a.actor_last} size={32} />
                    <Link href={`/songs/${a.song_id}`} className="activity-text break">
                      <b>{name}</b>{' '}
                      {a.kind === 'upload' ? (
                        <>uploaded v{a.version_number} of </>
                      ) : (
                        <>commented{a.timestamp_seconds !== null ? ` at ${formatTime(a.timestamp_seconds)}` : ''} on </>
                      )}
                      <b>{a.song_title}</b>
                      <br />
                      <span className="activity-when">{timeAgo(new Date(a.at))}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
