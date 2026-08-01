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
  title: string | null; // Optional title for the note
  type: "meeting" | "general";
  meeting_id: string | null;
  topic_id: string | null;
  is_unsorted: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Enriched note with location information for display in mixed views.
 */
export type NoteWithLocation = Note & {
  project_name?: string;
  location_name?: string; // Meeting name or Topic name
};

/**
 * Data needed to create a new note.
 */
export type CreateNoteInput = {
  text: string;
  title?: string | null;
  type: "meeting" | "general";
  meeting_id?: string | null;
  topic_id?: string | null;
  is_unsorted?: boolean;
};

/**
 * A user's membership in a shared Project. No role column - the project's
 * owner is tracked separately via projects.user_id, this is a pure
 * membership set (composite primary key: project_id + user_id).
 */
export type ProjectMember = {
  project_id: string;
  user_id: string;
  joined_at: string;
};

/**
 * Public mirror of auth.users.email, kept in sync by a DB trigger - needed
 * because the RLS-constrained client can't query auth.users directly.
 */
export type Profile = {
  id: string;
  email: string;
  created_at: string;
};

/**
 * A pending or accepted invitation to join a shared Project.
 */
export type ProjectInvite = {
  id: string;
  project_id: string;
  invited_email: string;
  token: string;
  status: "pending" | "accepted";
  created_by: string | null;
  created_at: string;
};

/**
 * Returned by GET /api/projects/[id]/members - a join of project_members
 * and profiles, not a raw table row.
 */
export type ProjectMemberWithEmail = {
  user_id: string;
  joined_at: string;
  email: string;
};
