/**
 * TypeScript types matching the Supabase database schema.
 *
 * These types help catch bugs at development time by making sure we're using
 * the right fields with the right data types everywhere.
 */

export type Project = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type Meeting = {
  id: string;
  project_id: string;
  name: string;
  recurring: boolean;
  cadence: string | null; // Optional free text
  attendees: string | null; // Optional free text
  created_at: string;
};

export type NoteTopic = {
  id: string;
  project_id: string;
  name: string;
  created_at: string;
};

/**
 * A single note. Can be a meeting note or a general note.
 * - meeting note: type='meeting', meeting_id is set
 * - general note: type='general', topic_id may be set
 * - unsorted: is_unsorted=true, type is still set but IDs are null
 */
export type Note = {
  id: string;
  user_id: string;
  text: string;
  type: "meeting" | "general";
  meeting_id: string | null;
  topic_id: string | null;
  is_unsorted: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Data needed to create a new note.
 */
export type CreateNoteInput = {
  text: string;
  type: "meeting" | "general";
  meeting_id?: string | null;
  topic_id?: string | null;
  is_unsorted?: boolean;
};
