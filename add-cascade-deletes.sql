-- Add CASCADE to foreign key constraints
-- This allows deleting a project to automatically delete all related data

-- First, drop the existing foreign key constraints
ALTER TABLE meetings 
  DROP CONSTRAINT IF EXISTS meetings_project_id_fkey;

ALTER TABLE note_topics 
  DROP CONSTRAINT IF EXISTS note_topics_project_id_fkey;

ALTER TABLE notes 
  DROP CONSTRAINT IF EXISTS notes_meeting_id_fkey;

ALTER TABLE notes 
  DROP CONSTRAINT IF EXISTS notes_topic_id_fkey;

-- Re-add them with ON DELETE CASCADE
ALTER TABLE meetings 
  ADD CONSTRAINT meetings_project_id_fkey 
  FOREIGN KEY (project_id) 
  REFERENCES projects(id) 
  ON DELETE CASCADE;

ALTER TABLE note_topics 
  ADD CONSTRAINT note_topics_project_id_fkey 
  FOREIGN KEY (project_id) 
  REFERENCES projects(id) 
  ON DELETE CASCADE;

ALTER TABLE notes 
  ADD CONSTRAINT notes_meeting_id_fkey 
  FOREIGN KEY (meeting_id) 
  REFERENCES meetings(id) 
  ON DELETE CASCADE;

ALTER TABLE notes 
  ADD CONSTRAINT notes_topic_id_fkey 
  FOREIGN KEY (topic_id) 
  REFERENCES note_topics(id) 
  ON DELETE CASCADE;
