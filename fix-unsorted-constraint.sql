-- Fix the notes_type_matches_id constraint to allow unsorted notes
-- Run this in the Supabase SQL Editor

-- Drop the existing constraint that doesn't allow unsorted notes
ALTER TABLE notes 
  DROP CONSTRAINT IF EXISTS notes_type_matches_id;

-- Re-add it with support for unsorted notes
-- Valid states are:
-- 1. is_unsorted = true (type can be anything, IDs can be null)
-- 2. type = 'meeting' AND meeting_id IS NOT NULL (properly categorized meeting)
-- 3. type = 'general' AND topic_id IS NOT NULL (properly categorized general note)
ALTER TABLE notes 
  ADD CONSTRAINT notes_type_matches_id 
  CHECK (
    is_unsorted = true 
    OR (type = 'meeting' AND meeting_id IS NOT NULL)
    OR (type = 'general' AND topic_id IS NOT NULL)
  );
