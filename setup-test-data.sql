-- Setup script for testing the note capture flow
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new)

-- First, make sure the tables exist (from copilot-instructions.md):
-- If you haven't created them yet, uncomment and run the following:

/*
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  created_at timestamp with time zone default now()
);

create table meetings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects not null,
  name text not null,
  recurring boolean default false,
  cadence text,
  attendees text,
  created_at timestamp with time zone default now()
);

create table note_topics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects not null,
  name text not null,
  created_at timestamp with time zone default now()
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  text text not null,
  type text not null check (type in ('meeting', 'general')),
  meeting_id uuid references meetings,
  topic_id uuid references note_topics,
  is_unsorted boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
*/

-- Enable Row Level Security (VERY IMPORTANT!)
alter table projects enable row level security;
alter table meetings enable row level security;
alter table note_topics enable row level security;
alter table notes enable row level security;

-- Create RLS policies so users can only see their own data
-- Projects
create policy "Users can view their own projects"
  on projects for select
  using (auth.uid() = user_id);

create policy "Users can create their own projects"
  on projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own projects"
  on projects for update
  using (auth.uid() = user_id);

create policy "Users can delete their own projects"
  on projects for delete
  using (auth.uid() = user_id);

-- Meetings (users own meetings through the project)
create policy "Users can view meetings in their projects"
  on meetings for select
  using (exists (
    select 1 from projects
    where projects.id = meetings.project_id
    and projects.user_id = auth.uid()
  ));

create policy "Users can create meetings in their projects"
  on meetings for insert
  with check (exists (
    select 1 from projects
    where projects.id = meetings.project_id
    and projects.user_id = auth.uid()
  ));

create policy "Users can update meetings in their projects"
  on meetings for update
  using (exists (
    select 1 from projects
    where projects.id = meetings.project_id
    and projects.user_id = auth.uid()
  ));

create policy "Users can delete meetings in their projects"
  on meetings for delete
  using (exists (
    select 1 from projects
    where projects.id = meetings.project_id
    and projects.user_id = auth.uid()
  ));

-- Note topics (same pattern)
create policy "Users can view topics in their projects"
  on note_topics for select
  using (exists (
    select 1 from projects
    where projects.id = note_topics.project_id
    and projects.user_id = auth.uid()
  ));

create policy "Users can create topics in their projects"
  on note_topics for insert
  with check (exists (
    select 1 from projects
    where projects.id = note_topics.project_id
    and projects.user_id = auth.uid()
  ));

create policy "Users can update topics in their projects"
  on note_topics for update
  using (exists (
    select 1 from projects
    where projects.id = note_topics.project_id
    and projects.user_id = auth.uid()
  ));

create policy "Users can delete topics in their projects"
  on note_topics for delete
  using (exists (
    select 1 from projects
    where projects.id = note_topics.project_id
    and projects.user_id = auth.uid()
  ));

-- Notes
create policy "Users can view their own notes"
  on notes for select
  using (auth.uid() = user_id);

create policy "Users can create their own notes"
  on notes for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own notes"
  on notes for update
  using (auth.uid() = user_id);

create policy "Users can delete their own notes"
  on notes for delete
  using (auth.uid() = user_id);

-- Create some test data (this will be associated with YOUR logged-in user)
-- Create a test project
insert into projects (name) values ('Test Project Client A');

-- Create a topic under that project
insert into note_topics (project_id, name)
select id, 'Research Notes'
from projects
where name = 'Test Project Client A';

-- You can verify the data was created:
select * from projects;
select * from note_topics;
