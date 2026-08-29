-- Viralia Radar: cortes de declaraciones encontrados para revisión editorial.
-- Los archivos viven en un bucket privado; solo el panel autenticado los firma.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('viralia-radar', 'viralia-radar', false, 20971520, array['audio/mpeg', 'audio/wav', 'audio/mp4'])
on conflict (id) do nothing;

create table if not exists public.viralia_radar_clips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  speaker text,
  topic text not null,
  source_url text not null,
  source_channel text,
  source_video_id text,
  source_media_url text,
  published_at timestamptz,
  start_time numeric(10,3) not null default 0 check (start_time >= 0),
  end_time numeric(10,3) not null check (end_time > start_time),
  duration numeric(10,3) generated always as (end_time - start_time) stored,
  transcript text not null default '',
  context text not null default '',
  audio_url text,
  storage_path text unique,
  status text not null default 'detected'
    check (status in ('detected', 'ready', 'approved', 'rejected', 'used')),
  relevance_score integer not null default 0 check (relevance_score between 0 and 100),
  clip_fingerprint text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists viralia_radar_clips_status_created_idx
  on public.viralia_radar_clips (status, created_at desc);

create index if not exists viralia_radar_clips_topic_idx
  on public.viralia_radar_clips (topic);

alter table public.viralia_radar_clips enable row level security;

-- Sin políticas públicas: la app usa exclusivamente la service role desde rutas
-- protegidas por la sesión de administración de Viralia.
