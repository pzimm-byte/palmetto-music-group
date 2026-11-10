'use client';

import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Music, Upload } from 'lucide-react';
import { MAX_AUDIO_BYTES, formatMB } from '@/lib/format';
import { shareSong } from '@/lib/data/actions';

const KEYS = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B', 'Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm'];

type AudioInfo = { name: string; size: number; duration: number | null; loaded: number; isWav: boolean };

function audioKind(file: File): 'ok' | 'wav' | 'bad' {
  const n = file.name.toLowerCase();
  if (/\.(mp3|m4a|aac|mp4)$/.test(n) || /audio\/(mpeg|mp3|mp4|x-m4a|m4a|aac)/.test(file.type)) return 'ok';
  if (/\.wav$/.test(n) || /audio\/(wav|x-wav|wave)/.test(file.type)) return 'wav';
  return 'bad';
}

/** Reads the duration from the file's metadata in the browser. */
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    const done = (v: number | null) => {
      URL.revokeObjectURL(url);
      resolve(v);
    };
    a.preload = 'metadata';
    a.onloadedmetadata = () => done(Number.isFinite(a.duration) && a.duration > 0 ? Math.round(a.duration) : null);
    a.onerror = () => done(null);
    a.src = url;
    setTimeout(() => done(null), 8000);
  });
}

