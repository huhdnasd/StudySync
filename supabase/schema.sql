create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  subject text not null default 'General',
  grade numeric(5,2) not null default 0 check (grade >= 0 and grade <= 100),
  credits numeric(4,1) not null default 1 check (credits > 0 and credits <= 10),
  created_at timestamptz not null default now()
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  title text not null,
  due_date date not null,
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  completed boolean not null default false,
  score numeric(6,2) check (score is null or score >= 0),
  max_score numeric(6,2) check (max_score is null or max_score > 0),
  created_at timestamptz not null default now()
);

create index if not exists courses_user_id_idx on public.courses(user_id);
create index if not exists assignments_user_due_idx on public.assignments(user_id, due_date);

alter table public.courses enable row level security;
alter table public.assignments enable row level security;

drop policy if exists "Users manage their own courses" on public.courses;
create policy "Users manage their own courses" on public.courses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their own assignments" on public.assignments;
create policy "Users manage their own assignments" on public.assignments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);