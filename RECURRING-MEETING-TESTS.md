# Testing Recurring Meeting Features

This document outlines how to test the newly implemented recurring meeting UI features.

## Features Implemented

1. **Series Banner** - Displayed on all Meeting detail pages
2. **API endpoint** for updating meetings (`PATCH /api/meetings/[id]`)
3. **Sidebar indicator** - Repeat icon shown before recurring meeting names
4. **Integration with auto-delete logic** - Recurring meetings are preserved when empty

---

## Test Plan

### Test 1: Mark a Meeting as Recurring (Single Click)

**Goal**: Verify that marking a meeting as recurring requires no form or confirmation.

1. Navigate to a non-recurring meeting (view any meeting in your project)
2. You should see: **"One-off meeting so far"** banner with "+ Mark as recurring" action
3. Click **"+ Mark as recurring"**
4. The banner should immediately change to show:
   - Repeat icon (loop/cycle icon) in a teal circle
   - "RECURRING MEETING" label
   - Message: "No cadence or attendees noted — totally optional"
   - Actions: "+ Add cadence / attendees" and "Mark as not recurring"
5. Check the sidebar - the meeting should now have a repeat icon BEFORE its name
6. ✅ **Pass if**: The meeting becomes recurring with a single click, no form required

---

### Test 2: Add Optional Cadence and Attendees

**Goal**: Verify that cadence and attendees are truly optional enrichments.

1. From a recurring meeting (from Test 1), click **"+ Add cadence / attendees"**
2. You should see an inline form with two fields:
   - **Cadence (optional)**
   - **Attendees (optional)**
3. Fill in only one field (e.g., Cadence: "Every 2 weeks")
4. Click **Save**
5. The form should close and display your cadence with a clock icon
6. The "No cadence or attendees noted" message should be gone
7. ✅ **Pass if**: You can save with only one field filled, both fields are truly optional

---

### Test 3: Edit Details on a Recurring Meeting

**Goal**: Verify editing existing recurring meeting details.

1. From a recurring meeting with cadence/attendees set
2. Click **"Edit details"**
3. Change the values (e.g., add attendees: "Team leads, PM")
4. Click **Save**
5. The banner should update to show both cadence and attendees with icons
6. ✅ **Pass if**: Details update correctly and display with proper icons

---

### Test 4: Mark as Not Recurring (Preserves Data)

**Goal**: Verify that marking a meeting as not recurring preserves cadence/attendees.

1. From a recurring meeting with cadence and attendees set
2. Click **"Mark as not recurring"** (should be less prominent/muted styling)
3. The banner should change to: "One-off meeting so far"
4. Click **"+ Mark as recurring"** again
5. ✅ **Pass if**: The cadence and attendees reappear (they were preserved in the database)

---

### Test 5: Last Session Navigation

**Goal**: Verify the "Last session" button works correctly.

1. From a recurring meeting with at least one note
2. The banner should show: **"← Last session (date)"** button
3. Note the date shown (should be the most recent note's date)
4. Click the button
5. ✅ **Pass if**: You navigate to the detail view of that specific note

---

### Test 6: Auto-Delete Exemption for Recurring Meetings

**Goal**: Verify recurring meetings survive when all notes are deleted.

**Setup**:

1. Create a new meeting or use an existing one
2. Add a note to that meeting
3. Mark the meeting as **recurring**

**Test**:

1. Navigate to the meeting's detail page
2. Delete the only note in that meeting
3. Check the sidebar - the meeting should STILL be listed
4. Navigate to the meeting's detail page
5. ✅ **Pass if**:
   - The meeting still exists
   - Shows "No notes yet" empty state
   - Series banner is still visible with recurring info

---

### Test 7: Auto-Delete for Non-Recurring Meetings (Existing Behavior)

**Goal**: Verify non-recurring meetings are still auto-deleted when empty.

**Setup**:

1. Create a new meeting or use an existing one
2. Add a note to that meeting
3. Ensure the meeting is **NOT** marked recurring

**Test**:

1. Navigate to the meeting's detail page
2. Delete the only note in that meeting
3. Check the sidebar - the meeting should be GONE
4. ✅ **Pass if**: The meeting was automatically deleted (no longer in sidebar)

---

### Test 8: Visual Design Validation

**Goal**: Verify the banner states match the design specifications.

**Recurring with details**:

- Teal accent color border
- Repeat icon in teal circle
- "RECURRING MEETING" label in uppercase
- Cadence with clock icon
- Attendees with users icon
- "Edit details" and "Mark as not recurring" actions

**Recurring without details**:

- Same as above but shows: "No cadence or attendees noted — totally optional"
- Action reads: "+ Add cadence / attendees"

**Not recurring**:

- Neutral gray styling (not teal)
- Gray repeat icon
- "One-off meeting so far" message
- "+ Mark as recurring" action

**Sidebar**:

- Recurring meetings show repeat icon BEFORE the meeting name
- Icon is small (h-3 w-3) and teal colored

---

## Expected Visual States

### State 1: Not Recurring

```
┌─────────────────────────────────────────────┐
│  ○  One-off meeting so far                  │
│                         + Mark as recurring │
└─────────────────────────────────────────────┘
```

### State 2: Recurring, No Details Yet

```
┌─────────────────────────────────────────────┐
│  ⟳  RECURRING MEETING                       │
│                                             │
│  No cadence or attendees noted — totally    │
│  optional                                   │
│                                             │
│  ────────────────────────────────────────   │
│  + Add cadence / attendees                  │
│  Mark as not recurring                      │
└─────────────────────────────────────────────┘
```

### State 3: Recurring with Details

```
┌─────────────────────────────────────────────┐
│  ⟳  RECURRING MEETING                       │
│                                             │
│  🕐 Every 2 weeks  👥 Team leads, PM        │
│                                             │
│  ────────────────────────────────────────   │
│  ← Last session (Jan 15, 2026)              │
│                                             │
│  ────────────────────────────────────────   │
│  Edit details  Mark as not recurring        │
└─────────────────────────────────────────────┘
```

---

## Quick Verification Checklist

- [ ] Marking recurring is one click (no form required)
- [ ] Cadence and attendees are optional (can skip or fill partially)
- [ ] Marking as not recurring preserves the data
- [ ] Last session button navigates to the most recent note
- [ ] Recurring meetings are NOT deleted when empty
- [ ] Non-recurring meetings ARE deleted when empty
- [ ] Sidebar shows repeat icon before recurring meeting names
- [ ] Banner uses teal accent for recurring, neutral for non-recurring
- [ ] "Mark as not recurring" is styled more quietly than other actions

---

## Notes for Manual Testing

- You may want to use the browser's DevTools Network tab to verify API calls
- The PATCH endpoint is: `/api/meetings/[id]`
- The sidebar updates are immediate (React Query invalidates the cache)
- The auto-delete logic runs server-side in `/api/notes/[id]/route.ts` (DELETE handler)

---

## Common Issues to Watch For

1. **Sidebar icon placement**: Should be BEFORE the name, not after
2. **Data preservation**: "Mark as not recurring" should NOT clear cadence/attendees from database
3. **Single-click recurring**: Should not show a form when first marking as recurring
4. **Auto-delete exemption**: Recurring meetings must survive when empty
5. **Last session date**: Should match the most recent note's created_at timestamp
