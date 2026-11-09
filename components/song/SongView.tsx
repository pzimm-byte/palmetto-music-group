'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, FileText, Headphones, MapPin, Pause, Play, RotateCcw, RotateCw, Send, Upload } from 'lucide-react';
import { formatTime, waveformBars, type SongStatus } from '@/lib/format';
import type { CommentNode, Ratings } from '@/lib/data/queries';
import { postComment, rateVersion, setReviewComplete, type RatingCategory } from '@/lib/data/actions';
import { StatusTag } from '@/components/bits';
import { usePlayer } from './usePlayer';
import { CommentList } from './CommentList';

type Props = {
  song: {
    id: string;
    title: string;
    key: string | null;
    tempo: number | null;
    lyrics: string;
    feedbackFocus: string;
    status: SongStatus;
    chordChartName: string | null;
    chordChartPages: number | null;
    writerFirst: string;
    writerLast: string;
    uploaded: string;
  };
  versions: { number: number; date: string }[];
  current: { id: string; number: number; duration: number; date: string };
  latestNumber: number;
  isWriter: boolean;
  newCount: number;
  comments: CommentNode[];
  commentCount: number;
  myRatings: Ratings;
  avgRatings: Ratings & { count: number };
};

const CATS: { key: RatingCategory; name: string }[] = [
  { key: 'melody', name: 'Melody' },
  { key: 'lyrics', name: 'Lyrics' },
  { key: 'singability', name: 'Singable' },
  { key: 'theology', name: 'Theology' },
];

