-- LOCAL DEVELOPMENT / TEST ONLY.
-- A minimal copy of the two Neon Auth (Managed Better Auth) tables the seed
-- script writes to, so the app can run offline with AUTH_MODE=local.
-- Never applied to Neon: there, Neon Auth owns the real neon_auth schema.
create schema if not exists neon_auth;
create table if not exists neon_auth."user" (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  "emailVerified" boolean not null default false,
  image text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  role text,
  banned boolean,
  "banReason" text,
  "banExpires" timestamptz
);
create table if not exists neon_auth.account (
  id uuid primary key default gen_random_uuid(),
  "accountId" text not null,
  "providerId" text not null,
  "userId" uuid not null references neon_auth."user"(id) on delete cascade,
  password text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create table if not exists neon_auth.verification (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  value text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
