-- CivicFix AI — Database Schema
-- Supabase PostgreSQL

-- Enable UUID extension if not already enabled
create extension if not exists "pgcrypto";

-- Drop existing table if needed during fresh install
-- drop table if exists complaints cascade;

create table if not exists complaints (
  id uuid primary key default gen_random_uuid(),
  tracking_code text unique not null,
  description text not null,
  location_area text not null,
  normalized_area text not null,
  landmark text,
  reporter_name text,
  photo_path text,
  latitude double precision,
  longitude double precision,
  category text not null check (category in ('Road Damage', 'Garbage', 'Water Leakage', 'Streetlights', 'Drainage', 'Other', 'Unclassified')),
  priority text not null check (priority in ('Low', 'Medium', 'High', 'Needs review')),
  suggested_department text,
  ai_reason text,
  english_summary text,
  status text not null default 'Pending' check (status in ('Pending', 'In Progress', 'Resolved')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for frequent query patterns
create index if not exists idx_complaints_tracking_code on complaints (tracking_code);
create index if not exists idx_complaints_created_at on complaints (created_at desc);
create index if not exists idx_complaints_normalized_area on complaints (normalized_area);
create index if not exists idx_complaints_status on complaints (status);
create index if not exists idx_complaints_category on complaints (category);

-- Trigger to automatically update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on complaints;
create trigger set_updated_at
before update on complaints
for each row
execute function update_updated_at_column();

-- Row Level Security (RLS)
-- Deny direct anonymous database writes and reads from the browser client;
-- All access is mediated by the Node/Express backend using the Supabase Service Role Key.
alter table complaints enable row level security;

-- Explicit table permissions granted strictly to the backend service_role
-- (Anon and public roles remain blocked by RLS)
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.complaints to service_role;

-- Storage Bucket Setup for Private Complaint Evidence Photos
-- Run in Supabase SQL Editor:
insert into storage.buckets (id, name, public)
values ('complaint-photos', 'complaint-photos', false)
on conflict (id) do update set public = false;