export function UploadForm({ songs, initialMode, initialSong }: { songs: { id: string; title: string; latest: number }[]; initialMode: 'song' | 'version'; initialSong: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'song' | 'version'>(initialMode);
  const [songId, setSongId] = useState(initialSong);
  const [audio, setAudio] = useState<AudioInfo | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [chart, setChart] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const chartRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const pick = async (file: File | undefined) => {
    setFileError(null);
    setError(null);
    if (!file) return;
    const kind = audioKind(file);
    if (kind === 'bad') {
      setFileError('Choose an MP3, M4A or WAV audio file.');
      return;
    }
    if (file.size > MAX_AUDIO_BYTES) {
      setFileError(`That file is ${formatMB(file.size)} MB. The limit is 100 MB. Try exporting an MP3 instead.`);
      return;
    }
    const info: AudioInfo = { name: file.name, size: file.size, duration: null, loaded: 0, isWav: kind === 'wav' };
    setAudio(info);
    // Read the file in chunks so the bar shows real progress. Phase 2 sends these bytes to R2 instead.
    const reader = file.stream().getReader();
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      loaded += value.byteLength;
      setAudio((a) => (a && a.name === file.name ? { ...a, loaded } : a));
    }
    const duration = await readDuration(file);
    setAudio((a) => (a && a.name === file.name ? { ...a, loaded: file.size, duration } : a));
    if (!duration) setFileError("We couldn't read the length of that file. Try a different export.");
  };

  const pct = audio ? Math.round((audio.loaded / audio.size) * 100) : 0;
  const selected = songs.find((s) => s.id === songId);

  const submit = () => {
    setError(null);
    const fd = new FormData(formRef.current!);
    if (mode === 'version' && !songId) return setError('Choose which song this is a new version of.');
    if (!audio || !audio.duration || pct < 100) return setError('Choose an audio file and wait for it to finish.');
    const title = String(fd.get('title') ?? '').trim();
    if (mode === 'song' && !title) return setError('Give the song a title.');
    const tempoRaw = String(fd.get('tempo') ?? '').trim();
    start(async () => {
      const r = await shareSong({
        mode,
        songId: mode === 'version' ? songId : undefined,
        title,
        key: String(fd.get('key') ?? ''),
        tempo: tempoRaw ? Number(tempoRaw) : null,
        lyrics: String(fd.get('lyrics') ?? ''),
        feedbackFocus: String(fd.get('focus') ?? ''),
        status: fd.get('status') === 'draft' ? 'draft' : 'in_review',
        durationSeconds: audio.duration!,
        fileSize: audio.size,
        fileName: audio.name,
        chordChartName: chart,
      });
      if (!r.ok) setError(r.error);
      else router.push(`/songs/${r.id}`);
    });
  };

  return (
    <div className="screen" style={{ paddingBottom: 140 }}>
      <header className="row between" style={{ padding: '12px 0' }}>
        <Link href="/songs" className="text-link" style={{ color: 'var(--text)', fontWeight: 400, fontSize: 15, marginLeft: -4 }}>
          Cancel
        </Link>
        <h1 style={{ fontWeight: 600, fontSize: 16 }}>{mode === 'song' ? 'New song' : 'New version'}</h1>
        <span style={{ width: 56 }} aria-hidden="true" />
      </header>

      <form
        ref={formRef}
        aria-label="Upload a song"
        className="stack gap-18"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div role="group" aria-label="Upload type" className="segmented">
          <button type="button" aria-pressed={mode === 'song'} onClick={() => setMode('song')}>New song</button>
          <button type="button" aria-pressed={mode === 'version'} onClick={() => setMode('version')}>New version</button>
        </div>

        {mode === 'version' && (
          <div className="stack" style={{ gap: 6 }}>
            <label htmlFor="song" className="field-label">Which song?</label>
            {songs.length === 0 ? (
              <p className="warn-box">You haven&apos;t shared any songs yet. Start with “New song”.</p>
            ) : (
              <select id="song" className="select" value={songId} onChange={(e) => setSongId(e.target.value)} required>
                <option value="">Choose one of your songs</option>
                {songs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} (now v{s.latest})
                  </option>
                ))}
              </select>
            )}
            {selected && <span className="helper">This will be v{selected.latest + 1}.</span>}
          </div>
        )}

        <section aria-label="Audio file" className="stack gap-10">
          <div
            className={`dropzone${drag ? ' drag' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              pick(e.dataTransfer.files?.[0]);
            }}
          >
            <span className="round-tint" aria-hidden="true">
              <Upload size={22} strokeWidth={2} />
            </span>
            <input ref={fileRef} id="audio" type="file" aria-label="Audio file" accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} data-testid="audio-input" />
            <button type="button" className="btn btn-primary" onClick={() => fileRef.current?.click()}>
              Choose audio file
            </button>
            <p className="meta">MP3 or M4A recommended, up to 100 MB. WAV works but is about 7× larger.</p>
          </div>
          {fileError && <div className="error-box" role="alert">{fileError}</div>}
          {audio && (
            <div className="card card-14 stack" style={{ padding: '12px 14px', gap: 8 }} data-testid="upload-progress">
              <div className="row" style={{ gap: 10 }}>
                <Music size={20} strokeWidth={2} aria-hidden="true" style={{ color: 'var(--accent)' }} />
                <span className="min0 ellipsis" style={{ fontSize: 14, fontWeight: 500 }}>{audio.name}</span>
                <span className="meta tabular">
                  {formatMB(audio.loaded)} of {formatMB(audio.size)} MB
                </span>
              </div>
              <div className="progress" role="progressbar" aria-label="Upload progress" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div style={{ width: `${pct}%` }} />
              </div>
              <div className="helper">
                {pct < 100 ? `Uploading… ${pct}%. You can keep filling in details.` : audio.duration ? 'Ready to share.' : 'Checking the file…'}
              </div>
              {audio.isWav && <div className="warn-box">WAV files are large. An MP3 export uploads about 7× faster.</div>}
            </div>
          )}
        </section>

        {mode === 'song' && (
          <div className="stack" style={{ gap: 6 }}>
            <label htmlFor="title" className="field-label">Song title</label>
            <input id="title" name="title" className="input" maxLength={120} required autoComplete="off" />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <div className="stack" style={{ gap: 6 }}>
            <label htmlFor="key" className="field-label">Key</label>
            <select id="key" name="key" className="select" defaultValue="">
              <option value="">{mode === 'version' ? 'Keep current' : 'Choose'}</option>
              {KEYS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            <label htmlFor="tempo" className="field-label">Tempo (BPM)</label>
            <input id="tempo" name="tempo" type="number" inputMode="numeric" min={20} max={300} className="input" />
          </div>
        </div>

        <div className="stack" style={{ gap: 6 }}>
          <label htmlFor="lyrics" className="field-label">Lyrics</label>
          <textarea id="lyrics" name="lyrics" rows={6} className="textarea" placeholder="Paste lyrics with verse and chorus labels" />
        </div>

        <div className="stack" style={{ gap: 6 }}>
          <label htmlFor="focus" className="field-label">Feedback focus</label>
          <textarea id="focus" name="focus" rows={3} className="textarea" placeholder="What feedback are you looking for?" aria-describedby="focus-help" maxLength={1000} />
          <span id="focus-help" className="helper">Shown above the player so listeners know what to listen for.</span>
        </div>

        <div className="stack" style={{ gap: 6 }}>
          <span className="field-label" id="chart-label">Chord chart (optional)</span>
          <input ref={chartRef} type="file" accept="application/pdf,.pdf" className="sr-only" aria-labelledby="chart-label" onChange={(e) => setChart(e.target.files?.[0]?.name ?? null)} />
          <button type="button" className="input row" style={{ justifyContent: 'center', gap: 8, fontWeight: 500, fontSize: 14 }} onClick={() => chartRef.current?.click()}>
            <FileText size={18} strokeWidth={2} aria-hidden="true" />
            <span className="ellipsis">{chart ?? 'Attach PDF'}</span>
          </button>
        </div>

        <fieldset className="stack" style={{ border: 0, margin: 0, padding: 0, gap: 8 }}>
          <legend className="field-label" style={{ marginBottom: 8 }}>Status</legend>
          <label className="radio-card">
            <input type="radio" name="status" value="in_review" defaultChecked />
            <span>
              <span style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>In review</span>
              <span className="meta">Everyone is asked for feedback</span>
            </span>
          </label>
          <label className="radio-card">
            <input type="radio" name="status" value="draft" />
            <span>
              <span style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>Draft</span>
              <span className="meta">Visible in the library, no feedback request</span>
            </span>
          </label>
        </fieldset>

        {error && <div className="error-box" role="alert">{error}</div>}
        <button type="submit" className="btn btn-primary btn-lg" style={{ alignSelf: 'center' }} disabled={pending}>
          {pending ? 'Sharing…' : 'Share song'}
        </button>
      </form>
    </div>
  );
}