export function SongView(p: Props) {
  const router = useRouter();
  const player = usePlayer(p.current.duration);
  const D = p.current.duration;
  const bars = useMemo(() => waveformBars(p.current.id), [p.current.id]);
  const isLatest = p.current.number === p.latestNumber;

  // ----- version picker: latest on the right, open scrolled to the right -----
  const versionsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = versionsRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('[aria-current="true"]');
    if (isLatest || !active) el.scrollLeft = el.scrollWidth;
    else active.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [isLatest]);

  // ----- pin: follows the playhead until the member drags it -----
  const [pinOn, setPinOn] = useState(true);
  const [pinDragged, setPinDragged] = useState<number | null>(null);
  const pinAt = Math.round(pinDragged ?? player.position);
  const [body, setBody] = useState('');
  const [posted, setPosted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, startSend] = useTransition();

  const send = () => {
    setError(null);
    const text = body.trim();
    if (!text) {
      setError('Write some feedback first.');
      return;
    }
    const at = pinOn ? pinAt : null;
    startSend(async () => {
      const r = await postComment({ versionId: p.current.id, body: text, timestampSeconds: at });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setBody('');
      setPinDragged(null);
      setPosted(at === null ? 'Posted for the whole song. Thanks for the feedback!' : `Posted at ${formatTime(at)}. Thanks for the feedback!`);
      router.refresh();
    });
  };

  // ----- ratings (save automatically) -----
  const [ratings, setRatings] = useState<Ratings>(p.myRatings);
  const [rateError, setRateError] = useState<string | null>(null);
  const rate = (cat: RatingCategory, value: number) => {
    setRatings((r) => ({ ...r, [cat]: value }));
    setRateError(null);
    rateVersion({ versionId: p.current.id, category: cat, value }).then((r) => {
      if (!r.ok) setRateError(r.error);
      else router.refresh();
    });
  };

  // ----- writer tools -----
  const [completing, startComplete] = useTransition();
  const complete = p.song.status === 'review_complete';

  // ----- waveform seek by tap/drag -----
  const waveRef = useRef<HTMLDivElement>(null);
  const seekFromPointer = (clientX: number) => {
    const el = waveRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    player.seek(((clientX - rect.left) / rect.width) * D);
  };

  const [tab, setTab] = useState<'f' | 'l' | 'c'>('f');
  const [chartNote, setChartNote] = useState(false);
  const markers = p.comments.filter((c) => c.timestamp_seconds !== null);
  const playedBars = Math.round((bars.length * player.position) / D);
  const meta = [p.song.key ? `Key of ${p.song.key}` : null, p.song.tempo ? `${p.song.tempo} BPM` : null].filter(Boolean).join(' · ');
  const verLabel = `v${p.current.number}`;

  return (
    <div className="screen">
      <header className="row between" style={{ padding: '12px 0' }}>
        <Link href="/songs" className="icon-btn" aria-label="Back to songs" style={{ marginLeft: -8 }}>
          <ChevronLeft size={22} strokeWidth={2} aria-hidden="true" />
        </Link>
        <span style={{ fontWeight: 600, fontSize: 16 }}>Song</span>
        <span style={{ width: 44 }} aria-hidden="true" />
      </header>

      <main className="stack gap-16">
        <section className="stack gap-10">
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <StatusTag status={p.song.status} large />
            {meta && <span className="meta">{meta}</span>}
          </div>
          <h1 className="song-title break">{p.song.title}</h1>
          <p className="meta break" style={{ fontSize: 14 }}>
            by {p.song.writerFirst} {p.song.writerLast} · uploaded {p.song.uploaded}
          </p>
          <div ref={versionsRef} className="versions" role="group" aria-label="Versions, newest on the right" data-testid="versions">
            {p.versions.map((v) => (
              <Link
                key={v.number}
                href={v.number === p.latestNumber ? `/songs/${p.song.id}` : `/songs/${p.song.id}?v=${v.number}`}
                className="version-pill"
                aria-current={v.number === p.current.number ? 'true' : undefined}
                scroll={false}
                replace
              >
                v{v.number}
                {v.number === p.latestNumber ? ' · latest' : ''}
              </Link>
            ))}
          </div>
        </section>

        {p.isWriter && (
          <section aria-label="Writer tools" className="writer-card" data-testid="writer-card">
            <div className="stack" style={{ gap: 2 }}>
              <span className="label">Your song</span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>
                {p.newCount === 0
                  ? `No new comments on v${p.latestNumber} this week`
                  : `${p.newCount} new ${p.newCount === 1 ? 'comment' : 'comments'} on v${p.latestNumber} this week`}
              </span>
            </div>
            <div className="row between" style={{ gap: 8, flexWrap: 'wrap' }}>
              <Link href={`/upload?mode=version&song=${p.song.id}`} className="btn btn-brand">
                <Upload size={16} strokeWidth={2.4} aria-hidden="true" />
                Upload v{p.latestNumber + 1}
              </Link>
              <button
                className="btn btn-outline-inverse"
                disabled={completing}
                onClick={() =>
                  startComplete(async () => {
                    await setReviewComplete({ songId: p.song.id, complete: !complete });
                    router.refresh();
                  })
                }
              >
                {complete ? 'Reopen' : 'Mark complete'}
              </button>
            </div>
          </section>
        )}

        {p.song.feedbackFocus && (
          <section aria-label="What to listen for" className="ask-card">
            <span className="ask-icon" aria-hidden="true">
              <Headphones size={18} strokeWidth={2} />
            </span>
            <div className="stack min0" style={{ gap: 4 }}>
              <h2>{p.isWriter ? 'You asked listeners about' : `What ${p.song.writerFirst} wants feedback on`}</h2>
              <p className="break" style={{ fontSize: 14 }}>{p.song.feedbackFocus}</p>
            </div>
          </section>
        )}

        <section aria-label="Player" className="card pad-16 stack gap-12">
          {!isLatest && (
            <div className="older-note" role="status">
              Playing v{p.current.number} from {p.current.date}. The latest version is v{p.latestNumber}.
            </div>
          )}
          <div className="markers">
            {markers.map((m) => (
              <button
                key={m.id}
                className="marker"
                style={{ left: `${((m.timestamp_seconds as number) / D) * 100}%` }}
                aria-label={`Jump to comment at ${formatTime(m.timestamp_seconds as number)}`}
                onClick={() => player.seek(m.timestamp_seconds as number)}
              >
                <span aria-hidden="true" />
              </button>
            ))}
          </div>
          <div
            ref={waveRef}
            className="wave"
            data-testid="waveform"
            role="slider"
            tabIndex={0}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={D}
            aria-valuenow={Math.round(player.position)}
            aria-valuetext={formatTime(player.position)}
            onPointerDown={(e) => {
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              seekFromPointer(e.clientX);
            }}
            onPointerMove={(e) => {
              if (e.buttons === 1) seekFromPointer(e.clientX);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') player.skip(5);
              if (e.key === 'ArrowLeft') player.skip(-5);
            }}
          >
            {bars.map((h, i) => (
              <span key={i} className={`wave-bar${i < playedBars ? ' played' : ''}`} style={{ height: h }} />
            ))}
            {!p.isWriter && pinOn && (
              <>
                <span className="pin-line" style={{ left: `${(pinAt / D) * 100}%` }} data-testid="pin-marker" />
                <span className="pin-head" style={{ left: `${(pinAt / D) * 100}%` }} />
              </>
            )}
          </div>
          <div className="row between meta tabular">
            <span data-testid="position">{formatTime(player.position)}</span>
            <span>{formatTime(D)}</span>
          </div>
          <div className="row" style={{ justifyContent: 'center', gap: 24 }}>
            <button className="icon-btn" aria-label="Back 10 seconds" onClick={() => player.skip(-10)}>
              <RotateCcw size={24} strokeWidth={2} aria-hidden="true" />
            </button>
            <button className="play-btn" aria-label={player.playing ? 'Pause' : 'Play'} onClick={player.toggle}>
              {player.playing ? <Pause size={26} fill="currentColor" aria-hidden="true" /> : <Play size={26} fill="currentColor" aria-hidden="true" style={{ marginLeft: 3 }} />}
            </button>
            <button className="icon-btn" aria-label="Forward 10 seconds" onClick={() => player.skip(10)}>
              <RotateCw size={24} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </section>

        {!p.isWriter && (
          <>
            <form
              aria-label="Your feedback"
              className="feedback-form"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <label htmlFor="fb" className="sr-only">Your feedback</label>
              <textarea
                id="fb"
                rows={3}
                className="textarea textarea-field"
                placeholder="Write your feedback"
                value={body}
                maxLength={4000}
                onChange={(e) => {
                  setBody(e.target.value);
                  if (posted) setPosted(null);
                }}
              />
              <div className="row" style={{ gap: 10 }}>
                <button
                  type="button"
                  className="pin-toggle"
                  aria-pressed={pinOn}
                  aria-label={pinOn ? 'Unpin this feedback' : 'Pin this feedback to a moment'}
                  onClick={() => setPinOn((v) => !v)}
                >
                  <MapPin size={18} strokeWidth={2} aria-hidden="true" />
                </button>
                <div className="min0 stack" style={{ gap: 0 }}>
                  <label htmlFor="pinpos" className="pin-label tabular" data-testid="pin-label">
                    {pinOn ? `Pinned at ${formatTime(pinAt)} · drag to move` : 'Not pinned · tap the pin to add one'}
                  </label>
                  <input
                    id="pinpos"
                    type="range"
                    className="range"
                    min={0}
                    max={D}
                    step={1}
                    value={pinAt}
                    disabled={!pinOn}
                    onChange={(e) => setPinDragged(Number(e.target.value))}
                  />
                </div>
                <button type="submit" className="send-btn" aria-label="Post feedback" disabled={sending}>
                  <Send size={20} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
              {error && <div className="error-box" role="alert">{error}</div>}
              {posted && (
                <div className="ok-box row" role="status" style={{ gap: 8, fontSize: 13, fontWeight: 600 }}>
                  <Check size={16} strokeWidth={2.4} aria-hidden="true" />
                  {posted}
                </div>
              )}
            </form>

            <section aria-labelledby="rate" className="card card-16 pad-14 stack gap-10">
              <div className="row between" style={{ alignItems: 'baseline' }}>
                <h2 id="rate" style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase' }}>Rate {verLabel}</h2>
                <span className="helper">Saves automatically</span>
              </div>
              {CATS.map((c) => (
                <div key={c.key} className="row between" style={{ gap: 8 }}>
                  <span className="rate-name">{c.name}</span>
                  <div role="group" aria-label={`${c.name} rating`} className="row" style={{ gap: 6 }}>
                    {[1, 2, 3, 4, 5].map((k) => (
                      <button
                        key={k}
                        className="rate-dot"
                        aria-label={`${c.name}, ${k} out of 5`}
                        aria-pressed={(ratings[c.key] ?? 0) >= k}
                        onClick={() => rate(c.key, k)}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {rateError && <div className="error-box" role="alert">{rateError}</div>}
            </section>
          </>
        )}

        <section aria-label="Average ratings" className="avg-grid">
          {CATS.map((c) => (
            <div key={c.key} className="avg-tile">
              <b>{p.avgRatings[c.key] !== null ? Number(p.avgRatings[c.key]).toFixed(1) : '–'}</b>
              <span>{c.name} avg</span>
            </div>
          ))}
        </section>

        <div role="tablist" aria-label="Song sections" className="tabs">
          <button role="tab" id="tab-f" aria-controls="panel-f" aria-selected={tab === 'f'} onClick={() => setTab('f')}>
            Feedback on {verLabel} ({p.commentCount})
          </button>
          <button role="tab" id="tab-l" aria-controls="panel-l" aria-selected={tab === 'l'} onClick={() => setTab('l')}>
            Lyrics
          </button>
          <button role="tab" id="tab-c" aria-controls="panel-c" aria-selected={tab === 'c'} onClick={() => setTab('c')}>
            Chord chart
          </button>
        </div>

        {tab === 'f' && (
          <div role="tabpanel" id="panel-f" aria-labelledby="tab-f">
            <CommentList comments={p.comments} onJump={player.seek} writerFirst={p.song.writerFirst} />
          </div>
        )}
        {tab === 'l' && (
          <section role="tabpanel" id="panel-l" aria-labelledby="tab-l" className="card card-16 pad-16 lyrics break">
            {p.song.lyrics || <span className="meta">No lyrics yet.</span>}
          </section>
        )}
        {tab === 'c' && (
          <section role="tabpanel" id="panel-c" aria-labelledby="tab-c" className="card card-16 pad-16 stack gap-12">
            {p.song.chordChartName ? (
              <>
                <div className="row" style={{ gap: 12 }}>
                  <span className="tile tone-b" style={{ width: 48, height: 48 }} aria-hidden="true">
                    <FileText size={22} strokeWidth={2} />
                  </span>
                  <span className="min0 stack">
                    <span className="ellipsis" style={{ fontWeight: 600, fontSize: 14 }}>{p.song.chordChartName}</span>
                    <span className="helper">
                      PDF{p.song.key ? ` · Key of ${p.song.key}` : ''}
                      {p.song.chordChartPages ? ` · ${p.song.chordChartPages} ${p.song.chordChartPages === 1 ? 'page' : 'pages'}` : ''}
                    </span>
                  </span>
                  <button className="btn btn-primary" style={{ padding: '0 16px', fontSize: 13 }} onClick={() => setChartNote(true)}>
                    Open
                  </button>
                </div>
                {chartNote && (
                  <p className="older-note" role="status">
                    Chord chart files open once file storage is switched on (next phase). This is sample data.
                  </p>
                )}
              </>
            ) : (
              <span className="meta">No chord chart attached yet.</span>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
