alter table public.human_annotation_submissions
  add column if not exists network_fingerprint text,
  add column if not exists network_slot smallint;

alter table public.human_annotation_submissions
  drop constraint if exists human_annotation_submissions_release_shape_check;

alter table public.human_annotation_submissions
  alter column source_version set default 'public-calibration-v0.4.0';

alter table public.human_annotation_submissions
  add constraint human_annotation_submissions_release_shape_check
  check (
    (
      source_version = 'public-pilot-v0.2.0'
      and completed_count = 20
      and total_count = 20
      and block_id is null
      and block_index is null
      and master_bank_size is null
      and network_fingerprint is null
      and network_slot is null
    )
    or
    (
      source_version = 'public-calibration-v0.3.0'
      and completed_count = 50
      and total_count = 50
      and master_bank_size = 150
      and network_fingerprint is null
      and network_slot is null
      and (
        (block_id = 'BLOCK-01' and block_index = 1)
        or (block_id = 'BLOCK-02' and block_index = 2)
        or (block_id = 'BLOCK-03' and block_index = 3)
      )
    )
    or
    (
      source_version = 'public-calibration-v0.4.0'
      and completed_count = 50
      and total_count = 50
      and master_bank_size = 150
      and network_fingerprint ~ '^[0-9a-f]{64}$'
      and network_slot in (1, 2)
      and (
        (block_id = 'BLOCK-01' and block_index = 1)
        or (block_id = 'BLOCK-02' and block_index = 2)
        or (block_id = 'BLOCK-03' and block_index = 3)
      )
    )
  );

create unique index if not exists human_annotation_submissions_network_slot_uidx
  on public.human_annotation_submissions (
    package_id,
    block_id,
    network_fingerprint,
    network_slot
  )
  where network_fingerprint is not null;

comment on column public.human_annotation_submissions.network_fingerprint is
  'HMAC-SHA256 network fingerprint used only to enforce a two-submission limit per public block. Raw IP is not stored.';

comment on column public.human_annotation_submissions.network_slot is
  'Atomic per-block network quota slot. Only values 1 and 2 are accepted for v0.4 submissions.';
