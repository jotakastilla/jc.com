create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public)
values ('trendcast-audio', 'trendcast-audio', true)
on conflict (id) do nothing;

create table if not exists public.trendcast_episodes (
  id text primary key,
  title text not null,
  slug text not null unique,
  description text not null,
  audio_url text not null,
  cover_url text not null,
  duration integer not null default 0,
  published_at timestamptz not null default now(),
  trend_keyword text not null,
  transcript text not null,
  article_body jsonb,
  article_images jsonb not null default '[]'::jsonb
);

create index if not exists trendcast_episodes_published_at_idx
  on public.trendcast_episodes (published_at desc);

alter table public.trendcast_episodes enable row level security;

create policy "public read trendcast episodes"
on public.trendcast_episodes
for select
using (true);
