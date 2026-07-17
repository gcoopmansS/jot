# Automatic Cleanup of Empty Meetings and Topics

## Implementation Summary

When a user deletes the last remaining note in a Meeting or Notes topic, the empty container is automatically cleaned up according to these rules:

### Cleanup Rules

1. **Notes Topics (General notes)** → Always deleted automatically when empty
   - Topics have no recurring concept
   - They're just organizational labels
   - No extra setup or metadata to preserve

2. **Non-recurring Meetings** → Deleted automatically when empty
   - These are one-off meetings with no special setup
   - No reason to keep them once empty

3. **Recurring Meetings** → KEPT even when empty
   - Recurring meetings represent deliberate setup
   - May have cadence and attendees filled in
   - User invested intent in creating the series
   - May have future sessions planned

### Technical Implementation

#### Backend (`/app/api/notes/[id]/route.ts`)

The DELETE endpoint now:

1. Fetches the note before deletion to capture `meeting_id` and `topic_id`
2. Deletes the note
3. Checks if the meeting/topic is now empty
4. For meetings: checks the `recurring` flag
5. Deletes empty non-recurring meetings and empty topics
6. Returns cleanup information in the response:
   ```json
   {
     "success": true,
     "cleanup": {
       "deletedMeetingId": "uuid-or-null",
       "deletedTopicId": "uuid-or-null"
     }
   }
   ```

#### Frontend (`/components/note-card/note-card.tsx`)

The delete mutation now:

1. Receives the cleanup response from the API
2. Parses the current pathname to detect if we're on a meeting/topic page
3. Compares the deleted container ID with the current page
4. Redirects to the parent project if the current view was deleted
5. Invalidates all relevant queries to update the sidebar

### Sidebar Updates

The sidebar automatically reflects cleanup because:

- All query invalidations in the delete mutation cover sidebar data
- Queries for meetings, topics, and note counts are invalidated
- TanStack Query refetches and removes deleted items

### User Experience

1. User deletes a note from a meeting/topic view
2. Delete confirmation dialog appears (existing behavior)
3. Note is deleted
4. If it was the last note:
   - Empty non-recurring meetings → deleted silently
   - Empty topics → deleted silently
   - Empty recurring meetings → kept (no cleanup)
5. Sidebar updates immediately to remove deleted containers
6. If viewing the deleted container, user is redirected to parent project

### Existing Empty Containers

Two SQL scripts are provided for checking and cleaning up existing data:

1. **check-empty-containers.sql** - Query to find all empty containers
2. **cleanup-empty-containers.sql** - Safe cleanup script with preview

To use:

1. Run `check-empty-containers.sql` in Supabase SQL Editor
2. Review the results to see what exists
3. Run `cleanup-empty-containers.sql` SELECT queries to preview
4. Uncomment DELETE statements if you want to clean them up

### Edge Cases Handled

- User viewing a meeting page when its last note is deleted → redirects to project
- User viewing a topic page when its last note is deleted → redirects to project
- User viewing Everything/Unsorted when last note is deleted → no redirect needed
- Recurring meeting with zero notes → kept as intended
- Multiple users/sessions → each handles its own cleanup independently
- Network failures → cleanup happens atomically with note deletion

### Testing Checklist

- [ ] Delete last note from non-recurring meeting → meeting disappears from sidebar
- [ ] Delete last note from topic → topic disappears from sidebar
- [ ] Delete last note from recurring meeting → meeting stays in sidebar
- [ ] Delete last note while viewing that meeting → redirects to project
- [ ] Delete last note while viewing that topic → redirects to project
- [ ] Delete note from mixed view (Everything) → no redirect, container removed
- [ ] Sidebar updates without page refresh after cleanup
- [ ] Note counts update correctly after cleanup
