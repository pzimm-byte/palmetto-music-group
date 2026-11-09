-- PBC Songwriters — Phase 1 schema
create extension if not exists pgcrypto;

create table if not exists members (
  id          uuid primary key default gen_random_uuid(),
  first_name  text not null check (length(first_name) between 1 and 80),
  last_name   text not null check (length(last_name) between 1 and 80),
  email       text not null,
  role        text not null default 'member' check (role in ('admin', 'member')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index if not exists members_email_lower_idx on members (lower(email));

create table if not exists songs (
  id                uuid primary key default gen_random_uuid(),
  writer_id         uuid not null references members(id) on delete restrict,
  title             text not null check (length(title) between 1 and 120),
  key               text,
  tempo             integer check (tempo is null or tempo between 20 and 300),
  lyrics            text not null default '',
  feedback_focus    text not null default '',
  status            text not null default 'in_review'
                    check (status in ('draft', 'in_review', 'review_complete', 'archived')),
  chord_chart_name  text,
  chord_chart_pages integer,
  created_at        timestamptz not null default now()
);
create index if not exists songs_created_idx on songs (created_at desc);

create table if not exists song_versions (
  id               uuid primary key default gen_random_uuid(),
  song_id          uuid not null references songs(id) on delete cascade,
  version_number   integer not null check (version_number >= 1),
  audio_key        text,
  duration_seconds integer not null check (duration_seconds > 0),
  file_size        bigint,
  notes            text not null default '',
  created_at       timestamptz not null default now(),
  unique (song_id, version_number)
);

-- author_id is NULL for anonymous comments. There is deliberately no other
-- column (hash, token, ip, etc.) that could link an anonymous comment back to a member.
create table if not exists comments (
  id                uuid primary key default gen_random_uuid(),
  version_id        uuid not null references song_versions(id) on delete cascade,
  author_id         uuid references members(id) on delete restrict,
  parent_id         uuid references comments(id) on delete cascade,
  timestamp_seconds integer check (timestamp_seconds is null or timestamp_seconds >= 0),
  body              text not null check (length(body) between 1 and 4000),
  created_at        timestamptz not null default now()
);
create index if not exists comments_version_idx on comments (version_id, created_at);
create index if not exists comments_parent_idx on comments (parent_id);

create table if not exists comment_reactions (
  comment_id uuid not null references comments(id) on delete cascade,
  member_id  uuid not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, member_id)
);

create table if not exists ratings (
  version_id  uuid not null references song_versions(id) on delete cascade,
  member_id   uuid not null references members(id) on delete cascade,
  melody      smallint check (melody between 1 and 5),
  lyrics      smallint check (lyrics between 1 and 5),
  singability smallint check (singability between 1 and 5),
  theology    smallint check (theology between 1 and 5),
  updated_at  timestamptz not null default now(),
  primary key (version_id, member_id)
);

create table if not exists announcements (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid references members(id) on delete set null,
  title      text not null,
  details    text not null default '',
  body       text not null default '',
  event_at   timestamptz,
  pinned     boolean not null default false,
  created_at timestamptz not null default now()
);
