-- EduNexus — Lecture Videos (Home page section)
-- ============================================================
-- RUN FIRST, BEFORE DEPLOYING THE CODE.
-- Where: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Project: cprpndovdfnkvekewstv (EduNexus).
--
-- Why first: the site's tutorials adapter does NOT fall back to Firebase
-- on 4xx errors, so saving a lecture video WITHOUT these columns fails
-- instead of saving. The adapter (src/db/tutorials.js) writes kind,
-- subject_code, sort_order, is_featured and is_active on every save.
--
-- Safe to re-run: every statement is IF NOT EXISTS / DROP IF EXISTS.
-- ============================================================

alter table public.tutorials
  add column if not exists kind text not null default 'tutorial';
alter table public.tutorials
  add column if not exists subject_code text;
alter table public.tutorials
  add column if not exists sort_order integer;
alter table public.tutorials
  add column if not exists is_featured boolean not null default false;
alter table public.tutorials
  add column if not exists is_active boolean not null default true;

create index if not exists tutorials_lecture_order_idx
  on public.tutorials (kind, sort_order, created_at desc);

-- RLS: same anon-friendly pattern as the site's other content tables
-- (admin gating lives in the admin panel UI; the site is sign-in-free,
-- so students read anonymously and only the admin panel writes).
alter table public.tutorials enable row level security;
drop policy if exists "tutorials_read" on public.tutorials;
drop policy if exists "tutorials_write" on public.tutorials;
create policy "tutorials_read" on public.tutorials
  for select to anon, authenticated using (true);
create policy "tutorials_write" on public.tutorials
  for all to anon, authenticated using (true) with check (true);

-- PROPOSED SEED — run only if Boss confirms this first list.
-- The first (featured) video is the autoplay one. The admin can also add
-- these from the admin panel (Tutorials tab → New tutorial → Kind:
-- "Lecture video") instead of running this block.
--
-- insert into public.tutorials
--   (id, title, category, description, type, url, video_id, kind, subject_code, sort_order, is_featured, is_active, created_by, created_at, updated_at)
-- values
--   (gen_random_uuid(), 'MGT101 Midterm MCQs — 60 Most Important Questions | VU', 'Lecture Videos', 'MGT101 Midterm — 60 most important and repeated MCQs.', 'youtube', 'https://www.youtube.com/watch?v=k_B9k1-1LJ0', 'k_B9k1-1LJ0', 'lecture', 'MGT101', 0, true, true, 'admin', now(), now()),
--   (gen_random_uuid(), 'MGT503 Midterm MCQs — 60 Most Important Questions | VU', 'Lecture Videos', 'MGT503 Midterm — 60 most important and repeated MCQs.', 'youtube', 'https://www.youtube.com/watch?v=4hRY7i3_0J4', '4hRY7i3_0J4', 'lecture', 'MGT503', 1, false, true, 'admin', now(), now()),
--   (gen_random_uuid(), 'MGT501 Midterm MCQs — 60 Most Important Questions | VU', 'Lecture Videos', 'MGT501 Midterm — 60 most important and repeated MCQs.', 'youtube', 'https://www.youtube.com/watch?v=pd-OgvSxTaQ', 'pd-OgvSxTaQ', 'lecture', 'MGT501', 2, false, true, 'admin', now(), now()),
--   (gen_random_uuid(), 'MGT301 Midterm MCQs — 60 Most Important Questions | VU', 'Lecture Videos', 'MGT301 Midterm — 60 most important and repeated MCQs.', 'youtube', 'https://www.youtube.com/watch?v=S5667ubnLIQ', 'S5667ubnLIQ', 'lecture', 'MGT301', 3, false, true, 'admin', now(), now()),
--   (gen_random_uuid(), 'MGT522 Midterm Subjective Solved | VU', 'Lecture Videos', 'MGT522 Midterm subjective questions, fully solved.', 'youtube', 'https://www.youtube.com/watch?v=HKGxuXq5WTM', 'HKGxuXq5WTM', 'lecture', 'MGT522', 4, false, true, 'admin', now(), now()),
--   (gen_random_uuid(), 'MTH202 Midterm MCQs — 60 Most Important Questions | VU', 'Lecture Videos', 'MTH202 Midterm — 60 most important and repeated MCQs.', 'youtube', 'https://www.youtube.com/watch?v=NmX5QsZCrak', 'NmX5QsZCrak', 'lecture', 'MTH202', 5, false, true, 'admin', now(), now());
