'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Send, ThumbsUp } from 'lucide-react';
import { formatTime, timeAgo } from '@/lib/format';
import type { CommentNode } from '@/lib/data/queries';
import { postReply, toggleReaction } from '@/lib/data/actions';
import { Avatar } from '@/components/bits';

const PAGE = 20;

export function CommentList({ comments, onJump, writerFirst }: { comments: CommentNode[]; onJump: (t: number) => void; writerFirst: string }) {
  const [shown, setShown] = useState(PAGE);
  if (comments.length === 0) {
    return (
      <p className="card card-16 pad-16 meta" data-testid="no-comments">
        No feedback on this version yet. Be the first to tell {writerFirst} what you hear.
      </p>
    );
  }
  return (
    <section className="stack gap-12" aria-label="Feedback">
      {comments.slice(0, shown).map((c) => (
        <Comment key={c.id} c={c} onJump={onJump} />
      ))}
      {comments.length > shown && (
        <button className="btn btn-outline" style={{ alignSelf: 'center' }} onClick={() => setShown((n) => n + PAGE)}>
          Show more feedback ({comments.length - shown} more)
        </button>
      )}
    </section>
  );
}

function Name({ c }: { c: CommentNode }) {
  return c.author_first ? (
    <>
      {c.author_first} {c.author_last}
    </>
  ) : (
    <>Anonymous</>
  );
}

function Comment({ c, onJump }: { c: CommentNode; onJump: (t: number) => void }) {
  const router = useRouter();
  const [liked, setLiked] = useState(c.liked);
  const [likes, setLikes] = useState(c.likes);
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const name = c.author_first ? `${c.author_first}` : 'this comment';

  const like = () => {
    setLiked(!liked);
    setLikes((n) => n + (liked ? -1 : 1));
    toggleReaction(c.id).then((r) => {
      if (r.ok && typeof r.likes === 'number') {
        setLikes(r.likes);
        setLiked(!!r.liked);
      }
    });
  };

  const sendReply = () => {
    setError(null);
    if (!reply.trim()) {
      setError('Write a reply first.');
      return;
    }
    start(async () => {
      const r = await postReply({ parentId: c.id, body: reply });
      if (!r.ok) setError(r.error);
      else {
        setReply('');
        setReplyOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <article className="comment" data-testid="comment">
      <div className="row" style={{ gap: 10 }}>
        <Avatar id={c.author_id} first={c.author_first} last={c.author_last} />
        <div className="min0">
          <div className="break" style={{ fontWeight: 600, fontSize: 14 }}>
            <Name c={c} />
            {c.is_writer && <span className="meta" style={{ fontWeight: 400, fontSize: 12 }}> · writer</span>}
          </div>
          <div className="helper">{timeAgo(new Date(c.created_at))}</div>
        </div>
        {c.timestamp_seconds !== null && (
          <button className="time-chip" aria-label={`Jump to ${formatTime(c.timestamp_seconds)}`} onClick={() => onJump(c.timestamp_seconds as number)}>
            <span>{formatTime(c.timestamp_seconds)}</span>
          </button>
        )}
      </div>
      <p className="break" style={{ fontSize: 14, whiteSpace: 'pre-line' }}>{c.body}</p>
      <div className="comment-actions">
        <button className="ghost-btn" aria-expanded={replyOpen} onClick={() => setReplyOpen((o) => !o)}>
          Reply
        </button>
        <button className="ghost-btn" aria-pressed={liked} aria-label={`Thumbs up, ${likes}`} onClick={like}>
          <ThumbsUp size={16} strokeWidth={2} aria-hidden="true" />
          {likes}
        </button>
      </div>

      {c.replies.map((r) => (
        <div key={r.id} className="reply" data-testid="reply">
          <div className="row" style={{ gap: 8 }}>
            <Avatar id={r.author_id} first={r.author_first} last={r.author_last} size={28} writer={r.is_writer} />
            <span className="break" style={{ fontWeight: 600, fontSize: 13 }}>
              <Name c={r} />
            </span>
            {r.is_writer && <span className="helper">· writer</span>}
            <span className="helper">· {timeAgo(new Date(r.created_at))}</span>
          </div>
          <p className="break" style={{ fontSize: 14, whiteSpace: 'pre-line' }}>{r.body}</p>
        </div>
      ))}

      {replyOpen && (
        <form
          className="reply-form"
          onSubmit={(e) => {
            e.preventDefault();
            sendReply();
          }}
        >
          <label htmlFor={`reply-${c.id}`} className="sr-only">
            Reply to {name}
          </label>
          <input
            id={`reply-${c.id}`}
            className="reply-input"
            placeholder={`Reply to ${c.author_first ?? 'Anonymous'}`}
            value={reply}
            maxLength={4000}
            onChange={(e) => setReply(e.target.value)}
            autoFocus
          />
          <button type="submit" className="send-btn" style={{ width: 44, height: 44 }} aria-label="Send reply" disabled={pending}>
            <Send size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </form>
      )}
      {error && <div className="error-box" role="alert">{error}</div>}
    </article>
  );
}
