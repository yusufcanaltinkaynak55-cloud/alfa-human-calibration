alter table public.human_annotation_submissions
  add column if not exists block_id text,
  add column if not exists block_index integer,
  add column if not exists master_bank_size integer;

alter table public.human_annotation_submissions
  drop constraint if exists human_annotation_submissions_completed_count_check,
  drop constraint if exists human_annotation_submissions_total_count_check;

alter table public.human_annotation_submissions
  alter column source_version set default 'public-calibration-v0.3.0';

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
    )
    or
    (
      source_version = 'public-calibration-v0.3.0'
      and completed_count = 50
      and total_count = 50
      and master_bank_size = 150
      and (
        (block_id = 'BLOCK-01' and block_index = 1)
        or (block_id = 'BLOCK-02' and block_index = 2)
        or (block_id = 'BLOCK-03' and block_index = 3)
      )
    )
  ),
  add constraint human_annotation_submissions_annotation_count_check
  check (jsonb_array_length(annotations) = completed_count);

create index if not exists human_annotation_submissions_participant_block_idx
  on public.human_annotation_submissions (participant_code, block_id, received_at);

comment on column public.human_annotation_submissions.block_id is
  'One of the three public 50-item calibration blocks; null only for the legacy 20-item pilot.';

comment on column public.human_annotation_submissions.master_bank_size is
  'Declared size of the public unlabeled master bank. Expected value is 150 for v0.3 submissions.';
