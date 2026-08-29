create table if not exists public.viralia_radar_signals (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('x')),
  topic text not null,
  title text not null,
  source_url text not null,
  source_author text,
  posted_at timestamptz,
  metrics jsonb not null default '{}'::jsonb,
  context text not null default '',
  signal_fingerprint text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists viralia_radar_signals_topic_created_idx
  on public.viralia_radar_signals (topic, created_at desc);

alter table public.viralia_radar_signals enable row level security;

-- Sin políticas públicas: Radar se consulta únicamente desde el panel de administración.
