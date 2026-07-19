create table if not exists public.human_annotation_submissions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique,
  receipt_id text not null unique,
  package_id text not null,
  schema_version text not null,
  consent_version text not null,
  participant_code text not null,
  annotation_type text not null,
  completed_count integer not null check (completed_count = 20),
  total_count integer not null check (total_count = 20),
  annotations jsonb not null check (jsonb_typeof(annotations) = 'array'),
  client_consented_at timestamptz not null,
  client_submitted_at timestamptz not null,
  received_at timestamptz not null default timezone('utc', now()),
  source_version text not null default 'public-pilot-v0.2.0'
);

alter table public.human_annotation_submissions enable row level security;

revoke all on table public.human_annotation_submissions from anon, authenticated;
grant all on table public.human_annotation_submissions to service_role;

comment on table public.human_annotation_submissions is
  'Pseudonymous ALFA public-pilot submissions. No application-level IP or user-agent columns.';
