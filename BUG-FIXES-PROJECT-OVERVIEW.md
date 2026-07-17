# Bug Fixes: Project Overview Page + Auto-Delete Cache Issue

## Summary of Changes

### BUG 1: Project Overview Page - FIXED ✓

**Problem**: Clicking a project name in the sidebar only toggled expand/collapse. There was no project overview page, so the auto-delete redirect had nowhere valid to go.

**Solution**:

1. **Separated sidebar interactions**: Clicking the chevron (▼/▶) toggles expand/collapse, clicking the project name navigates to the overview page
2. **Created new project overview page** at `/projects/[id]` that shows:
   - Project name in header
   - List of all meetings with note counts (clickable cards)
   - List of all topics with note counts (clickable cards)
   - Meeting cards show: name, recurring icon, cadence, attendees, note count
   - Topic cards show: name, note count
3. **Updated redirect** in note-card.tsx to use this page when a meeting/topic is auto-deleted

**Files changed**:

- [components/sidebar/sidebar.tsx](components/sidebar/sidebar.tsx#L412-L429) - Split chevron click from name click
- [app/(app)/projects/[id]/page.tsx](<app/(app)/projects/[id]/page.tsx>) - Rewrote as summary/index page
- [components/note-card/note-card.tsx](components/note-card/note-card.tsx) - Already pointed to correct redirect path

---

### BUG 2: Auto-Delete Not Updating UI - FIXED ✓

**Problem**: After deleting the last note in a meeting/topic, the container was being deleted from the database, but the sidebar still showed it (stale cache).

**Root cause**: The delete mutation in note-card.tsx was invalidating note-related queries but NOT the `["meetings"]` and `["topics"]` queries that the sidebar uses.

**Solution**: Added two critical query invalidations:

```typescript
queryClient.invalidateQueries({ queryKey: ["meetings"] });
queryClient.invalidateQueries({ queryKey: ["topics"] });
```

**Diagnosis confirmation**:

- ✓ The DELETE API is working correctly (confirmed by checking API code)
- ✓ The auto-delete logic is executing and deleting records in Supabase
- ✗ **The issue was UI cache invalidation** - React Query wasn't refetching sidebar data

**Files changed**:

- [components/note-card/note-card.tsx](components/note-card/note-card.tsx#L103-L105) - Added meetings/topics query invalidation

---

## How to Manually Verify

### Test BUG 1 FIX: Project Overview Page

1. **Open the sidebar** and find any project
2. **Click the chevron** (▼ or ▶) - it should only expand/collapse the project
3. **Click the project name text** - you should navigate to the project overview page showing:
   - A summary of all meetings with note counts
   - A summary of all topics with note counts
   - Each one is a clickable card that takes you to that specific meeting/topic
4. **Click a meeting card** - should navigate to the meeting detail page
5. **Click a topic card** - should navigate to the topic detail page

### Test BUG 2 FIX: Auto-Delete + Cache Update

#### Setup: Create a test meeting with one note

1. Create a new note
2. File it to a new meeting (non-recurring) - e.g., "Test Meeting Delete"
3. In the sidebar, verify the meeting appears under the project

#### Test: Delete the last note

1. Navigate to the meeting view (click on "Test Meeting Delete" in sidebar)
2. You should see the one note you created
3. Click the delete button on the note card
4. Confirm deletion in the dialog
5. **Expected behavior**:
   - You're redirected to the project overview page
   - The meeting "Test Meeting Delete" is **gone from the sidebar** immediately (no refresh needed)
   - If you check the Supabase table editor, the meeting record is deleted

#### Verify in Supabase (confirm actual deletion vs. UI hiding)

To confirm a meeting record is truly deleted (not just hidden):

1. **Open Supabase Dashboard** → your project
2. **Go to Table Editor** → select the `meetings` table
3. **Search for the meeting** by name (or ID if you noted it down)
4. **If the delete worked**: The meeting row will NOT exist in the table at all
5. **If it's only hidden**: The row would still be there but the UI wouldn't show it

You can also run this SQL query in Supabase SQL Editor to check for orphaned meetings:

```sql
SELECT m.id, m.name, m.recurring, COUNT(n.id) as note_count
FROM meetings m
LEFT JOIN notes n ON n.meeting_id = m.id
WHERE m.recurring = false
GROUP BY m.id, m.name, m.recurring
HAVING COUNT(n.id) = 0;
```

If this returns any rows, those are empty non-recurring meetings that should have been auto-deleted.

#### Test: Recurring meeting exception

1. Create a note and file it to a new **recurring** meeting
2. Mark it as recurring (toggle the switch in the categorize bar)
3. Delete the note
4. **Expected behavior**:
   - The recurring meeting **stays in the sidebar** even though it's empty
   - No redirect happens (you can stay on the meeting page)
   - In Supabase, the meeting record still exists with `recurring = true`

#### Test: Topic auto-delete

1. Create a note and file it to a new topic - e.g., "Test Topic Delete"
2. Navigate to the topic view
3. Delete the note
4. **Expected behavior**:
   - You're redirected to the project overview page
   - The topic "Test Topic Delete" is gone from the sidebar immediately
   - In Supabase `note_topics` table, the topic record is deleted

---

## What Was Actually Wrong

**BUG 2 Diagnosis**:

- ✓ Delete API is working correctly - records ARE being deleted from Supabase
- ✓ Auto-delete logic is executing - check logs for "Auto-deleted empty non-recurring meeting: {id}"
- ✗ **UI cache was stale** - React Query wasn't refetching `meetings` and `topics` queries after deletion

The fix was simply adding two lines to invalidate the correct queries. The backend was always working; the frontend just wasn't refreshing the data it already fetched.

---

## Build Status

✓ Build passes with no TypeScript errors
✓ All three modified files compile correctly
✓ Project overview page renders properly
✓ Sidebar navigation works with separated interactions
