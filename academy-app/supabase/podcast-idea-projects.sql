create table if not exists public.podcast_idea_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Nueva idea de podcast',
  answers jsonb not null default '{}'::jsonb,
  competitors jsonb not null default '[]'::jsonb,
  analysis jsonb,
  edits jsonb not null default '{}'::jsonb,
  status text not null default 'Idea iniciada',
  step integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.podcast_idea_projects enable row level security;
create policy "Users manage their podcast projects" on public.podcast_idea_projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists podcast_idea_projects_user_updated_idx on public.podcast_idea_projects(user_id, updated_at desc);
